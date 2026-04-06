import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Brazil is UTC-3
const BRL_OFFSET_HOURS = 3

function toBRLDate(dateStr: string, endOfDay = false): string {
  const d = new Date(dateStr)
  d.setUTCHours(endOfDay ? 26 : 3, 0, 0, 0) // BRL midnight → UTC
  return d.toISOString()
}

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs) => { try { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // start/end are YYYY-MM-DD in BRL timezone
  const startDate = searchParams.get('start') ?? new Date().toISOString().slice(0, 10)
  const endDate   = searchParams.get('end')   ?? startDate

  const startUTC = toBRLDate(startDate, false)
  const endUTC   = toBRLDate(endDate, true)

  const supabase = await createClient()

  // ── 1. DISPARADOS: distinct session_ids com mensagem 'ai' no período ──
  const { data: aiRows } = await supabase
    .from('voomp_conversas')
    .select('session_id')
    .gte('created_at', startUTC)
    .lt('created_at', endUTC)
    .filter('message->>type', 'eq', 'ai')

  const disparadosSessions = new Set(aiRows?.map(r => r.session_id) ?? [])
  const disparados = disparadosSessions.size

  // ── 2. RESPONDERAM: sessões do período que têm msg 'human' ──
  let responderam = 0
  if (disparadosSessions.size > 0) {
    const sessionList = [...disparadosSessions]

    // Batch em chunks de 500 para não estourar o .in()
    const CHUNK = 500
    const humanSessions = new Set<string>()

    for (let i = 0; i < sessionList.length; i += CHUNK) {
      const chunk = sessionList.slice(i, i + CHUNK)
      const { data: humanRows } = await supabase
        .from('voomp_conversas')
        .select('session_id')
        .in('session_id', chunk)
        .filter('message->>type', 'eq', 'human')

      humanRows?.forEach(r => humanSessions.add(r.session_id))
    }

    responderam = humanSessions.size
  }

  // ── 3. PAUSADOS: IA-VOOMP onde pausado = true ──
  const { count: pausados } = await supabase
    .from('IA-VOOMP')
    .select('*', { count: 'exact', head: true })
    .eq('pausado', true)

  // ── 4. AGENDADOS: Voomp-Agendamentos-Otto com recebeu-disparo = SIM_RECEBEU ──
  // Filtra por data_definida dentro do período OU por timestamp
  const { count: agendados } = await supabase
    .from('Voomp-Agendamentos-Otto')
    .select('*', { count: 'exact', head: true })
    .eq('recebeu-disparo', 'SIM_RECEBEU')
    .gte('timestamp', startUTC)
    .lt('timestamp', endUTC)

  // ── 5. TOTAL AGENDAMENTOS HISTÓRICO (para comparação) ──
  const { count: totalAgendados } = await supabase
    .from('Voomp-Agendamentos-Otto')
    .select('*', { count: 'exact', head: true })
    .eq('recebeu-disparo', 'SIM_RECEBEU')

  // ── Taxas ──
  const taxaResposta   = disparados > 0 ? ((responderam / disparados) * 100).toFixed(1) : '0'
  const taxaAgendamento = responderam > 0 ? ((agendados ?? 0) / responderam * 100).toFixed(1) : '0'

  return NextResponse.json({
    periodo:          { start: startDate, end: endDate },
    disparados,
    responderam,
    pausados:         pausados ?? 0,
    agendados:        agendados ?? 0,
    totalAgendados:   totalAgendados ?? 0,
    taxaResposta,
    taxaAgendamento,
  })
}
