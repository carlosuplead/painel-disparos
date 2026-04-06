import { Template } from '@/components/Dashboard'

const CUSTO: Record<string, number> = {
  UTILITY:   parseFloat(process.env.NEXT_PUBLIC_CUSTO_UTILITY  ?? '0.0068'),
  MARKETING: parseFloat(process.env.NEXT_PUBLIC_CUSTO_MARKETING ?? '0.0625'),
}

const USD_BRL = parseFloat(process.env.NEXT_PUBLIC_USD_BRL ?? '5.70')

interface Props {
  template: Template
  selected: boolean
  onSelect: (t: Template) => void
}

export default function TemplateCard({ template: t, selected, onSelect }: Props) {
  const bodyText = t.components?.find(c => c.type === 'BODY')?.text ?? '(sem corpo de texto)'
  const custo    = CUSTO[t.category] ?? 0

  return (
    <button
      onClick={() => onSelect(t)}
      className={`text-left w-full rounded-2xl p-5 border-2 transition-all cursor-pointer ${
        selected
          ? 'border-[#25D366] bg-[#0a1a0f]'
          : 'border-[#222] bg-[#141414] hover:border-[#2e2e2e]'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="font-bold text-white text-base leading-tight">{t.name}</span>
        <div className="flex gap-1.5 flex-shrink-0">
          <CategoryBadge category={t.category} />
        </div>
      </div>

      {/* Body preview */}
      <div className="bg-[#1a1a1a] rounded-xl p-3 text-xs text-gray-400 leading-relaxed mb-3 min-h-[52px] whitespace-pre-wrap break-words">
        {bodyText}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#1e1e1e]">
        <span className="text-xs text-gray-600">🌐 {t.language}</span>
        <span className="text-xs text-gray-500">
          <span className="text-gray-300 font-semibold">US$ {custo.toFixed(4)}</span> / msg
          <span className="text-gray-600 ml-1">(~R$ {(custo * USD_BRL).toFixed(4)})</span>
        </span>
      </div>
    </button>
  )
}

function CategoryBadge({ category }: { category: string }) {
  if (category === 'UTILITY') {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide bg-[#0d2b18] text-[#25D366] px-2 py-0.5 rounded-full">
        Utilidade
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide bg-[#2b1e08] text-amber-400 px-2 py-0.5 rounded-full">
      Marketing
    </span>
  )
}
