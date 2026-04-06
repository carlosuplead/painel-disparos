import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// This endpoint is called by Vercel Cron (or external cron-job.org)
// It checks for pending scheduled dispatches that are due and fires the n8n webhook

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
  // Optional: verify cron secret to prevent unauthorized calls
  const secret = request.headers.get('x-cron-secret') ?? new URL(request.url).searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const now = new Date().toISOString()

  // Find pending dispatches that are due
  const { data: pending, error } = await supabase
    .from('disparos_agendados')
    .select('*')
    .eq('status', 'pendente')
    .lte('scheduled_at', now)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pending || pending.length === 0) return NextResponse.json({ fired: 0 })

  const n8nUrl = process.env.N8N_WEBHOOK_DISPARO ?? process.env.NEXT_PUBLIC_N8N_WEBHOOK_DISPARO ?? ''
  const results: { id: string; status: string }[] = []

  for (const item of pending) {
    try {
      const res = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: item.template, linguagem: item.linguagem, quantidade: item.quantidade }),
      })

      const newStatus = res.ok ? 'disparado' : 'erro'
      await supabase
        .from('disparos_agendados')
        .update({ status: newStatus, fired_at: new Date().toISOString() })
        .eq('id', item.id)

      results.push({ id: item.id, status: newStatus })
    } catch {
      await supabase
        .from('disparos_agendados')
        .update({ status: 'erro', fired_at: new Date().toISOString() })
        .eq('id', item.id)
      results.push({ id: item.id, status: 'erro' })
    }
  }

  return NextResponse.json({ fired: results.length, results })
}
