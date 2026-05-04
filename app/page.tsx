'use client'

import { useState } from 'react'

const DRIVERS = [
  { name: 'Max Verstappen', team: 'Red Bull Racing' },
  { name: 'Lando Norris', team: 'McLaren' },
  { name: 'Charles Leclerc', team: 'Ferrari' },
  { name: 'Carlos Sainz', team: 'Williams' },
  { name: 'Lewis Hamilton', team: 'Ferrari' },
  { name: 'George Russell', team: 'Mercedes' },
  { name: 'Oscar Piastri', team: 'McLaren' },
  { name: 'Fernando Alonso', team: 'Aston Martin' },
  { name: 'Lance Stroll', team: 'Aston Martin' },
  { name: 'Kimi Antonelli', team: 'Mercedes' },
  { name: 'Pierre Gasly', team: 'Alpine' },
  { name: 'Esteban Ocon', team: 'Haas' },
  { name: 'Nico Hulkenberg', team: 'Sauber' },
  { name: 'Yuki Tsunoda', team: 'Red Bull Racing' },
  { name: 'Liam Lawson', team: 'RB' },
  { name: 'Alex Albon', team: 'Williams' },
  { name: 'Oliver Bearman', team: 'Haas' },
  { name: 'Jack Doohan', team: 'Alpine' },
  { name: 'Gabriel Bortoleto', team: 'Sauber' },
  { name: 'Isack Hadjar', team: 'RB' },
]

const TRACKS = [
  { name: 'Monaco Grand Prix', laps: 78 },
  { name: 'British Grand Prix (Silverstone)', laps: 52 },
  { name: 'Italian Grand Prix (Monza)', laps: 53 },
  { name: 'Spanish Grand Prix (Barcelona)', laps: 66 },
  { name: 'Belgian Grand Prix (Spa)', laps: 44 },
  { name: 'Singapore Grand Prix', laps: 62 },
  { name: 'Japanese Grand Prix (Suzuka)', laps: 53 },
  { name: 'Abu Dhabi Grand Prix (Yas Marina)', laps: 58 },
  { name: 'Miami Grand Prix', laps: 57 },
  { name: 'Las Vegas Grand Prix', laps: 50 },
]

const TIRES = ['Soft', 'Medium', 'Hard']

const TEAM_COLORS: Record<string, string> = {
  'Red Bull Racing': '#3671C6',
  'McLaren': '#FF8000',
  'Ferrari': '#E8002D',
  'Mercedes': '#27F4D2',
  'Aston Martin': '#229971',
  'Alpine': '#FF87BC',
  'Williams': '#64C4FF',
  'RB': '#6692FF',
  'Haas': '#B6BABD',
  'Sauber': '#52E252',
}

interface SimResult {
  driver: string
  team: string
  track: string
  startPosition: number
  startTire: string
  pitStops: { lap: number; fromTire: string; toTire: string; positionAtStop: number }[]
  finalPosition: number
  positionsGained: number
  fastestLap: number
  totalRaceTime: string
  keyMoments: string[]
  narrative: string
}

interface ChampionshipResult {
  pointsAnalysis: { pointsScored: number; analysis: string }
  rivalImpact: { rivalAnalysis: string }
}

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export default function Home() {
  const [selectedDriver, setSelectedDriver] = useState(DRIVERS[0])
  const [selectedTrack, setSelectedTrack] = useState(TRACKS[0])
  const [startPosition, setStartPosition] = useState(1)
  const [startTire, setStartTire] = useState('Soft')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SimResult | null>(null)
  const [championship, setChampionship] = useState<ChampionshipResult | null>(null)
  const [champLoading, setChampLoading] = useState(false)
  const [error, setError] = useState('')

  const simulate = async () => {
    setLoading(true)
    setResult(null)
    setChampionship(null)
    setError('')

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver: selectedDriver.name,
          team: selectedDriver.team,
          track: selectedTrack.name,
          laps: selectedTrack.laps,
          startPosition,
          startTire,
        }),
      })

      if (!res.ok) throw new Error('Simulation failed')
      const data = await res.json()
      setResult(data)

      // Trigger the Vercel Workflow in the background
      setChampLoading(true)
      fetch('/api/championship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver: selectedDriver.name,
          team: selectedDriver.team,
          track: selectedTrack.name,
          finalPosition: data.finalPosition,
          positionsGained: data.positionsGained,
        }),
      })
        .then((r) => r.json())
        .then((champData) => {
          setChampionship(champData)
          setChampLoading(false)
        })
        .catch(() => setChampLoading(false))
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const teamColor = TEAM_COLORS[selectedDriver.team] || '#ffffff'

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="border-b border-[#e10600]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-[#e10600]" />
            <div>
              <h1 className="text-xl font-bold tracking-tight">F1 RACE STRATEGY SIMULATOR</h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest">Powered by Vercel AI + Sandbox</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#e10600] pulse-red" />
            <span className="text-xs text-gray-400">2025 Season</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Config Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Driver Selection */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Driver</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {DRIVERS.map((d) => (
                <button
                  key={d.name}
                  onClick={() => setSelectedDriver(d)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center justify-between transition-all ${
                    selectedDriver.name === d.name
                      ? 'bg-[#1a1a1a] border border-[#e10600]'
                      : 'hover:bg-[#1a1a1a] border border-transparent'
                  }`}
                >
                  <span className="font-medium text-sm">{d.name}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded font-bold"
                    style={{ color: TEAM_COLORS[d.team] || '#fff', border: `1px solid ${TEAM_COLORS[d.team] || '#fff'}22` }}
                  >
                    {d.team}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Race Setup */}
          <div className="space-y-4">
            {/* Track */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-3">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Select Track</h2>
              <select
                value={selectedTrack.name}
                onChange={(e) => setSelectedTrack(TRACKS.find((t) => t.name === e.target.value)!)}
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-2.5 text-sm focus:border-[#e10600] focus:outline-none"
              >
                {TRACKS.map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} ({t.laps} laps)
                  </option>
                ))}
              </select>
            </div>

            {/* Starting Position */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-3">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Grid Position: <span className="text-white">P{startPosition}</span>
              </h2>
              <input
                type="range"
                min={1}
                max={20}
                value={startPosition}
                onChange={(e) => setStartPosition(Number(e.target.value))}
                className="w-full accent-[#e10600]"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>P1 (Pole)</span>
                <span>P20 (Back)</span>
              </div>
            </div>

            {/* Tire Compound */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-6 space-y-3">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Starting Compound</h2>
              <div className="flex gap-3">
                {TIRES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setStartTire(t)}
                    className={`flex-1 py-2.5 rounded-lg font-bold text-sm transition-all ${
                      startTire === t
                        ? t === 'Soft'
                          ? 'bg-red-600 text-white'
                          : t === 'Medium'
                          ? 'bg-yellow-400 text-black'
                          : 'bg-gray-200 text-black'
                        : 'bg-[#1a1a1a] text-gray-400 border border-[#333]'
                    }`}
                  >
                    {t[0]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 text-center">
                {startTire === 'Soft' ? 'Fast but wears quickly' : startTire === 'Medium' ? 'Balanced performance' : 'Durable, slower pace'}
              </p>
            </div>
          </div>
        </div>

        {/* Driver Card Preview */}
        <div
          className="rounded-xl p-5 flex items-center justify-between"
          style={{ background: `linear-gradient(135deg, #111 0%, ${teamColor}22 100%)`, borderLeft: `3px solid ${teamColor}` }}
        >
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">{selectedDriver.team}</p>
            <p className="text-2xl font-bold">{selectedDriver.name}</p>
            <p className="text-sm text-gray-400 mt-1">
              Starting {ordinal(startPosition)} on {startTire} tyres at {selectedTrack.name.split(' (')[0]}
            </p>
          </div>
          <button
            onClick={simulate}
            disabled={loading}
            className="px-8 py-3 bg-[#e10600] hover:bg-[#ff0800] disabled:bg-[#440200] rounded-xl font-bold text-sm uppercase tracking-widest transition-all"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Simulating...
              </span>
            ) : (
              'Simulate Race →'
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6 slide-up">
            {/* Headline Result */}
            <div
              className="rounded-xl p-6"
              style={{ background: `linear-gradient(135deg, #111 0%, ${TEAM_COLORS[result.team] || '#333'}33 100%)` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest">Predicted Result</p>
                  <h2 className="text-5xl font-black mt-1">
                    {ordinal(result.finalPosition)}
                  </h2>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${result.positionsGained > 0 ? 'text-green-400' : result.positionsGained < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {result.positionsGained > 0 ? `+${result.positionsGained}` : result.positionsGained} positions
                  </div>
                  <p className="text-sm text-gray-400 mt-1">Race time: {result.totalRaceTime}</p>
                  <p className="text-sm text-gray-400">Fastest lap: Lap {result.fastestLap}</p>
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-[#e10600] pl-4">
                "{result.narrative}"
              </p>
            </div>

            {/* Pit Stop Strategy */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Pit Stop Strategy</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className={`px-3 py-1 rounded font-bold text-xs ${
                      result.startTire === 'Soft' ? 'bg-red-600' : result.startTire === 'Medium' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-black'
                    }`}
                  >
                    {result.startTire?.toUpperCase()}
                  </span>
                  <span className="text-gray-500">Lap 1 – Start</span>
                </div>
                {result.pitStops.map((stop, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className="w-px h-6 bg-[#333] ml-3" />
                    <div className="flex items-center gap-2 flex-1">
                      <span className="text-gray-500 w-16">Lap {stop.lap}</span>
                      <span
                        className={`px-3 py-1 rounded font-bold text-xs ${
                          stop.fromTire === 'Soft' ? 'bg-red-600' : stop.fromTire === 'Medium' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-black'
                        }`}
                      >
                        {stop.fromTire?.toUpperCase()}
                      </span>
                      <span className="text-gray-600">→</span>
                      <span
                        className={`px-3 py-1 rounded font-bold text-xs ${
                          stop.toTire === 'Soft' ? 'bg-red-600' : stop.toTire === 'Medium' ? 'bg-yellow-400 text-black' : 'bg-gray-200 text-black'
                        }`}
                      >
                        {stop.toTire?.toUpperCase()}
                      </span>
                      <span className="text-gray-500 ml-auto">P{stop.positionAtStop} at box</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Race Moments */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-6">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Key Race Moments</h3>
              <div className="space-y-2">
                {result.keyMoments.map((moment, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-[#e10600] flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold">
                      {i + 1}
                    </div>
                    <p className="text-gray-300">{moment}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Championship Impact (Vercel Workflow) */}
            <div className="bg-[#111] border border-[#222] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Championship Impact</h3>
                <span className="text-xs bg-[#1a1a1a] border border-[#333] px-2 py-1 rounded text-gray-500">
                  Vercel Workflow ⚡
                </span>
              </div>

              {champLoading && (
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <svg className="animate-spin h-4 w-4 text-[#e10600]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Running durable championship analysis workflow...
                </div>
              )}

              {championship && (
                <div className="space-y-4 slide-up">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl font-black text-[#e10600]">
                      +{championship.pointsAnalysis.pointsScored}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Championship Points</p>
                      <p className="text-sm text-gray-300">{championship.pointsAnalysis.analysis}</p>
                    </div>
                  </div>
                  <div className="border-t border-[#222] pt-4">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Rival Response</p>
                    <p className="text-sm text-gray-300">{championship.rivalImpact.rivalAnalysis}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Vercel Primitives Used */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
              <p className="text-xs text-gray-600 uppercase tracking-widest mb-3">Vercel Primitives Used in This Simulation</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'AI SDK', desc: 'Strategy generation' },
                  { label: 'AI Gateway', desc: 'Unified model routing' },
                  { label: 'Sandbox', desc: 'Isolated code execution' },
                  { label: 'Workflows', desc: 'Durable championship analysis' },
                  { label: 'Observability', desc: 'Full trace captured' },
                ].map((p) => (
                  <div key={p.label} className="flex items-center gap-1.5 bg-[#1a1a1a] px-3 py-1.5 rounded-lg">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#e10600]" />
                    <span className="text-xs font-medium text-gray-300">{p.label}</span>
                    <span className="text-xs text-gray-600">· {p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
