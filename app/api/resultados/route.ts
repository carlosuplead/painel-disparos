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


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('start') ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })
  const endDate   = searchParams.get('end')   ?? startDate

  const startUTC = toBRLDate(startDate, false)
  const endUTC   = toBRLDate(endDate, true)

  const supabase = await createClient()

  // ── 1. DISPARADOS: sessões distintas com msg 'ai' no período ──
  const { data: dispData, error: dispError } = await supabase.rpc('count_disparados', {
    start_utc: startUTC,
    end_utc: endUTC,
  })
  const disparados: number = dispData ?? 0

  // ── 2. RESPONDERAM: leads na IA-VOOMP com Timestamp no período ──
  // Timestamp é atualizado sempre que o lead responde → conta quem interagiu no período
  const { count: respCount, error: respError } = await supabase
    .from('IA-VOOMP')
    .select('*', { count: 'exact', head: true })
    .gte('Timestamp', startDate)
    .lte('Timestamp', endDate + 'T23:59:59')
  const responderam: number = respCount ?? 0

  // ── 3. FINALIZADOS PELA IA: pausado = 'true', filtrado por Timestamp (texto ISO) no período BRL ──
  const { count: pausados } = await supabase
    .from('IA-VOOMP')
    .select('*', { count: 'exact', head: true })
    .eq('pausado', 'true')
    .gte('Timestamp', startDate)
    .lte('Timestamp', endDate + 'T23:59:59')

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
