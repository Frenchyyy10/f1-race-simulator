import { generateText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

const openai = process.env.AI_GATEWAY_API_KEY
  ? createOpenAI({
      apiKey: process.env.AI_GATEWAY_API_KEY,
      baseURL: 'https://ai-gateway.vercel.sh/v1',
    })
  : createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Durable workflow — runs in background, survives crashes and long waits
export async function analyzeChampionshipImpact(params: {
  driver: string
  team: string
  track: string
  finalPosition: number
  positionsGained: number
}) {
  'use workflow'

  const pointsAnalysis = await calculateChampionshipPoints(params)
  const rivalImpact = await analyzeRivalStrategies(params)

  return { pointsAnalysis, rivalImpact }
}

async function calculateChampionshipPoints(params: {
  driver: string
  finalPosition: number
  positionsGained: number
}) {
  'use step'

  const f1Points: Record<number, number> = {
    1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
    6: 8, 7: 6, 8: 4, 9: 2, 10: 1,
  }

  const pointsScored = f1Points[params.finalPosition] ?? 0

  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `F1 2025 championship context: ${params.driver} finished P${params.finalPosition} (+${params.positionsGained} positions gained), scoring ${pointsScored} points.

Write 2 sentences on what this means for their championship battle. Be specific about standings impact.`,
  })

  return { pointsScored, analysis: text }
}

async function analyzeRivalStrategies(params: {
  driver: string
  team: string
  track: string
  finalPosition: number
}) {
  'use step'

  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    prompt: `F1 2025 strategy insight: ${params.driver} (${params.team}) used this strategy at ${params.track} to finish P${params.finalPosition}.

Name 2 rival teams and explain in 2 sentences how they might counter-strategize at the next race.`,
  })

  return { rivalAnalysis: text }
}
