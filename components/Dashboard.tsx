'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TemplateCard from '@/components/TemplateCard'
import DisparoPanel from '@/components/DisparoPanel'
import Resultados from '@/components/Resultados'
import Agendamentos from '@/components/Agendamentos'
import AgendaCalendar from '@/components/AgendaCalendar'

export interface Template {
  id: string
  name: string
  category: 'UTILITY' | 'MARKETING' | string
  language: string
  status: string
  components: { type: string; text?: string }[]
}

type Tab = 'disparar' | 'resultados' | 'agendamentos' | 'agenda'

const NAV: { id: Tab; label: string; icon: string }[] = [
  { id: 'disparar',      label: 'Disparar',      icon: '📤' },
  { id: 'resultados',    label: 'Resultados',    icon: '📊' },
  { id: 'agendamentos',  label: 'Agendamentos',  icon: '📋' },
  { id: 'agenda',        label: 'Agenda do Dia', icon: '📅' },
]

export default function Dashboard({ userEmail }: { userEmail: string }) {
  const router   = useRouter()
  const supabase = createClient()

  const [tab, setTab]     = useState<Tab>('disparar')
  const [dark, setDark]   = useState(true)
  const [templates, setTemplates]                   = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates]     = useState(true)
  const [templateError, setTemplateError]           = useState('')
  const [selected, setSelected]                     = useState<Template | null>(null)
  const [sidebarOpen, setSidebarOpen]               = useState(false)

  // Sync theme with <html> class
  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const isDark = stored !== 'light'
    setDark(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true)
    setTemplateError('')
    try {
      const res = await fetch('/api/templates')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Template[] = await res.json()
      setTemplates(data.filter(t => t.status === 'APPROVED'))
    } catch (err) {
      setTemplateError(`Erro ao carregar templates: ${String(err)}`)
    } finally {
      setLoadingTemplates(false)
    }
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Sidebar overlay (mobile) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-30 w-56 flex flex-col transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center shadow-sm shadow-[#25D366]/30 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" fill="white"/>
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text)' }}>Disparos API OFC</p>
            <p className="text-[10px] truncate" style={{ color: 'var(--text-3)' }}>Metricsia</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => { setTab(n.id); setSidebarOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer"
              style={{
                background: tab === n.id ? 'rgba(37,211,102,.12)' : 'transparent',
                color: tab === n.id ? '#25D366' : 'var(--text-2)',
                border: tab === n.id ? '1px solid rgba(37,211,102,.2)' : '1px solid transparent',
              }}
            >
              <span>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Bottom: user + theme + logout */}
        <div className="px-3 pb-4 space-y-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer hover:opacity-80"
            style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}
          >
            <span>{dark ? '☀️' : '🌙'}</span>
            <span>{dark ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>

          {/* User */}
          <div className="px-3 py-2">
            <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{userEmail}</p>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all cursor-pointer hover:opacity-80"
            style={{ color: '#ef4444', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.1)' }}
          >
            <span>🚪</span> Sair
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">

        {/* Mobile topbar */}
        <header
          className="lg:hidden sticky top-0 z-10 h-14 flex items-center justify-between px-4"
          style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
        >
          <button onClick={() => setSidebarOpen(true)} className="text-lg cursor-pointer p-1">
            ☰
          </button>
          <span className="font-bold text-sm text-[#25D366]">Disparos API OFC</span>
          <button onClick={toggleTheme} className="text-lg cursor-pointer p-1">
            {dark ? '☀️' : '🌙'}
          </button>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 pb-20">

          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text)' }}>
              {NAV.find(n => n.id === tab)?.icon} {NAV.find(n => n.id === tab)?.label}
            </h1>
          </div>

          {/* ── Tab: Disparar ── */}
          {tab === 'disparar' && (
            <div className="animate-fade-up">
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                  Templates disponíveis
                </h2>
                <button
                  onClick={loadTemplates}
                  className="text-xs px-2.5 py-1 rounded-md transition-all cursor-pointer hover:opacity-80"
                  style={{ background: 'var(--surface2)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
                >
                  ↻ Atualizar
                </button>
              </div>

              {loadingTemplates && (
                <div className="flex items-center gap-2 text-sm mb-8" style={{ color: 'var(--text-3)' }}>
                  <Spin /> Carregando templates...
                </div>
              )}

              {templateError && (
                <div className="rounded-xl p-4 mb-8 text-sm text-red-400"
                  style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)' }}>
                  {templateError}
                </div>
              )}

              {!loadingTemplates && !templateError && templates.length === 0 && (
                <p className="text-sm mb-8" style={{ color: 'var(--text-3)' }}>Nenhum template aprovado encontrado.</p>
              )}

              {templates.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                  {templates.map(t => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      selected={selected?.id === t.id}
                      onSelect={setSelected}
                    />
                  ))}
                </div>
              )}

              <DisparoPanel selected={selected} />
            </div>
          )}

          {/* ── Tab: Resultados ── */}
          {tab === 'resultados' && (
            <div className="animate-fade-up">
              <Resultados />
            </div>
          )}

          {/* ── Tab: Agendamentos ── */}
          {tab === 'agendamentos' && (
            <div className="animate-fade-up">
              <Agendamentos templates={templates.map(t => ({ id: t.id, name: t.name, language: t.language, category: t.category }))} />
            </div>
          )}

          {/* ── Tab: Agenda do Dia ── */}
          {tab === 'agenda' && (
            <div className="animate-fade-up">
              <AgendaCalendar />
            </div>
          )}

        </main>
      </div>
    </div>
  )
}

function Spin() {
  return <span className="inline-block w-4 h-4 border-2 border-[#333] border-t-[#25D366] rounded-full animate-spin" />
}
