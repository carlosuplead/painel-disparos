'use client'

import { useState, useEffect, useCallback } from 'react'

interface TemplateComponent {
  type: string
  format?: string
  text?: string
  buttons?: { type: string; text: string; url?: string; phone_number?: string }[]
}

interface Template {
  id: string | number
  name: string
  category: string
  language: string
  status: string
  components: TemplateComponent[]
}

type FilterStatus = 'all' | 'APPROVED' | 'PENDING' | 'REJECTED'
type CreateType = 'text' | 'image' | 'video' | 'advanced'
type HeaderType = 'none' | 'text' | 'image' | 'video'
type ButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'

interface ButtonItem {
  type: ButtonType
  text: string
  url: string
  phone: string
}

interface FormState {
  name: string
  language: string
  category: string
  bodyText: string
  bodyExamples: string[]
  footerText: string
  headerType: HeaderType
  headerText: string
  headerTextExamples: string[]
  headerMediaUrl: string
  buttons: ButtonItem[]
}

const defaultForm: FormState = {
  name: '',
  language: 'pt_BR',
  category: 'MARKETING',
  bodyText: '',
  bodyExamples: [],
  footerText: '',
  headerType: 'none',
  headerText: '',
  headerTextExamples: [],
  headerMediaUrl: '',
  buttons: [],
}

const LANGUAGES = [
  { value: 'pt_BR', label: 'Português (BR)' },
  { value: 'en_US', label: 'English (US)' },
  { value: 'es_ES', label: 'Español (ES)' },
  { value: 'en',    label: 'English' },
]

function countParams(text: string): number {
  const matches = text.match(/\{\{(\d+)\}\}/g) ?? []
  if (!matches.length) return 0
  return Math.max(...matches.map(m => parseInt(m.replace(/[{}]/g, ''))))
}

function formatName(v: string): string {
  return v.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/__+/g, '_')
}

function getBodyText(t: Template): string {
  return t.components.find(c => c.type === 'BODY')?.text ?? ''
}

function statusStyle(s: string): { bg: string; color: string } {
  if (s === 'APPROVED') return { bg: 'rgba(37,211,102,.15)',  color: '#25D366' }
  if (s === 'PENDING')  return { bg: 'rgba(245,158,11,.15)', color: '#f59e0b' }
  return                       { bg: 'rgba(239,68,68,.15)',  color: '#ef4444' }
}

function categoryStyle(c: string): { bg: string; color: string } {
  if (c === 'UTILITY') return { bg: 'rgba(59,130,246,.15)',  color: '#3b82f6' }
  return                      { bg: 'rgba(168,85,247,.15)', color: '#a855f7' }
}

export default function Templates() {
  const [templates, setTemplates]     = useState<Template[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [expanded, setExpanded]       = useState<string | number | null>(null)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const [confirmDel, setConfirmDel]   = useState<string | null>(null)

  const [showCreate, setShowCreate]   = useState(false)
  const [createType, setCreateType]   = useState<CreateType | null>(null)
  const [form, setForm]               = useState<FormState>(defaultForm)
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const fetchTemplates = useCallback(async () => {
    setLoadingList(true)
    try {
      const res = await fetch('/api/templates')
      const data = await res.json()
      setTemplates(Array.isArray(data) ? data : [])
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const filtered = templates.filter(t =>
    filterStatus === 'all' ? true : t.status === filterStatus
  )

  const counts = {
    all:      templates.length,
    APPROVED: templates.filter(t => t.status === 'APPROVED').length,
    PENDING:  templates.filter(t => t.status === 'PENDING').length,
    REJECTED: templates.filter(t => t.status === 'REJECTED').length,
  }

  function upd(patch: Partial<FormState>) {
    setForm(f => ({ ...f, ...patch }))
  }

  function onBodyChange(text: string) {
    const n = countParams(text)
    setForm(f => {
      const ex = [...f.bodyExamples]
      while (ex.length < n) ex.push('')
      return { ...f, bodyText: text, bodyExamples: ex.slice(0, n) }
    })
  }

  function onHeaderTextChange(text: string) {
    const n = countParams(text)
    setForm(f => {
      const ex = [...f.headerTextExamples]
      while (ex.length < n) ex.push('')
      return { ...f, headerText: text, headerTextExamples: ex.slice(0, n) }
    })
  }

  function addButton(type: ButtonType) {
    if (form.buttons.length >= 3) return
    setForm(f => ({ ...f, buttons: [...f.buttons, { type, text: '', url: '', phone: '' }] }))
  }

  function removeButton(i: number) {
    setForm(f => ({ ...f, buttons: f.buttons.filter((_, j) => j !== i) }))
  }

  function updButton(i: number, patch: Partial<ButtonItem>) {
    setForm(f => {
      const buttons = [...f.buttons]
      buttons[i] = { ...buttons[i], ...patch }
      return { ...f, buttons }
    })
  }

  function buildPayload() {
    const components: object[] = []

    // HEADER
    if (createType === 'image' || (createType === 'advanced' && form.headerType === 'image')) {
      components.push({
        type: 'HEADER', format: 'IMAGE',
        example: { header_handle: [form.headerMediaUrl || 'https://example.com/image.jpg'] },
      })
    } else if (createType === 'video' || (createType === 'advanced' && form.headerType === 'video')) {
      components.push({
        type: 'HEADER', format: 'VIDEO',
        example: { header_handle: [form.headerMediaUrl || 'https://example.com/video.mp4'] },
      })
    } else if (createType === 'advanced' && form.headerType === 'text' && form.headerText) {
      const h: Record<string, unknown> = { type: 'HEADER', format: 'TEXT', text: form.headerText }
      if (form.headerTextExamples.length > 0) h.example = { header_text: form.headerTextExamples }
      components.push(h)
    }

    // BODY
    const body: Record<string, unknown> = { type: 'BODY', text: form.bodyText }
    if (form.bodyExamples.length > 0) body.example = { body_text: [form.bodyExamples] }
    components.push(body)

    // FOOTER
    if (form.footerText.trim()) components.push({ type: 'FOOTER', text: form.footerText })

    // BUTTONS
    if (form.buttons.length > 0) {
      components.push({
        type: 'BUTTONS',
        buttons: form.buttons.map(b => {
          if (b.type === 'QUICK_REPLY')   return { type: 'QUICK_REPLY', text: b.text }
          if (b.type === 'URL')           return { type: 'URL', text: b.text, url: b.url }
          return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone }
        }),
      })
    }

    return { name: form.name, language: form.language, category: form.category, components }
  }

  async function handleCreate() {
    if (!form.name || !form.bodyText) { setCreateError('Nome e corpo são obrigatórios.'); return }
    setCreating(true); setCreateError('')
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const data = await res.json()
      if (!res.ok) { setCreateError(JSON.stringify(data.error ?? data)); return }
      setCreateSuccess(`Template "${form.name}" enviado! Status: ${data.status ?? 'PENDING'}`)
      setForm(defaultForm)
      setCreateType(null)
      fetchTemplates()
    } catch (err) {
      setCreateError(String(err))
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(name: string) {
    setDeleting(name)
    try {
      const res = await fetch(`/api/templates?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { alert(`Erro ao excluir: ${JSON.stringify(data.error ?? data)}`); return }
      setTemplates(ts => ts.filter(t => t.name !== name))
      setExpanded(null)
    } finally {
      setDeleting(null)
      setConfirmDel(null)
    }
  }

  function openCreate() {
    setShowCreate(true); setCreateType(null)
    setForm(defaultForm); setCreateError(''); setCreateSuccess('')
  }

  function closeCreate() {
    setShowCreate(false); setCreateType(null); setCreateError('')
  }

  // ── RENDER ──
  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap gap-2">
          {(['all', 'APPROVED', 'PENDING', 'REJECTED'] as FilterStatus[]).map(s => {
            const active = filterStatus === s
            const col = s === 'APPROVED' ? '#25D366' : s === 'PENDING' ? '#f59e0b' : s === 'REJECTED' ? '#ef4444' : '#3b82f6'
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer"
                style={{
                  background: active ? `${col}22` : 'var(--surface2)',
                  color: active ? col : 'var(--text-2)',
                  border: `1px solid ${active ? col + '44' : 'var(--border)'}`,
                }}>
                {s === 'all' ? 'Todos' : s === 'APPROVED' ? 'Aprovados' : s === 'PENDING' ? 'Pendentes' : 'Rejeitados'}
                <span className="ml-1.5 opacity-60">{counts[s]}</span>
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          <button onClick={fetchTemplates} disabled={loadingList}
            className="text-xs px-3 py-2 rounded-lg transition-all hover:opacity-80 disabled:opacity-40 cursor-pointer"
            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
            {loadingList ? <InlineSpin /> : '↻'}
          </button>
          <button onClick={openCreate}
            className="text-sm px-4 py-2 rounded-xl font-semibold transition-all hover:opacity-80 cursor-pointer"
            style={{ background: '#25D366', color: '#000' }}>
            + Criar Template
          </button>
        </div>
      </div>

      {/* List */}
      {loadingList && templates.length === 0 && (
        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-3)' }}>
          <InlineSpin /> Carregando templates...
        </div>
      )}

      {!loadingList && filtered.length === 0 && (
        <div className="gcard p-10 flex flex-col items-center gap-3">
          <span className="text-4xl opacity-30">📋</span>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Nenhum template encontrado</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(t => {
          const sc = statusStyle(t.status)
          const cc = categoryStyle(t.category)
          const body = getBodyText(t)
          const isOpen = expanded === t.id
          const headerComp  = t.components.find(c => c.type === 'HEADER')
          const footerComp  = t.components.find(c => c.type === 'FOOTER')
          const buttonsComp = t.components.find(c => c.type === 'BUTTONS')

          return (
            <div key={t.id} className="gcard overflow-hidden">
              <button onClick={() => setExpanded(isOpen ? null : t.id)}
                className="w-full flex items-start gap-3 p-4 text-left cursor-pointer hover:opacity-80 transition-all">
                <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ background: sc.color, opacity: 0.8 }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{t.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={sc}>{t.status}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={cc}>{t.category}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text-3)' }}>{t.language}</span>
                    {headerComp  && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text-3)' }}>📎 {headerComp.format}</span>}
                    {buttonsComp && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--surface2)', color: 'var(--text-3)' }}>🔘 botões</span>}
                  </div>
                  {body && <p className="text-xs truncate" style={{ color: 'var(--text-2)' }}>{body}</p>}
                </div>
                <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--text-3)' }}>{isOpen ? '▲' : '▼'}</span>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
                  {headerComp && (
                    <div className="pt-3">
                      <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Header ({headerComp.format})</p>
                      {headerComp.text
                        ? <p className="text-sm" style={{ color: 'var(--text)' }}>{headerComp.text}</p>
                        : <p className="text-xs" style={{ color: 'var(--text-3)' }}>{headerComp.format === 'IMAGE' ? '🖼️ Imagem' : '🎥 Vídeo'}</p>
                      }
                    </div>
                  )}
                  {body && (
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Body</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text)' }}>{body}</p>
                    </div>
                  )}
                  {footerComp?.text && (
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Footer</p>
                      <p className="text-xs" style={{ color: 'var(--text-2)' }}>{footerComp.text}</p>
                    </div>
                  )}
                  {buttonsComp?.buttons && (
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Botões</p>
                      <div className="flex flex-wrap gap-2">
                        {buttonsComp.buttons.map((b, i) => (
                          <span key={i} className="text-xs px-3 py-1.5 rounded-lg font-medium"
                            style={{ background: 'rgba(59,130,246,.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,.2)' }}>
                            {b.text}{b.type === 'URL' ? ' ↗' : b.type === 'PHONE_NUMBER' ? ' 📞' : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delete */}
                  <div className="pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    {confirmDel === t.name ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs flex-1" style={{ color: 'var(--text-2)' }}>Confirmar exclusão?</span>
                        <button onClick={() => handleDelete(t.name)} disabled={deleting === t.name}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold cursor-pointer hover:opacity-80 disabled:opacity-40"
                          style={{ background: '#ef4444', color: '#fff' }}>
                          {deleting === t.name ? <InlineSpin /> : 'Excluir'}
                        </button>
                        <button onClick={() => setConfirmDel(null)}
                          className="text-xs px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-80"
                          style={{ background: 'var(--surface2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}>
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDel(t.name)}
                        className="text-xs px-3 py-1.5 rounded-lg cursor-pointer hover:opacity-80 transition-all"
                        style={{ background: 'rgba(239,68,68,.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,.15)' }}>
                        🗑 Excluir template
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={closeCreate}>
          <div className="w-full max-w-2xl rounded-2xl flex flex-col"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between p-5 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--border)' }}>
              <div>
                <p className="font-bold text-base" style={{ color: 'var(--text)' }}>
                  {!createType ? 'Criar Template' : createType === 'text' ? '📝 Texto' : createType === 'image' ? '🖼️ Texto + Imagem' : createType === 'video' ? '🎥 Texto + Vídeo' : '⚙️ Avançado'}
                </p>
                {createType && (
                  <button onClick={() => { setCreateType(null); setCreateError('') }}
                    className="text-xs mt-0.5 cursor-pointer hover:opacity-70" style={{ color: 'var(--text-3)' }}>
                    ← Voltar
                  </button>
                )}
              </div>
              <button onClick={closeCreate}
                className="w-8 h-8 flex items-center justify-center rounded-full cursor-pointer hover:opacity-60"
                style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}>✕</button>
            </div>

            <div className="overflow-y-auto p-5">

              {/* Success message */}
              {createSuccess && (
                <div className="rounded-xl p-4 mb-4 text-sm" style={{ background: 'rgba(37,211,102,.1)', color: '#25D366', border: '1px solid rgba(37,211,102,.2)' }}>
                  ✓ {createSuccess}
                </div>
              )}

              {/* Step 1: Type selector */}
              {!createType && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'text'     as CreateType, icon: '📝', title: 'Criar Texto',       desc: 'Somente texto, sem mídia' },
                    { id: 'image'    as CreateType, icon: '🖼️', title: 'Texto com Imagem',  desc: 'Cabeçalho com imagem + corpo' },
                    { id: 'video'    as CreateType, icon: '🎥', title: 'Texto com Vídeo',   desc: 'Cabeçalho com vídeo + corpo' },
                    { id: 'advanced' as CreateType, icon: '⚙️', title: 'Avançado',           desc: 'Botões, parâmetros e controle total' },
                  ].map(opt => (
                    <button key={opt.id} onClick={() => setCreateType(opt.id)}
                      className="gcard p-5 flex flex-col items-start gap-2 text-left transition-all hover:opacity-80 cursor-pointer"
                      style={{ border: '1px solid var(--border)' }}>
                      <span className="text-2xl">{opt.icon}</span>
                      <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{opt.title}</p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>{opt.desc}</p>
                    </button>
                  ))}
                </div>
              )}

              {/* Step 2: Form */}
              {createType && (
                <div className="space-y-4">

                  {/* Name + Language */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-3)' }}>Nome *</label>
                      <input value={form.name} onChange={e => upd({ name: formatName(e.target.value) })}
                        placeholder="meu_template"
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>Minúsculas, sem espaços</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-3)' }}>Idioma</label>
                      <select value={form.language} onChange={e => upd({ language: e.target.value })}
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none cursor-pointer"
                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                        {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-3)' }}>Categoria</label>
                    <div className="flex gap-2">
                      {(['MARKETING', 'UTILITY'] as const).map(c => (
                        <button key={c} onClick={() => upd({ category: c })}
                          className="px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer"
                          style={{
                            background: form.category === c ? (c === 'MARKETING' ? 'rgba(168,85,247,.2)' : 'rgba(59,130,246,.2)') : 'var(--surface2)',
                            color: form.category === c ? (c === 'MARKETING' ? '#a855f7' : '#3b82f6') : 'var(--text-2)',
                            border: `1px solid ${form.category === c ? (c === 'MARKETING' ? '#a855f744' : '#3b82f644') : 'var(--border)'}`,
                          }}>
                          {c === 'MARKETING' ? '📢 Marketing' : '🔧 Utilidade'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Image / Video upload */}
                  {(createType === 'image' || createType === 'video') && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-3)' }}>
                        {createType === 'image' ? 'Imagem de exemplo' : 'Vídeo de exemplo'} *
                      </label>
                      <FileUpload type={createType} value={form.headerMediaUrl} onChange={url => upd({ headerMediaUrl: url })} />
                      <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>Usado como exemplo para aprovação da Meta</p>
                    </div>
                  )}

                  {/* Advanced: Header type */}
                  {createType === 'advanced' && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-3)' }}>Cabeçalho (opcional)</label>
                      <div className="flex gap-2 flex-wrap mb-3">
                        {(['none', 'text', 'image', 'video'] as HeaderType[]).map(h => (
                          <button key={h} onClick={() => upd({ headerType: h })}
                            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer"
                            style={{
                              background: form.headerType === h ? 'rgba(37,211,102,.15)' : 'var(--surface2)',
                              color: form.headerType === h ? '#25D366' : 'var(--text-2)',
                              border: `1px solid ${form.headerType === h ? 'rgba(37,211,102,.3)' : 'var(--border)'}`,
                            }}>
                            {h === 'none' ? 'Nenhum' : h === 'text' ? '📝 Texto' : h === 'image' ? '🖼️ Imagem' : '🎥 Vídeo'}
                          </button>
                        ))}
                      </div>
                      {form.headerType === 'text' && (
                        <div className="space-y-2">
                          <input value={form.headerText} onChange={e => onHeaderTextChange(e.target.value)}
                            placeholder="Texto do cabeçalho (suporta {{1}})"
                            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                          {form.headerTextExamples.map((ex, i) => (
                            <input key={i} value={ex}
                              onChange={e => { const a = [...form.headerTextExamples]; a[i] = e.target.value; upd({ headerTextExamples: a }) }}
                              placeholder={`Exemplo para {{${i + 1}}}`}
                              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                              style={{ background: 'var(--surface2)', border: '1px solid rgba(245,158,11,.3)', color: 'var(--text)' }} />
                          ))}
                        </div>
                      )}
                      {(form.headerType === 'image' || form.headerType === 'video') && (
                        <div className="mt-3">
                          <FileUpload type={form.headerType} value={form.headerMediaUrl} onChange={url => upd({ headerMediaUrl: url })} />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Body */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-3)' }}>
                      Corpo * <span className="font-normal normal-case opacity-60">— use {'{{1}}'}, {'{{2}}'}... para variáveis</span>
                    </label>
                    <textarea value={form.bodyText} onChange={e => onBodyChange(e.target.value)}
                      placeholder={'Olá, {{1}}!\n\nEscreva o corpo da mensagem aqui.'}
                      rows={5}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    {form.bodyExamples.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {form.bodyExamples.map((ex, i) => (
                          <input key={i} value={ex}
                            onChange={e => { const a = [...form.bodyExamples]; a[i] = e.target.value; upd({ bodyExamples: a }) }}
                            placeholder={`Exemplo para {{${i + 1}}}`}
                            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                            style={{ background: 'var(--surface2)', border: '1px solid rgba(245,158,11,.3)', color: 'var(--text)' }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider block mb-1.5" style={{ color: 'var(--text-3)' }}>Rodapé (opcional)</label>
                    <input value={form.footerText} onChange={e => upd({ footerText: e.target.value })}
                      placeholder="Texto do rodapé"
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                      style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  </div>

                  {/* Buttons (advanced only) */}
                  {createType === 'advanced' && (
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: 'var(--text-3)' }}>Botões (opcional, máx. 3)</label>
                      <div className="space-y-2">
                        {form.buttons.map((btn, i) => (
                          <div key={i} className="flex gap-2 items-start">
                            <div className="flex-1 space-y-1.5">
                              <input value={btn.text} onChange={e => updButton(i, { text: e.target.value })}
                                placeholder="Texto do botão"
                                className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                              {btn.type === 'URL' && (
                                <input value={btn.url} onChange={e => updButton(i, { url: e.target.value })}
                                  placeholder="https://..."
                                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                              )}
                              {btn.type === 'PHONE_NUMBER' && (
                                <input value={btn.phone} onChange={e => updButton(i, { phone: e.target.value })}
                                  placeholder="+55 11 99999-9999"
                                  className="w-full rounded-xl px-3 py-2 text-sm outline-none"
                                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                              )}
                            </div>
                            <span className="text-[10px] px-2 py-1.5 rounded-lg mt-0.5 flex-shrink-0"
                              style={{ background: 'var(--surface2)', color: 'var(--text-3)', border: '1px solid var(--border)' }}>
                              {btn.type === 'QUICK_REPLY' ? '↩ Reply' : btn.type === 'URL' ? '↗ URL' : '📞 Tel'}
                            </span>
                            <button onClick={() => removeButton(i)}
                              className="text-xs px-2 py-1.5 rounded-lg mt-0.5 flex-shrink-0 cursor-pointer hover:opacity-80"
                              style={{ background: 'rgba(239,68,68,.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,.2)' }}>
                              ✕
                            </button>
                          </div>
                        ))}
                        {form.buttons.length < 3 && (
                          <div className="flex gap-2 flex-wrap">
                            {(['QUICK_REPLY', 'URL', 'PHONE_NUMBER'] as ButtonType[]).map(bt => (
                              <button key={bt} onClick={() => addButton(bt)}
                                className="text-xs px-3 py-2 rounded-xl cursor-pointer hover:opacity-80 transition-all"
                                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
                                + {bt === 'QUICK_REPLY' ? 'Quick Reply' : bt === 'URL' ? 'URL' : 'Telefone'}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {createError && (
                    <div className="rounded-xl p-3 text-sm" style={{ background: 'rgba(239,68,68,.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,.2)' }}>
                      {createError}
                    </div>
                  )}

                  {/* Submit */}
                  <button onClick={handleCreate} disabled={creating || !form.name || !form.bodyText}
                    className="w-full py-3 rounded-xl text-sm font-bold transition-all hover:opacity-80 disabled:opacity-40 cursor-pointer"
                    style={{ background: '#25D366', color: '#000' }}>
                    {creating
                      ? <span className="flex items-center justify-center gap-2"><InlineSpin /> Enviando...</span>
                      : 'Enviar para aprovação →'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FileUpload({ type, value, onChange }: {
  type: 'image' | 'video'
  value: string
  onChange: (url: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError]         = useState('')
  const accept  = type === 'image' ? '.jpg,.jpeg,.png' : '.mp4'
  const formats = type === 'image' ? 'JPG, PNG' : 'MP4'
  const maxMB   = type === 'image' ? '5MB' : '16MB'

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(''); setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', type)
    try {
      const res  = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      onChange(data.url)
    } catch (err) {
      setError(String(err))
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (value) {
    return (
      <div className="rounded-xl p-3 flex items-center gap-3"
        style={{ background: 'rgba(37,211,102,.08)', border: '1px solid rgba(37,211,102,.2)' }}>
        {type === 'image'
          ? <img src={value} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
          : <span className="text-2xl flex-shrink-0">🎥</span>
        }
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: '#25D366' }}>Upload concluído ✓</p>
          <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>{value}</p>
        </div>
        <button onClick={() => onChange('')}
          className="text-xs cursor-pointer hover:opacity-70 flex-shrink-0"
          style={{ color: 'var(--text-3)' }}>✕</button>
      </div>
    )
  }

  return (
    <div>
      <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-xl cursor-pointer transition-all hover:opacity-80"
        style={{ background: 'var(--surface2)', border: '2px dashed var(--border)' }}>
        {uploading ? (
          <><InlineSpin /><span className="text-xs" style={{ color: 'var(--text-3)' }}>Enviando...</span></>
        ) : (
          <>
            <span className="text-3xl">{type === 'image' ? '🖼️' : '🎥'}</span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-2)' }}>Clique para selecionar</span>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>{formats} • máx. {maxMB}</span>
          </>
        )}
        <input type="file" accept={accept} onChange={handleFile} className="hidden" disabled={uploading} />
      </label>
      {error && <p className="text-xs mt-1.5" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  )
}

function InlineSpin() {
  return <span className="inline-block w-3.5 h-3.5 border-2 border-[#333] border-t-[#25D366] rounded-full animate-spin" />
}
