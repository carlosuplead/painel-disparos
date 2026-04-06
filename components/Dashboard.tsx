'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TemplateCard from '@/components/TemplateCard'
import DisparoPanel from '@/components/DisparoPanel'

export interface Template {
  id: string
  name: string
  category: 'UTILITY' | 'MARKETING' | string
  language: string
  status: string
  components: { type: string; text?: string }[]
}

export default function Dashboard({ userEmail }: { userEmail: string }) {
  const router  = useRouter()
  const supabase = createClient()

  const [templates, setTemplates]         = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templateError, setTemplateError] = useState('')
  const [selected, setSelected]           = useState<Template | null>(null)

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
    <div className="min-h-screen">

      {/* TOPBAR */}
      <header className="sticky top-0 z-10 bg-[#111] border-b border-[#1e1e1e] h-14 flex items-center justify-between px-6">
        <span className="font-bold text-[#25D366] tracking-tight">Disparos WA</span>
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-600 hidden sm:block">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-500 border border-[#2a2a2a] hover:border-[#444] hover:text-gray-300 rounded-lg px-3 py-1.5 transition-colors cursor-pointer"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 pb-16">

        {/* TEMPLATES */}
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Templates disponíveis
          </h2>
          <button
            onClick={loadTemplates}
            className="text-xs text-gray-600 border border-[#252525] hover:border-[#3a3a3a] hover:text-gray-400 rounded-md px-2.5 py-1 transition-colors cursor-pointer"
          >
            ↻ Atualizar
          </button>
        </div>

        {loadingTemplates && (
          <div className="flex items-center gap-2 text-gray-600 text-sm mb-8">
            <Spinner /> Carregando templates...
          </div>
        )}

        {templateError && (
          <div className="text-red-400 text-sm bg-[#1f0d0d] border border-[#4d1a1a] rounded-xl p-4 mb-8">
            {templateError}
          </div>
        )}

        {!loadingTemplates && !templateError && templates.length === 0 && (
          <p className="text-gray-600 text-sm mb-8">Nenhum template aprovado encontrado.</p>
        )}

        {templates.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-10">
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

        {/* DISPARO */}
        <DisparoPanel selected={selected} />

      </main>
    </div>
  )
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-[#333] border-t-[#25D366] rounded-full animate-spin" />
  )
}
