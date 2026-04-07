'use client'

import { useState, useEffect, useRef } from 'react'

interface Attendee {
  email: string
  name: string | null
  self: boolean
}

interface CalendarEvent {
  id: string
  title: string
  start: string
  end: string
  description: string | null
  attendees: Attendee[]
  location: string | null
  link: string | null
  calendarName: string | null
  calendarColor: string | null
  calendarId: string | null
  organizerEmail: string | null
}

const OWNERS = [
  { email: 'felipemarketingperformance@gmail.com', label: 'Felipe' },
  { email: '01.nexoaceleradora@gmail.com',         label: '01.nexo' },
  { email: 'danielvolpi83@gmail.com',              label: 'Daniel' },
]

function fmtTime(iso: string) {
  if (!iso) return ''
  if (!iso.includes('T')) return 'dia todo'
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function todayBRL() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
}

function fmtDateLabel(iso: string) {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function ownerOf(event: CalendarEvent): string | null {
  const calId     = (event.calendarId    ?? '').toLowerCase()
  const calName   = (event.calendarName  ?? '').toLowerCase()
  const organizer = (event.organizerEmail ?? '').toLowerCase()

  const byCalId = OWNERS.find(o => calId === o.email.toLowerCase() || calId.includes(o.email.toLowerCase()))
  if (byCalId) return byCalId.email

  const byOrganizer = OWNERS.find(o => organizer === o.email.toLowerCase())
  if (byOrganizer) return byOrganizer.email

  const byAttendee = OWNERS.find(o =>
    event.attendees.some(a => a.email.toLowerCase() === o.email.toLowerCase())
  )
  if (byAttendee) return byAttendee.email

  const byName = OWNERS.find(o =>
    calName.includes(o.label.toLowerCase()) ||
    calName.includes(o.email.split('@')[0].toLowerCase())
  )
  return byName?.email ?? null
}

function ownerLabel(event: CalendarEvent): string | null {
  const email = ownerOf(event)
  return OWNERS.find(o => o.email === email)?.label ?? null
}

export default function AgendaCalendar() {
  const [date, setDate]           = useState(todayBRL())
  const [events, setEvents]       = useState<CalendarEvent[]>([])
  const [connected, setConn]      = useState<boolean | null>(null)
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState<CalendarEvent | null>(null)
  const [filter, setFilter]       = useState<string>('all')
  const [hiddenTitles, setHidden] = useState<Set<string>>(new Set())
  const [showHidePanel, setShowHidePanel] = useState(false)

  async function fetchEvents(d: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/calendar?date=${d}`)
      const data = await res.json()
      setConn(data.connected)
      setEvents(data.events ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvents(date) }, [date])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      window.history.replaceState({}, '', window.location.pathname)
      fetchEvents(date)
    }
  }, [])

  if (connected === false) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-5xl">📅</div>
        <p className="font-semibold" style={{ color: 'var(--text)' }}>Google Calendar não conectado</p>
        <p className="text-sm text-center max-w-xs" style={{ color: 'var(--text-3)' }}>
          Conecte sua conta Google para visualizar os eventos da agenda do dia.
        </p>
        <a href="/api/auth/google"
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-80"
          style={{ background: '#4285F4', color: '#fff' }}>
          Conectar Google Calendar
        </a>
      </div>
    )
  }

  // Títulos únicos para o painel de ocultar
  const uniqueTitles = Array.from(new Set(events.map(e => e.title))).sort()

  function toggleHide(title: string) {
    setHidden(prev => {
      const next = new Set(prev)
      next.has(title) ? next.delete(title) : next.add(title)
      return next
    })
  }

  // Contagem por owner (antes de ocultar títulos)
  const countByOwner = OWNERS.reduce<Record<string, number>>((acc, o) => {
    acc[o.email] = events.filter(e => ownerOf(e) === o.email && !hiddenTitles.has(e.title)).length
    return acc
  }, {})
  const countOther = events.filter(e => ownerOf(e) === null && !hiddenTitles.has(e.title)).length

  const filtered = events
    .filter(e => !hiddenTitles.has(e.title))
    .filter(e =>
      filter === 'all'   ? true :
      filter === 'other' ? ownerOf(e) === null :
      ownerOf(e) === filter
    )

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm outline-none cursor-pointer"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <button onClick={() => fetchEvents(date)} disabled={loading}
            className="text-xs px-3 py-2 rounded-lg transition-all cursor-pointer hover:opacity-80 disabled:opacity-40"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            {loading ? <InlineSpin /> : '↻'}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowHidePanel(v => !v)}
            className="text-xs px-3 py-2 rounded-lg transition-all cursor-pointer hover:opacity-80 flex items-center gap-1.5"
            style={{ background: showHidePanel ? 'rgba(239,68,68,.1)' : 'var(--surface2)', border: `1px solid ${showHidePanel ? 'rgba(239,68,68,.3)' : 'var(--border)'}`, color: showHidePanel ? '#ef4444' : 'var(--text-2)' }}>
            {showHidePanel ? '✕ Fechar' : '⚙ Ocultar eventos'}
            {hiddenTitles.size > 0 && <span className="rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold" style={{ background: '#ef4444', color: '#fff' }}>{hiddenTitles.size}</span>}
          </button>
          <a href="/api/auth/google" className="text-xs hover:opacity-70 transition-all" style={{ color: 'var(--text-3)' }}>
            Reconectar ↗
          </a>
        </div>
      </div>

      {/* Painel de ocultar títulos */}
      {showHidePanel && (
        <div className="rounded-xl p-4 mb-5" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>Selecione os eventos para ocultar</p>
          <div className="flex flex-wrap gap-2">
            {uniqueTitles.map(title => {
              const hidden = hiddenTitles.has(title)
              return (
                <button key={title} onClick={() => toggleHide(title)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer"
                  style={{
                    background: hidden ? 'rgba(239,68,68,.12)' : 'var(--surface)',
                    color: hidden ? '#ef4444' : 'var(--text-2)',
                    border: `1px solid ${hidden ? 'rgba(239,68,68,.3)' : 'var(--border)'}`,
                    textDecoration: hidden ? 'line-through' : 'none',
                  }}>
                  {hidden ? '✕' : '●'} {title}
                </button>
              )
            })}
          </div>
          {hiddenTitles.size > 0 && (
            <button onClick={() => setHidden(new Set())} className="mt-3 text-xs hover:opacity-70 transition-all" style={{ color: 'var(--text-3)' }}>
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Filtros por pessoa */}
      <div className="flex flex-wrap gap-2 mb-5">
        <FilterBtn label="Todos" count={filtered.length} active={filter === 'all'} onClick={() => setFilter('all')} color="#4285F4" />
        {OWNERS.map(o => (
          <FilterBtn key={o.email} label={o.label} count={countByOwner[o.email] ?? 0} active={filter === o.email} onClick={() => setFilter(o.email)} color="#25D366" />
        ))}
        {countOther > 0 && (
          <FilterBtn label="Outros" count={countOther} active={filter === 'other'} onClick={() => setFilter('other')} color="#f59e0b" />
        )}
      </div>

      {/* Sem eventos */}
      {!loading && filtered.length === 0 && (
        <div className="gcard p-10 flex flex-col items-center gap-3">
          <span className="text-4xl opacity-30">📭</span>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhum evento em {fmtDateLabel(date)}</p>
        </div>
      )}

      {/* Lista de eventos */}
      <div className="space-y-3">
        {filtered.map(event => (
          <button key={event.id} onClick={() => setSelected(event)}
            className="w-full gcard p-4 flex items-start gap-4 text-left hover:opacity-80 transition-all cursor-pointer">
            <div className="flex-shrink-0 text-right min-w-[52px]">
              <p className="text-sm font-bold" style={{ color: event.calendarColor ?? '#4285F4' }}>{fmtTime(event.start)}</p>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>{fmtTime(event.end)}</p>
            </div>

            <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: event.calendarColor ?? '#4285F4', opacity: 0.8 }} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{event.title}</p>
              {event.attendees.length > 0 && (
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>
                  {event.attendees.filter(a => !a.self).map(a => a.name ?? a.email).join(', ') || 'Sem participantes'}
                </p>
              )}
              {event.location && (
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-3)' }}>📍 {event.location}</p>
              )}
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {event.calendarName && (
                  <p className="text-xs truncate" style={{ color: event.calendarColor ?? '#4285F4' }}>● {event.calendarName}</p>
                )}
                {ownerLabel(event) && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(37,211,102,.15)', color: '#25D366' }}>
                    {ownerLabel(event)}
                  </span>
                )}
              </div>
            </div>

            {event.link && (
              <a href={event.link} target="_blank" rel="noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex-shrink-0 text-xs px-2.5 py-1.5 rounded-lg font-medium hover:opacity-80 transition-all"
                style={{ background: 'rgba(66,133,244,.15)', color: '#4285F4' }}>
                Meet ↗
              </a>
            )}
          </button>
        ))}
      </div>

      {/* Modal — header fixo, scroll apenas no body */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl flex flex-col"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '80vh' }}
            onClick={e => e.stopPropagation()}>

            {/* Header fixo */}
            <div className="flex items-start justify-between p-5 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex-1 min-w-0 pr-3">
                <p className="font-bold text-base" style={{ color: 'var(--text)' }}>{selected.title}</p>
                <p className="text-sm mt-0.5" style={{ color: selected.calendarColor ?? '#4285F4' }}>
                  {fmtTime(selected.start)} → {fmtTime(selected.end)}
                </p>
                {selected.calendarName && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>● {selected.calendarName}</p>
                )}
              </div>
              <button onClick={() => setSelected(null)}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm cursor-pointer hover:opacity-60 transition-all"
                style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>✕</button>
            </div>

            {/* Body com scroll */}
            <div className="overflow-y-auto p-5 space-y-3">
              {selected.link && (
                <a href={selected.link} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition-all"
                  style={{ background: '#4285F4', color: '#fff' }}>
                  Entrar na reunião ↗
                </a>
              )}

              {selected.attendees.length > 0 && (
                <div className="rounded-xl p-4" style={{ background: 'var(--surface2)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Participantes</p>
                  <div className="space-y-1.5">
                    {selected.attendees.map((a, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: 'rgba(66,133,244,.15)', color: '#4285F4' }}>
                          {(a.name ?? a.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {a.name && <p className="text-sm font-medium truncate" style={{ color: 'var(--text)' }}>{a.name} {a.self ? '(você)' : ''}</p>}
                          <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{a.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.location && (
                <div className="rounded-xl p-3 flex items-center gap-2" style={{ background: 'var(--surface2)' }}>
                  <span>📍</span>
                  <p className="text-sm" style={{ color: 'var(--text)' }}>{selected.location}</p>
                </div>
              )}

              {selected.description && (
                <div className="rounded-xl p-4" style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Descrição</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text)' }}>{selected.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterBtn({ label, count, active, onClick, color }: { label: string; count: number; active: boolean; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer"
      style={{
        background: active ? `${color}22` : 'var(--surface2)',
        color: active ? color : 'var(--text-2)',
        border: `1px solid ${active ? color + '44' : 'var(--border)'}`,
      }}>
      {label}
      <span className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
        style={{ background: active ? `${color}33` : 'var(--surface)', color: active ? color : 'var(--text-3)' }}>
        {count}
      </span>
    </button>
  )
}

function InlineSpin() {
  return <span className="inline-block w-3.5 h-3.5 border-2 border-[#333] border-t-[#4285F4] rounded-full animate-spin" />
}
