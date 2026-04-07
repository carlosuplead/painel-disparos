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

async function getValidToken(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data } = await supabase.from('google_tokens').select('*').eq('id', 1).single()
  if (!data) return null

  // Token ainda válido
  if (data.expires_at && Date.now() < data.expires_at - 60000) {
    return data.access_token
  }

  // Refresh token
  if (!data.refresh_token) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: data.refresh_token,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type:    'refresh_token',
    }),
  })

  const tokens = await res.json()
  if (!tokens.access_token) return null

  await supabase.from('google_tokens').update({
    access_token: tokens.access_token,
    expires_at:   Date.now() + (tokens.expires_in ?? 3600) * 1000,
    updated_at:   new Date().toISOString(),
  }).eq('id', 1)

  return tokens.access_token
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') ?? new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' })

  const supabase = await createClient()
  const token = await getValidToken(supabase)

  if (!token) {
    return NextResponse.json({ connected: false, events: [] })
  }

  // Dia inteiro em BRL (UTC-3)
  const timeMin = `${date}T00:00:00-03:00`
  const timeMax = `${date}T23:59:59-03:00`

  // Busca todos os calendários do usuário
  const calListRes = await fetch(
    'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=50',
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!calListRes.ok) {
    return NextResponse.json({ connected: false, events: [] })
  }

  const calListData = await calListRes.json()
  const calendars: { id: string; summary: string; backgroundColor: string }[] =
    (calListData.items ?? []).filter((c: any) => c.selected !== false)

  // Busca eventos de todos os calendários em paralelo
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   '50',
  })

  const results = await Promise.all(
    calendars.map(async (cal) => {
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) return []
      const data = await res.json()
      return (data.items ?? []).map((e: any) => {
        // Extrai link de videoconferência: hangoutLink, conferenceData ou URL na descrição/localização
        const conferenceLink =
          e.hangoutLink ??
          e.conferenceData?.entryPoints?.find((ep: any) => ep.entryPointType === 'video')?.uri ??
          null

        const stripHtml = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&#?\w+;/g, ' ')
        const descText: string = stripHtml(e.description ?? '')
        const locText: string  = e.location ?? ''
        const urlMatch = (descText + ' ' + locText).match(/https?:\/\/[^\s<>"]+(?:meet\.google\.com|zoom\.us|teams\.microsoft\.com|whereby\.com|meet\.jit\.si)[^\s<>"]*/)
        const videoLink = conferenceLink ?? urlMatch?.[0] ?? null

        return {
          id:            `${cal.id}::${e.id}`,
          title:         e.summary ?? '(sem título)',
          start:         e.start?.dateTime ?? e.start?.date,
          end:           e.end?.dateTime ?? e.end?.date,
          description:   e.description ?? null,
          attendees:     (e.attendees ?? []).map((a: any) => ({ email: a.email, name: a.displayName ?? null, self: a.self ?? false })),
          location:      e.location ?? null,
          link:          videoLink,
          calendarName:  cal.summary,
          calendarColor: cal.backgroundColor ?? '#4285F4',
          calendarId:    cal.id,
        }
      })
    })
  )

  // Mescla e ordena por horário de início
  const events = results.flat().sort((a, b) => {
    if (!a.start) return 1
    if (!b.start) return -1
    return a.start.localeCompare(b.start)
  })

  return NextResponse.json({ connected: true, events })
}
