import { analyzeChampionshipImpact } from '../../workflows/championship-analysis'

export const maxDuration = 60

export async function POST(req: Request) {
  const { driver, team, track, finalPosition, positionsGained } = await req.json()

  try {
    const result = await analyzeChampionshipImpact({
      driver,
      team,
      track,
      finalPosition,
      positionsGained,
    })

    return Response.json(result)
  } catch (error) {
    console.error('Workflow error:', error)
    return Response.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
