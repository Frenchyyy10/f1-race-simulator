import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { Sandbox } from '@vercel/sandbox'
import { trace } from '@opentelemetry/api'

export const maxDuration = 60

const openai = process.env.AI_GATEWAY_API_KEY
  ? createOpenAI({ apiKey: process.env.AI_GATEWAY_API_KEY, baseURL: 'https://ai-gateway.vercel.sh/v1' })
  : createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

const tracer = trace.getTracer('f1-simulator')

export async function POST(req: Request) {
  const { driver, team, track, laps, startPosition, startTire } = await req.json()
  return tracer.startActiveSpan('f1-race-simulation', async (span) => {
    try {
      span.setAttributes({ 'f1.driver': driver, 'f1.track': track, 'f1.start_position': startPosition, 'f1.start_tire': startTire })
      span.addEvent('generating-simulation-code')
      const { text: simulationCode } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `Write a self-contained Node.js script simulating a ${laps}-lap F1 race at ${track} for ${driver} (${team}), starting P${startPosition} on ${startTire} tyres. Use process.stdout.write() once at the end with ONLY this JSON (no console.log, no other output): {"pitStops":[{"lap":25,"fromTire":"Soft","toTire":"Medium","positionAtStop":3}],"finalPosition":2,"positionsGained":1,"fastestLap":45,"totalRaceTime":"1:42:33","keyMoments":["moment1","moment2","moment3"]} — use realistic values. Output ONLY the Node.js code, no markdown.`,
      })
      const cleanCode = simulationCode.replace(/\`\`\`(?:javascript|js)?\n?/gi, '').replace(/\`\`\`\n?/g, '').trim()
      span.addEvent('creating-sandbox')
      const sandbox = await Sandbox.create({ runtime: 'node24', networkPolicy: 'deny-all', timeout: 30_000 })
      span.addEvent('executing-simulation')
      await sandbox.writeFiles([{ path: 'simulate.js', content: Buffer.from(cleanCode) }])
      const result = await sandbox.runCommand('node', ['simulate.js'])
      const rawOutput = await result.stdout()
      await sandbox.stop()
      span.setAttributes({ 'sandbox.exit_code': result.exitCode })
      let simResult: Record<string, unknown>
      const trimmed = rawOutput.trim()
      const firstBrace = trimmed.indexOf('{')
      const lastBrace = trimmed.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try { simResult = JSON.parse(trimmed.slice(firstBrace, lastBrace + 1)) }
        catch { simResult = fallback(startPosition, startTire, laps) }
      } else { simResult = fallback(startPosition, startTire, laps) }
      span.addEvent('generating-narrative')
      const { text: narrative } = await generateText({
        model: openai('gpt-4o-mini'),
        prompt: `You are Martin Brundle. Write 3 punchy sentences about ${driver}'s race strategy at ${track} based on: ${JSON.stringify(simResult)}. Be specific about pit stops, tyres, positions. End with the result.`,
      })
      span.setAttributes({ 'simulation.success': true })
      span.end()
      return Response.json({ driver, team, track, startPosition, startTire, ...simResult, narrative })
    } catch (error) {
      span.recordException(error as Error)
      span.end()
      console.error('Simulation error:', error)
      return Response.json({ error: 'Simulation failed. Please try again.' }, { status: 500 })
    }
  })
}

function fallback(startPosition: number, startTire: string, laps: number): Record<string, unknown> {
  const p1 = Math.floor(laps * 0.35), p2 = Math.floor(laps * 0.68)
  const finalPos = Math.max(1, startPosition - 2 + Math.floor(Math.random() * 4))
  const t2 = startTire === 'Soft' ? 'Medium' : 'Hard'
  return { pitStops: [{ lap: p1, fromTire: startTire, toTire: t2, positionAtStop: startPosition + 1 }, { lap: p2, fromTire: t2, toTire: 'Medium', positionAtStop: finalPos + 1 }], finalPosition: finalPos, positionsGained: startPosition - finalPos, fastestLap: Math.floor(laps * 0.7), totalRaceTime: '1:42:18', keyMoments: [`Started P${startPosition} on ${startTire} tyres`, `Pitted lap ${p1} onto ${t2}s`, `Finished P${finalPos}`] }
}
