'use client'

import { useState } from 'react'
import { Template } from '@/components/Dashboard'

const CUSTO: Record<string, number> = {
  UTILITY:   parseFloat(process.env.NEXT_PUBLIC_CUSTO_UTILITY  ?? '0.0068'),
  MARKETING: parseFloat(process.env.NEXT_PUBLIC_CUSTO_MARKETING ?? '0.0625'),
}

const USD_BRL    = parseFloat(process.env.NEXT_PUBLIC_USD_BRL ?? '5.70')
const N8N_WEBHOOK = process.env.NEXT_PUBLIC_N8N_WEBHOOK_DISPARO ?? ''

type Status = { type: 'success' | 'error'; title: string; detail: string } | null

export default function DisparoPanel({ selected }: { selected: Template | null }) {
  const [quantidade, setQuantidade] = useState(100)
  const [loading, setLoading]       = useState(false)
  const [status, setStatus]         = useState<Status>(null)

  const custo     = selected ? (CUSTO[selected.category] ?? 0) : 0
  const totalUsd  = quantidade * custo
  const totalBrl  = totalUsd * USD_BRL

  async function handleDisparo() {
    if (!selected) return
    setLoading(true)
    setStatus(null)

    try {
      const res = await fetch(N8N_WEBHOOK, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template:   selected.name,
          linguagem:  selected.language,
          quantidade,
        }),
      })

      if (res.ok) {
        setStatus({
          type:   'success',
          title:  '✓ Disparo iniciado com sucesso!',
          detail: `Template: ${selected.name}  ·  ${quantidade} contatos  ·  Custo estimado: US$ ${totalUsd.toFixed(4)} (~R$ ${totalBrl.toFixed(2)})`,
        })
      } else {
        const txt = await res.text().catch(() => '')
        setStatus({
          type:   'error',
          title:  'Erro ao acionar o n8n',
          detail: `HTTP ${res.status}${txt ? ' — ' + txt : ''}`,
        })
      }
    } catch (err) {
      setStatus({
        type:   'error',
        title:  'Erro de conexão',
        detail: `Não foi possível alcançar o n8n: ${String(err)}`,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#141414] border border-[#222] rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-5">
        Configurar Disparo
      </h2>

      {/* Template selecionado */}
      {selected ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 bg-[#0a1a0f] border border-[#1a3d25] rounded-xl px-4 py-3 text-sm mb-5">
          <span className="text-gray-500">Template: <strong className="text-[#25D366]">{selected.name}</strong></span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-500">
            Categoria: <strong className="text-[#25D366]">
              {selected.category === 'UTILITY' ? 'Utilidade' : 'Marketing'}
            </strong>
          </span>
          <span className="text-gray-600">·</span>
          <span className="text-gray-500">Idioma: <strong className="text-[#25D366]">{selected.language}</strong></span>
        </div>
      ) : (
        <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl px-4 py-3 text-sm text-gray-600 mb-5">
          Selecione um template acima para configurar o disparo.
        </div>
      )}

      {/* Quantidade */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Quantidade de disparos
        </label>
        <input
          type="number"
          min={1}
          max={1000}
          value={quantidade}
          onChange={e => setQuantidade(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-full sm:w-48 bg-[#1e1e1e] border border-[#2a2a2a] rounded-xl px-4 py-3 text-lg font-semibold text-gray-200 focus:outline-none focus:border-[#25D366] transition-colors"
        />
      </div>

      {/* Estimativa de custo */}
      {selected && (
        <div className="flex flex-wrap gap-6 bg-[#1a1a1a] border border-[#252525] rounded-xl px-5 py-4 mb-5">
          <CostItem label="Custo estimado (USD)" value={`US$ ${totalUsd.toFixed(4)}`} />
          <Divider />
          <CostItem label="Custo estimado (BRL ~)" value={`R$ ${totalBrl.toFixed(2)}`} />
          <Divider />
          <CostItem label="Por mensagem" value={`US$ ${custo.toFixed(4)}`} />
        </div>
      )}

      {/* Botão */}
      <button
        onClick={handleDisparo}
        disabled={!selected || loading}
        className="w-full bg-[#25D366] hover:bg-[#20c05a] disabled:bg-[#1a3d25] disabled:text-[#2d6040] text-black font-bold py-4 rounded-xl transition-colors text-base cursor-pointer disabled:cursor-not-allowed"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner /> Disparando...
          </span>
        ) : selected ? 'Iniciar Disparo' : 'Selecione um template'}
      </button>

      {/* Status */}
      {status && (
        <div className={`mt-4 rounded-xl p-4 ${
          status.type === 'success'
            ? 'bg-[#0a1a0f] border border-[#1a4d28]'
            : 'bg-[#1a0a0a] border border-[#4d1a1a]'
        }`}>
          <p className={`font-semibold text-sm mb-1 ${
            status.type === 'success' ? 'text-[#25D366]' : 'text-red-400'
          }`}>
            {status.title}
          </p>
          <p className="text-xs text-gray-500">{status.detail}</p>
        </div>
      )}
    </div>
  )
}

function CostItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-600 mt-0.5">{label}</p>
    </div>
  )
}

function Divider() {
  return <div className="hidden sm:block w-px bg-[#2a2a2a] self-stretch" />
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
  )
}
