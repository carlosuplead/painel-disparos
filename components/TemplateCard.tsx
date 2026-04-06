import { Template } from '@/components/Dashboard'

const CUSTO: Record<string, number> = {
  UTILITY:   parseFloat(process.env.NEXT_PUBLIC_CUSTO_UTILITY  ?? '0.0068'),
  MARKETING: parseFloat(process.env.NEXT_PUBLIC_CUSTO_MARKETING ?? '0.0625'),
}
const USD_BRL = parseFloat(process.env.NEXT_PUBLIC_USD_BRL ?? '5.70')

interface Props { template: Template; selected: boolean; onSelect: (t: Template) => void }

export default function TemplateCard({ template: t, selected, onSelect }: Props) {
  const bodyText = t.components?.find(c => c.type === 'BODY')?.text ?? '(sem corpo de texto)'
  const custo    = CUSTO[t.category] ?? 0

  return (
    <button
      onClick={() => onSelect(t)}
      className="text-left w-full rounded-2xl p-4 border-2 transition-all cursor-pointer group"
      style={{
        background: selected ? 'rgba(37,211,102,.08)' : 'var(--surface)',
        borderColor: selected ? '#25D366' : 'var(--border)',
        boxShadow: selected ? '0 0 0 3px rgba(37,211,102,.15)' : 'none',
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-h)' }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span className="font-semibold text-sm leading-tight" style={{ color: 'var(--text)' }}>
          {t.name}
        </span>
        <CategoryBadge category={t.category} />
      </div>

      {/* Body preview */}
      <div
        className="rounded-xl p-3 text-xs leading-relaxed mb-3 min-h-[52px] whitespace-pre-wrap break-words"
        style={{ background: 'var(--surface2)', color: 'var(--text-2)' }}
      >
        {bodyText.length > 140 ? bodyText.slice(0, 140) + '…' : bodyText}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2.5" style={{ borderTop: '1px solid var(--border)' }}>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>🌐 {t.language}</span>
        <span className="text-xs" style={{ color: 'var(--text-2)' }}>
          <span className="font-bold" style={{ color: 'var(--text)' }}>US$ {custo.toFixed(4)}</span>
          <span style={{ color: 'var(--text-3)' }}> /msg</span>
        </span>
      </div>

      {selected && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[#25D366] text-xs font-semibold">
          <span className="w-4 h-4 rounded-full bg-[#25D366] flex items-center justify-center text-black text-[10px]">✓</span>
          Selecionado
        </div>
      )}
    </button>
  )
}

function CategoryBadge({ category }: { category: string }) {
  if (category === 'UTILITY') {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
        style={{ background: 'rgba(37,211,102,.15)', color: '#25D366' }}>
        Utilidade
      </span>
    )
  }
  return (
    <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0"
      style={{ background: 'rgba(245,158,11,.15)', color: '#f59e0b' }}>
      Marketing
    </span>
  )
}
