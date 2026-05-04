import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { Sandbox } from '@vercel/sandbox'
import { trace } from '@opentelemetry/api'

export const maxDuration = 60

// Route AI calls through Vercel AI Gateway (falls back to direct OpenAI if gateway not set)
const openai = process.env.AI_GATEWAY_API_KEY
  ? createOpenAI({
      apiKey: process.env.AI_GATEWAY_API_KEY,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    })
  : createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

const tracer = trace.getTracer('f1-simulator')

export async function POST(req: Request) {
  const { driver, team, track, laps, startPosition, startTire } = await req.json()

  return tracer.startActiveSpan('f1-race-simulation', async (span) => {
    try {
      span.setAttributes({
        'f1.driver': driver,
        'f1.track': track,
        'f1.start_position': startPosition,
        'f1.start_tire': startTire,
      })

      // ── Step 1: AI SDK generates the race simulation script ──────────────
      span.addEvent('generating-simulation-code')
      const { text: simulationCode } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `You are an F1 race engineer. Write a self-contained Node.js script that simulates a ${laps}-lap F1 race at ${track}.

Driver: ${driver} (${team})
Starting position: P${startPosition}
Starting tire: ${startTire}
Total laps: ${laps}

The script must:
1. Simulate realistic tire degradation (Soft degrades fastest, Hard slowest)
2. Calculate optimal 1 or 2 pit stop strategy based on starting tire
3. Model competitors and position changes
4. Output ONLY a single JSON object to console.log() with this exact shape:
{
  "pitStops": [{ "lap": number, "fromTire": string, "toTire": string, "positionAtStop": number }],
  "finalPosition": number,
  "positionsGained": number,
  "fastestLap": number,
  "totalRaceTime": string,
  "keyMoments": ["string", "string", "string"]
}

Use realistic F1 2025 data. No markdown, no explanation - ONLY the JSON.`,
      })

      // Clean up any markdown code fences if the model added them
      const cleanCode = simulationCode
        .replace(/```(?:javascript|js)?\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      // ── Step 2: Execute in Vercel Sandbox ────────────────────────────────
      span.addEvent('creating-sandbox')
      const sandbox = await Sandbox.create({
        runtime: 'node24',
        networkPolicy: 'deny-all',
        timeout: 30_000,
      })

      span.addEvent('executing-simulation')
      await sandbox.writeFiles([
        { path: 'simulate.js', content: Buffer.from(cleanCode) },
      ])

      const result = await sandbox.runCommand('node', ['simulate.js'])
      const rawOutput = await result.stdout()
      await sandbox.stop()

      span.setAttributes({ 'sandbox.exit_code': result.exitCode })

      let simResult: Record<string, unknown>
      try {
        simResult = JSON.parse(rawOutput.trim())
      } catch {
        // Fallback: extract JSON from output if there's extra text
        const jsonMatch = rawOutput.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          simResult = JSON.parse(jsonMatch[0])
        } else {
          throw new Error(`Sandbox output was not valid JSON: ${rawOutput}`)
        }
      }

      // ── Step 3: AI generates race narrative ──────────────────────────────
      span.addEvent('generating-narrative')
      const { text: narrative } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `You are an F1 commentator like Martin Brundle. Write a punchy 3-sentence race strategy briefing for ${driver} at ${track}.

Simulation result: ${JSON.stringify(simResult)}

Be specific: mention exact pit stop laps, tire compounds chosen, positions gained/lost.
Use vivid, energetic F1 broadcasting language. End with the predicted result.`,
      })

      span.setAttributes({ 'simulation.success': true })
      span.end()

      return Response.json({
        driver,
        team,
        track,
        startPosition,
        startTire,
        ...simResult,
        narrative,
      })
    } catch (error) {
      span.recordException(error as Error)
      span.end()
      console.error('Simulation error:', error)
      return Response.json(
        { error: 'Simulation failed. Please try again.' },
        { status: 500 }
      )
    }
  })
}
