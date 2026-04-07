'use client'

import { useState, useEffect } from 'react'

interface AgendadoItem {
  id: string
  template: string
  linguagem: string
  quantidade: number
  scheduled_at: string
  fired_at?: string
  status: 'pendente' | 'disparado' | 'erro'
  created_at: string
}

interface Tmpl { id: string; name: string; language: string; category: string }

const STATUS_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  pendente:  { bg: 'rgba(245,158,11,.12)', text: '#f59e0b', label: '⏳ Pendente' },
  disparado: { bg: 'rgba(37,211,102,.12)', text: '#25D366',  label: '✓ Disparado' },
  erro:      { bg: 'rgba(239,68,68,.12)',  text: '#ef4444',  label: '✗ Erro' },
}

const SQL = `CREATE TABLE IF NOT EXISTS disparos_agendados (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template     TEXT NOT NULL,
  linguagem    TEXT NOT NULL,
  quantidade   INTEGER NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  fired_at     TIMESTAMPTZ,
  status       TEXT DEFAULT 'pendente',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);`

export default function Agendamentos({ templates }: { templates: Tmpl[] }) {
  const [list, setList]         = useState<AgendadoItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [showSql, setShowSql]   = useState(false)

  const [fTemplate, setFTemplate] = useState('')
  const [fQtd, setFQtd]           = useState(100)
  const [fDatetime, setFDatetime] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/agendamentos')
      if (res.ok) setList(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!fTemplate || !fDatetime) return
    setSaving(true)
    setError('')
    const t = templates.find(x => x.name === fTemplate)
    try {
      const res = await fetch('/api/agendamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: fTemplate,
          linguagem: t?.language ?? 'pt_BR',
          quantidade: fQtd,
          scheduled_at: fDatetime.replace('T', ' ') + ':00', // "2026-04-06 21:55:00" — BRL puro
        }),
      })
      if (res.ok) {
        setShowForm(false)
        setFTemplate(''); setFQtd(100); setFDatetime('')
        await load()
      } else {
        const d = await res.json()
        setError(d.error ?? 'Erro ao salvar')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Cancelar este agendamento?')) return
    await fetch(`/api/agendamentos?id=${id}`, { method: 'DELETE' })
    setList(l => l.filter(x => x.id !== id))
  }

  // Permite selecionar hoje — só bloqueia datas passadas no nível do dia
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const minDatetime = `${today}T00:00`

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-semibold" style={{ color: 'var(--text)' }}>Disparos Agendados</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
            Agende disparos automáticos com template, quantidade e horário definidos.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[.98] cursor-pointer"
            style={{ background: '#25D366', color: '#000' }}
          >
            {showForm ? '✕ Cancelar' : '+ Novo'}
          </button>
        </div>
      </div>

      {/* SQL box — hidden, kept for reference only */}
      {showSql && (
        <div className="gcard p-5 mb-6 animate-fade-up">
          <pre
            className="text-xs rounded-xl p-4 overflow-x-auto"
            style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}
          >{SQL}</pre>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="gcard p-6 mb-6 animate-fade-up">
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Novo Agendamento</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
                Template
              </label>
              <select
                value={fTemplate}
                onChange={e => setFTemplate(e.target.value)}
                required
                className="w-full rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                <option value="">Selecione um template...</option>
                {templates.map(t => (
                  <option key={t.id} value={t.name}>{t.name} ({t.language})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
                  Quantidade
                </label>
                <input
                  type="number" min={1} max={10000}
                  value={fQtd}
                  onChange={e => setFQtd(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
                  Data e Hora (horário local)
                </label>
                <input
                  type="datetime-local"
                  value={fDatetime}
                  min={minDatetime}
                  onChange={e => setFDatetime(e.target.value)}
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none cursor-pointer"
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 cursor-pointer disabled:opacity-60"
              style={{ background: '#25D366', color: '#000' }}
            >
              {saving ? 'Salvando...' : '📅 Agendar Disparo'}
            </button>
          </form>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}>
          <Spin /> Carregando...
        </div>
      ) : list.length === 0 ? (
        <div className="gcard p-10 text-center" style={{ color: 'var(--text-3)' }}>
          <p className="text-4xl mb-3">📅</p>
          <p className="text-sm">Nenhum agendamento criado ainda.</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>Clique em &quot;+ Novo&quot; para agendar um disparo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(item => {
            const st  = STATUS_STYLE[item.status] ?? STATUS_STYLE.pendente
            const dt  = new Date(item.scheduled_at)
            const isPast = dt < new Date() && item.status === 'pendente'
            return (
              <div key={item.id} className="gcard p-4 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-sm truncate" style={{ color: 'var(--text)' }}>
                      {item.template}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: st.bg, color: st.text }}>
                      {st.label}
                    </span>
                    {isPast && <span className="text-xs text-orange-400">⚠ atrasado</span>}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-2)' }}>
                    <span>🌐 {item.linguagem}</span>
                    <span>📨 {item.quantidade.toLocaleString('pt-BR')} contatos</span>
                    <span>⏰ {dt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}</span>
                    {item.fired_at && (
                      <span style={{ color: 'var(--text-3)' }}>
                        Disparado em {new Date(item.fired_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
                {item.status === 'pendente' && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-xs px-3 py-1.5 rounded-lg transition-all hover:opacity-80 cursor-pointer"
                    style={{ background: 'rgba(239,68,68,.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,.2)' }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Spin() {
  return <span className="inline-block w-3.5 h-3.5 border-2 border-[#333] border-t-[#25D366] rounded-full animate-spin" />
}
