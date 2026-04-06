import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Brazil UTC-3: BRL midnight = UTC 03:00
function toBRLDate(dateStr: string, endOfDay = false): string {
  const d = new Date(dateStr)
  // start: BRL 00:00 = UTC 03:00 same day
  // end:   BRL 23:59 = UTC 02:59+1 = UTC 03:00 next day => hour 27
  d.setUTCHours(endOfDay ? 27 : 3, 0, 0, 0)
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

/** Paginate a Supabase query that returns { session_id } rows, returning all unique IDs */
async function getAllSessions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tableName: string,
  startUTC: string,
  endUTC: string,
  typeFilter?: string,
): Promise<Set<string>> {
  const PAGE = 1000
  const sessions = new Set<string>()
  let from = 0

  while (true) {
    let q = supabase
      .from(tableName)
      .select('session_id')
      .gte('created_at', startUTC)
      .lt('created_at', endUTC)
      .range(from, from + PAGE - 1)

    if (typeFilter) q = q.filter('message->>type', 'eq', typeFilter)

    const { data, error } = await q
    if (error || !data || data.length === 0) break
    data.forEach((r: { session_id: string }) => sessions.add(r.session_id))
    if (data.length < PAGE) break
    from += PAGE
  }
  return sessions
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start') ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const endDate   = searchParams.get('end')   ?? startDate

  const startUTC = toBRLDate(startDate, false)
  const endUTC   = toBRLDate(endDate, true)

  const supabase = await createClient()

  // ── 1. DISPARADOS: distinct sessions with 'ai' message in period (all pages) ──
  const disparadosSessions = await getAllSessions(supabase, 'voomp_conversas', startUTC, endUTC, 'ai')
  const disparados = disparadosSessions.size

  // ── 2. RESPONDERAM: from disparados sessions, which also have a 'human' message ──
  let responderam = 0
  if (disparadosSessions.size > 0) {
    const sessionList = [...disparadosSessions]
    const humanSessions = new Set<string>()
    const CHUNK = 500

    for (let i = 0; i < sessionList.length; i += CHUNK) {
      const chunk = sessionList.slice(i, i + CHUNK)
      const { data } = await supabase
        .from('voomp_conversas')
        .select('session_id')
        .in('session_id', chunk)
        .filter('message->>type', 'eq', 'human')
      data?.forEach((r: { session_id: string }) => humanSessions.add(r.session_id))
    }
    responderam = humanSessions.size
  }

  // ── 3. PAUSADOS ──
  const { count: pausados } = await supabase
    .from('IA-VOOMP')
    .select('*', { count: 'exact', head: true })
    .eq('pausado', true)

  // ── 4. AGENDADOS no período ──
  const { count: agendados } = await supabase
    .from('Voomp-Agendamentos-Otto')
    .select('*', { count: 'exact', head: true })
    .eq('recebeu-disparo', 'SIM_RECEBEU')
    .gte('timestamp', startUTC)
    .lt('timestamp', endUTC)

  // ── 5. TOTAL AGENDAMENTOS histórico ──
  const { count: totalAgendados } = await supabase
    .from('Voomp-Agendamentos-Otto')
    .select('*', { count: 'exact', head: true })
    .eq('recebeu-disparo', 'SIM_RECEBEU')

  const taxaResposta    = disparados > 0 ? ((responderam / disparados) * 100).toFixed(1) : '0'
  const taxaAgendamento = responderam > 0 ? (((agendados ?? 0) / responderam) * 100).toFixed(1) : '0'

  return NextResponse.json({
    periodo: { start: startDate, end: endDate },
    disparados,
    responderam,
    pausados:       pausados ?? 0,
    agendados:      agendados ?? 0,
    totalAgendados: totalAgendados ?? 0,
    taxaResposta,
    taxaAgendamento,
  })
}
