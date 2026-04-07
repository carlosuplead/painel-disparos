import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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

// Supabase cron uses POST (net.http_post), Vercel cron uses GET — handle both
export async function POST(request: NextRequest) { return GET(request) }

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret') ?? new URL(request.url).searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()

  // Horário BRL = UTC - 3h (sem depender de locale do servidor)
  const brlNow = new Date(Date.now() - 3 * 60 * 60 * 1000)
  const nowBRL = brlNow.toISOString().slice(0, 19).replace('T', ' ') // "2026-04-06 21:58:47"

  // ── ATOMIC CLAIM: muda status para 'processando' antes de disparar ──
  // Garante que mesmo se dois crons rodarem ao mesmo tempo,
  // cada agendamento só vai ser disparado UMA VEZ.
  const { data: claimed, error: claimError } = await supabase
    .from('disparos_agendados')
    .update({ status: 'processando', fired_at: nowBRL })
    .eq('status', 'pendente')
    .lte('scheduled_at', nowBRL)
    .select()

  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 })
  if (!claimed || claimed.length === 0) return NextResponse.json({ fired: 0 })

  const n8nUrl = process.env.N8N_WEBHOOK_DISPARO ?? process.env.NEXT_PUBLIC_N8N_WEBHOOK_DISPARO ?? ''
  const results: { id: string; status: string }[] = []

  for (const item of claimed) {
    try {
      const res = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: item.template, linguagem: item.linguagem, quantidade: item.quantidade }),
      })

      const newStatus = res.ok ? 'disparado' : 'erro'
      await supabase
        .from('disparos_agendados')
        .update({ status: newStatus })
        .eq('id', item.id)

      results.push({ id: item.id, status: newStatus })
    } catch {
      await supabase
        .from('disparos_agendados')
        .update({ status: 'erro' })
        .eq('id', item.id)
      results.push({ id: item.id, status: 'erro' })
    }
  }

  return NextResponse.json({ fired: results.length, results })
}
