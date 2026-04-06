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

// GET /api/agendamentos — list scheduled dispatches
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('disparos_agendados')
    .select('*')
    .order('scheduled_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/agendamentos — create new scheduled dispatch
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { template, linguagem, quantidade, scheduled_at } = body

  if (!template || !linguagem || !quantidade || !scheduled_at) {
    return NextResponse.json({ error: 'Campos obrigatórios: template, linguagem, quantidade, scheduled_at' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('disparos_agendados')
    .insert({ template, linguagem, quantidade, scheduled_at, status: 'pendente' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// DELETE /api/agendamentos?id=xxx
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = await createClient()
  const { error } = await supabase.from('disparos_agendados').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
