'use client'

import { useState, useEffect, useCallback } from 'react'

interface ResultadosData {
  periodo:        { start: string; end: string }
  disparados:     number
  responderam:    number
  pausados:       number
  agendados:      number
  totalAgendados: number
  taxaResposta:   string
  taxaAgendamento: string
}

type Preset = 'hoje' | '7d' | '30d' | 'custom'

function todayBRL(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

function daysAgoBRL(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

export default function Resultados() {
  const [preset, setPreset]         = useState<Preset>('hoje')
  const [customStart, setCustomStart] = useState(todayBRL())
  const [customEnd, setCustomEnd]   = useState(todayBRL())
  const [data, setData]             = useState<ResultadosData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const getRange = useCallback((): { start: string; end: string } => {
    if (preset === 'hoje')   return { start: todayBRL(),       end: todayBRL() }
    if (preset === '7d')     return { start: daysAgoBRL(6),    end: todayBRL() }
    if (preset === '30d')    return { start: daysAgoBRL(29),   end: todayBRL() }
    return { start: customStart, end: customEnd }
  }, [preset, customStart, customEnd])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    const { start, end } = getRange()
    try {
      const res = await fetch(`/api/resultados?start=${start}&end=${end}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json: ResultadosData = await res.json()
      setData(json)
    } catch (err) {
      setError(`Erro ao carregar resultados: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [getRange])

  // auto-fetch whenever preset / custom dates change
  useEffect(() => {
    if (preset !== 'custom' || (customStart && customEnd)) {
      fetchData()
    }
  }, [fetchData, preset, customStart, customEnd])

  const presetBtns: { id: Preset; label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: '7d',   label: '7 dias' },
    { id: '30d',  label: '30 dias' },
    { id: 'custom', label: 'Personalizado' },
  ]

  return (
    <div>
      {/* ── Date filter bar ── */}
      <div className="flex flex-wrap items-end gap-3 mb-8">
        <div className="flex gap-1 bg-[#1a1a1a] border border-[#252525] rounded-xl p-1">
          {presetBtns.map(btn => (
            <button
              key={btn.id}
              onClick={() => setPreset(btn.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                preset === btn.id
                  ? 'bg-[#25D366] text-black'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customStart}
              max={customEnd}
              onChange={e => setCustomStart(e.target.value)}
              className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#25D366] transition-colors cursor-pointer"
            />
            <span className="text-gray-600 text-sm">até</span>
            <input
              type="date"
              value={customEnd}
              min={customStart}
              max={todayBRL()}
              onChange={e => setCustomEnd(e.target.value)}
              className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-[#25D366] transition-colors cursor-pointer"
            />
          </div>
        )}

        <button
          onClick={fetchData}
          disabled={loading}
          className="text-xs text-gray-600 border border-[#252525] hover:border-[#3a3a3a] hover:text-gray-400 disabled:opacity-40 rounded-md px-2.5 py-2 transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {loading ? <SpinnerSm /> : '↻ Atualizar'}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="text-red-400 text-sm bg-[#1f0d0d] border border-[#4d1a1a] rounded-xl p-4 mb-6">
          {error}
        </div>
      )}

      {/* ── Metric cards ── */}
      {loading && !data && (
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <SpinnerSm /> Carregando dados...
        </div>
      )}

      {data && (
        <>
          {/* Period label */}
          <p className="text-xs text-gray-600 mb-4">
            Período: <span className="text-gray-500">{formatDate(data.periodo.start)}</span>
            {data.periodo.start !== data.periodo.end && (
              <> → <span className="text-gray-500">{formatDate(data.periodo.end)}</span></>
            )}
            {loading && <span className="ml-2 text-[#25D366]">atualizando...</span>}
          </p>

          {/* 4 main cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              label="Disparados"
              value={data.disparados}
              sublabel="contatos alcançados"
              color="green"
              icon="📤"
            />
            <MetricCard
              label="Responderam"
              value={data.responderam}
              sublabel={`${data.taxaResposta}% dos disparados`}
              color="blue"
              icon="💬"
            />
            <MetricCard
              label="Agendamentos"
              value={data.agendados}
              sublabel={`${data.taxaAgendamento}% dos que responderam`}
              color="purple"
              icon="📅"
            />
            <MetricCard
              label="Pausados (IA)"
              value={data.pausados}
              sublabel="aguardando retomada"
              color="yellow"
              icon="⏸"
            />
          </div>

          {/* Conversion funnel */}
          <div className="bg-[#141414] border border-[#222] rounded-2xl p-6 mb-6">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
              Funil de Conversão
            </h3>
            <div className="space-y-3">
              <FunnelBar
                label="Disparados"
                value={data.disparados}
                max={data.disparados}
                color="#25D366"
              />
              <FunnelBar
                label="Responderam"
                value={data.responderam}
                max={data.disparados}
                color="#3b82f6"
                pct={data.taxaResposta}
              />
              <FunnelBar
                label="Agendamentos"
                value={data.agendados}
                max={data.disparados}
                color="#a855f7"
                pct={data.taxaAgendamento + '% dos que responderam'}
              />
            </div>
          </div>

          {/* Total historic */}
          <div className="bg-[#141414] border border-[#222] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Total de Agendamentos (histórico)</p>
              <p className="text-2xl font-bold text-white">{data.totalAgendados.toLocaleString('pt-BR')}</p>
            </div>
            <span className="text-3xl opacity-30">📊</span>
          </div>
        </>
      )}
    </div>
  )
}

/* ── Sub-components ── */

function MetricCard({
  label, value, sublabel, color, icon,
}: {
  label: string; value: number; sublabel: string
  color: 'green' | 'blue' | 'purple' | 'yellow'; icon: string
}) {
  const colors = {
    green:  { bg: 'bg-[#0a1a0f]', border: 'border-[#1a3d25]', text: 'text-[#25D366]' },
    blue:   { bg: 'bg-[#0a0f1f]', border: 'border-[#1a2550]', text: 'text-blue-400' },
    purple: { bg: 'bg-[#120a1f]', border: 'border-[#2d1550]', text: 'text-purple-400' },
    yellow: { bg: 'bg-[#1a140a]', border: 'border-[#3d2d10]', text: 'text-yellow-400' },
  }[color]

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-2xl p-5`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${colors.text} mb-1`}>
        {value.toLocaleString('pt-BR')}
      </p>
      <p className="text-xs font-semibold text-gray-400 mb-0.5">{label}</p>
      <p className="text-xs text-gray-600">{sublabel}</p>
    </div>
  )
}

function FunnelBar({
  label, value, max, color, pct,
}: {
  label: string; value: number; max: number
  color: string; pct?: string
}) {
  const pctNum = max > 0 ? (value / max) * 100 : 0

  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <span className="text-sm text-gray-400">{label}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-white">{value.toLocaleString('pt-BR')}</span>
          {pct && <span className="text-xs text-gray-600">{pct}</span>}
        </div>
      </div>
      <div className="h-2 bg-[#222] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(pctNum, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function SpinnerSm() {
  return (
    <span className="inline-block w-3.5 h-3.5 border-2 border-[#333] border-t-[#25D366] rounded-full animate-spin" />
  )
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
