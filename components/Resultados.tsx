'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface ResultadosData {
  periodo:         { start: string; end: string }
  disparados:      number
  responderam:     number
  pausados:        number
  agendados:       number
  totalAgendados:  number
  taxaResposta:    string
  taxaAgendamento: string
}

type Preset = 'hoje' | '7d' | '30d' | 'custom'

function todayBRL() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}
function daysAgoBRL(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}
function fmtDate(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Animated number hook */
function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const start = prev.current
    const diff  = target - start
    if (diff === 0) return
    const t0    = performance.now()
    const frame = (t: number) => {
      const p = Math.min((t - t0) / duration, 1)
      setValue(Math.round(start + diff * (1 - Math.pow(1 - p, 3)))) // ease-out cubic
      if (p < 1) requestAnimationFrame(frame)
      else prev.current = target
    }
    requestAnimationFrame(frame)
  }, [target, duration])
  return value
}

export default function Resultados() {
  const [preset, setPreset]         = useState<Preset>('hoje')
  const [customStart, setCustomStart] = useState(todayBRL())
  const [customEnd, setCustomEnd]   = useState(todayBRL())
  const [data, setData]             = useState<ResultadosData | null>(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')

  const getRange = useCallback(() => {
    if (preset === 'hoje') return { start: todayBRL(), end: todayBRL() }
    if (preset === '7d')   return { start: daysAgoBRL(6), end: todayBRL() }
    if (preset === '30d')  return { start: daysAgoBRL(29), end: todayBRL() }
    return { start: customStart, end: customEnd }
  }, [preset, customStart, customEnd])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    const { start, end } = getRange()
    try {
      const res = await fetch(`/api/resultados?start=${start}&end=${end}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (err) {
      setError(`Erro: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [getRange])

  useEffect(() => {
    if (preset !== 'custom' || (customStart && customEnd)) fetchData()
  }, [fetchData, preset])

  const presets: { id: Preset; label: string }[] = [
    { id: 'hoje', label: 'Hoje' },
    { id: '7d',   label: '7 dias' },
    { id: '30d',  label: '30 dias' },
    { id: 'custom', label: 'Personalizado' },
  ]

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 mb-8">
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface2)' }}>
          {presets.map(p => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className="px-4 py-2 text-sm font-medium transition-all cursor-pointer"
              style={{
                background: preset === p.id ? '#25D366' : 'transparent',
                color: preset === p.id ? '#000' : 'var(--text-2)',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} max={customEnd}
              onChange={e => setCustomStart(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm outline-none cursor-pointer"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
            <span style={{ color: 'var(--text-3)' }} className="text-sm">→</span>
            <input type="date" value={customEnd} min={customStart} max={todayBRL()}
              onChange={e => setCustomEnd(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm outline-none cursor-pointer"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
          </div>
        )}

        <button onClick={fetchData} disabled={loading}
          className="text-xs px-3 py-2 rounded-lg transition-all cursor-pointer hover:opacity-80 disabled:opacity-40"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          {loading ? <InlineSpin /> : '↻'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl p-4 mb-6 text-sm text-red-400" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
          {error}
        </div>
      )}

      {loading && !data && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}>
          <InlineSpin /> Carregando dados...
        </div>
      )}

      {data && (
        <div className="animate-fade-up">
          {/* Period */}
          <div className="flex items-center gap-2 mb-5">
            <p className="text-xs" style={{ color: 'var(--text-3)' }}>
              {fmtDate(data.periodo.start)}
              {data.periodo.start !== data.periodo.end && <> → {fmtDate(data.periodo.end)}</>}
            </p>
            {loading && <span className="text-xs text-[#25D366]">atualizando...</span>}
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard label="Disparados"   value={data.disparados}  sub={`${data.responderam > 0 ? data.taxaResposta + '% resp.' : '—'}`} color="#25D366" emoji="📤" />
            <MetricCard label="Responderam"  value={data.responderam} sub={`${data.taxaResposta}% de engajamento`} color="#3b82f6" emoji="💬" />
            <MetricCard label="Agendamentos" value={data.agendados}   sub={`${data.taxaAgendamento}% dos que responderam`} color="#a855f7" emoji="📅" />
            <MetricCard label="Finalizados pela IA" value={data.pausados} sub="conversas encerradas pela IA" color="#f59e0b" emoji="🤖" />
          </div>

          {/* Funnel */}
          <div className="gcard p-6 mb-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--text-3)' }}>
              Funil de Conversão
            </p>
            <div className="space-y-4">
              <FunnelBar label="Disparados"   value={data.disparados}  max={data.disparados} color="#25D366" />
              <FunnelBar label="Responderam"  value={data.responderam} max={data.disparados} color="#3b82f6"
                badge={`${data.taxaResposta}%`} />
              <FunnelBar label="Agendamentos" value={data.agendados}   max={data.disparados} color="#a855f7"
                badge={`${data.taxaAgendamento}% dos que resp.`} />
            </div>
          </div>

          {/* Total histórico */}
          <div className="gcard p-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Total histórico de agendamentos</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--text)' }}>
                {data.totalAgendados.toLocaleString('pt-BR')}
              </p>
            </div>
            <span className="text-4xl opacity-20">📊</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Sub-components ── */

function MetricCard({ label, value, sub, color, emoji }: {
  label: string; value: number; sub: string; color: string; emoji: string
}) {
  const displayed = useCountUp(value)
  return (
    <div className="gcard p-5 relative overflow-hidden">
      {/* Accent glow */}
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl"
        style={{ background: color, transform: 'translate(25%, -25%)' }} />
      <div className="text-2xl mb-3">{emoji}</div>
      <p className="text-3xl font-bold mb-1" style={{ color }}>{displayed.toLocaleString('pt-BR')}</p>
      <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--text)' }}>{label}</p>
      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{sub}</p>
    </div>
  )
}

function FunnelBar({ label, value, max, color, badge }: {
  label: string; value: number; max: number; color: string; badge?: string
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <span className="text-sm" style={{ color: 'var(--text-2)' }}>{label}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold" style={{ color: 'var(--text)' }}>{value.toLocaleString('pt-BR')}</span>
          {badge && <span className="text-xs" style={{ color: 'var(--text-3)' }}>{badge}</span>}
        </div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface2)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function InlineSpin() {
  return <span className="inline-block w-3.5 h-3.5 border-2 border-[#333] border-t-[#25D366] rounded-full animate-spin" />
}
