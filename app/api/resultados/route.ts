import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Brazil UTC-3: BRL midnight = UTC 03:00
function toBRLDate(dateStr: string, endOfDay = false): string {
  const d = new Date(dateStr)
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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start') ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const endDate   = searchParams.get('end')   ?? startDate

  const startUTC = toBRLDate(startDate, false)
  const endUTC   = toBRLDate(endDate, true)

  const supabase = await createClient()

  const [
    { data: dispData },
    { data: respCount },
    { count: pausados },
    { count: agendados },
    { count: totalAgendados },
    { data: listaAgendados },
    { count: fup0 },
    { count: fup1 },
    { count: fup2 },
    { count: fup3plus },
  ] = await Promise.all([
    // 1. DISPARADOS
    supabase.rpc('count_disparados', { start_utc: startUTC, end_utc: endUTC }),

    // 2. RESPONDERAM
    supabase.rpc('count_responderam', { start_utc: startUTC, end_utc: endUTC }),

    // 3. FINALIZADOS PELA IA
    supabase.from('IA-VOOMP').select('*', { count: 'exact', head: true })
      .eq('pausado', 'true').gte('Timestamp', startUTC).lt('Timestamp', endUTC),

    // 4. AGENDADOS count
    supabase.from('Voomp-Agendamentos-Otto').select('*', { count: 'exact', head: true })
      .eq('recebeu-disparo', 'SIM_RECEBEU').gte('timestamp', startUTC).lt('timestamp', endUTC),

    // 5. TOTAL HISTÓRICO
    supabase.from('Voomp-Agendamentos-Otto').select('*', { count: 'exact', head: true })
      .eq('recebeu-disparo', 'SIM_RECEBEU'),

    // 6. LISTA AGENDADOS com dados
    supabase.from('Voomp-Agendamentos-Otto')
      .select('id, nome, email, telefone, data_definida, resumo, timestamp')
      .eq('recebeu-disparo', 'SIM_RECEBEU')
      .gte('timestamp', startUTC).lt('timestamp', endUTC)
      .order('timestamp', { ascending: false }),

    // 7. FOLLOWUP DISTRIBUTION
    supabase.from('IA-VOOMP').select('*', { count: 'exact', head: true })
      .eq('followup_count', 0).gte('Timestamp', startUTC).lt('Timestamp', endUTC),
    supabase.from('IA-VOOMP').select('*', { count: 'exact', head: true })
      .eq('followup_count', 1).gte('Timestamp', startUTC).lt('Timestamp', endUTC),
    supabase.from('IA-VOOMP').select('*', { count: 'exact', head: true })
      .eq('followup_count', 2).gte('Timestamp', startUTC).lt('Timestamp', endUTC),
    supabase.from('IA-VOOMP').select('*', { count: 'exact', head: true })
      .gte('followup_count', 3).gte('Timestamp', startUTC).lt('Timestamp', endUTC),
  ])

  const disparados: number = dispData ?? 0
  const responderam: number = respCount ?? 0

  const taxaResposta    = disparados > 0 ? ((responderam / disparados) * 100).toFixed(1) : '0'
  const taxaAgendamento = responderam > 0 ? (((agendados ?? 0) / responderam) * 100).toFixed(1) : '0'

  return NextResponse.json({
    periodo: { start: startDate, end: endDate },
    disparados,
    responderam,
    pausados:        pausados ?? 0,
    agendados:       agendados ?? 0,
    totalAgendados:  totalAgendados ?? 0,
    taxaResposta,
    taxaAgendamento,
    listaAgendados:  listaAgendados ?? [],
    followup: {
      f0: fup0 ?? 0,
      f1: fup1 ?? 0,
      f2: fup2 ?? 0,
      f3plus: fup3plus ?? 0,
    },
  })
}
