'use client'

import { useState } from 'react'
import { Template } from '@/components/Dashboard'

const CUSTO: Record<string, number> = {
  UTILITY:   parseFloat(process.env.NEXT_PUBLIC_CUSTO_UTILITY  ?? '0.0068'),
  MARKETING: parseFloat(process.env.NEXT_PUBLIC_CUSTO_MARKETING ?? '0.0625'),
}
const USD_BRL    = parseFloat(process.env.NEXT_PUBLIC_USD_BRL ?? '5.70')
const N8N_WEBHOOK = '/api/disparo'

type Status = { type: 'success' | 'error'; title: string; detail: string } | null

export default function DisparoPanel({ selected }: { selected: Template | null }) {
  const [quantidade, setQuantidade] = useState(100)
  const [loading, setLoading]       = useState(false)
  const [status, setStatus]         = useState<Status>(null)

  const custo    = selected ? (CUSTO[selected.category] ?? 0) : 0
  const totalUsd = quantidade * custo
  const totalBrl = totalUsd * USD_BRL

  async function handleDisparo() {
    if (!selected) return
    setLoading(true)
    setStatus(null)
    try {
      const res = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: selected.name, linguagem: selected.language, quantidade }),
      })
      if (res.ok) {
        setStatus({
          type: 'success',
          title: 'Disparo iniciado!',
          detail: `${selected.name} · ${quantidade} contatos · US$ ${totalUsd.toFixed(4)} (~R$ ${totalBrl.toFixed(2)})`,
        })
      } else {
        const txt = await res.text().catch(() => '')
        setStatus({ type: 'error', title: 'Erro ao acionar o n8n', detail: `HTTP ${res.status}${txt ? ' — ' + txt : ''}` })
      }
    } catch (err) {
      setStatus({ type: 'error', title: 'Erro de conexão', detail: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="gcard p-6">
      <h2 className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'var(--text-3)' }}>
        Configurar Disparo
      </h2>

      {/* Template selecionado */}
      {selected ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 rounded-xl px-4 py-3 text-sm mb-5"
          style={{ background: 'rgba(37,211,102,.07)', border: '1px solid rgba(37,211,102,.2)' }}>
          <span style={{ color: 'var(--text-2)' }}>
            Template: <strong className="text-[#25D366]">{selected.name}</strong>
          </span>
          <span style={{ color: 'var(--text-3)' }}>·</span>
          <span style={{ color: 'var(--text-2)' }}>
            Categoria: <strong className="text-[#25D366]">
              {selected.category === 'UTILITY' ? 'Utilidade' : 'Marketing'}
            </strong>
          </span>
          <span style={{ color: 'var(--text-3)' }}>·</span>
          <span style={{ color: 'var(--text-2)' }}>
            Idioma: <strong className="text-[#25D366]">{selected.language}</strong>
          </span>
        </div>
      ) : (
        <div className="rounded-xl px-4 py-3 text-sm mb-5" style={{ background: 'var(--surface2)', color: 'var(--text-3)' }}>
          Selecione um template acima para configurar o disparo.
        </div>
      )}

      {/* Quantidade */}
      <div className="mb-5">
        <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>
          Quantidade de disparos
        </label>
        <input
          type="number" min={1} max={10000}
          value={quantidade}
          onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full sm:w-48 rounded-xl px-4 py-3 text-lg font-semibold outline-none transition-all"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)' }}
          onFocus={e => (e.target.style.borderColor = '#25D366')}
          onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      {/* Custo */}
      {selected && (
        <div className="grid grid-cols-3 gap-4 rounded-xl px-5 py-4 mb-5"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <CostItem label="Total (USD)" value={`US$ ${totalUsd.toFixed(4)}`} />
          <CostItem label="Total (BRL ~)" value={`R$ ${totalBrl.toFixed(2)}`} highlight />
          <CostItem label="Por mensagem" value={`US$ ${custo.toFixed(4)}`} />
        </div>
      )}

      {/* Botão */}
      <button
        onClick={handleDisparo}
        disabled={!selected || loading}
        className="w-full font-bold py-4 rounded-xl transition-all text-base cursor-pointer disabled:cursor-not-allowed hover:opacity-90 active:scale-[.99]"
        style={{
          background: !selected || loading ? 'var(--surface2)' : '#25D366',
          color: !selected || loading ? 'var(--text-3)' : '#000',
          border: '1px solid transparent',
        }}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner /> Disparando...
          </span>
        ) : selected ? '🚀  Iniciar Disparo' : 'Selecione um template'}
      </button>

      {/* Status */}
      {status && (
        <div className={`mt-4 rounded-xl p-4 ${
          status.type === 'success' ? 'bg-[#25D366]/10 border border-[#25D366]/25' : 'bg-red-500/10 border border-red-500/25'
        }`}>
          <p className={`font-semibold text-sm mb-1 ${status.type === 'success' ? 'text-[#25D366]' : 'text-red-400'}`}>
            {status.type === 'success' ? '✓ ' : '✗ '}{status.title}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-2)' }}>{status.detail}</p>
        </div>
      )}
    </div>
  )
}

function CostItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xl font-bold" style={{ color: highlight ? '#25D366' : 'var(--text)' }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{label}</p>
    </div>
  )
}

function Spinner() {
  return <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
}
