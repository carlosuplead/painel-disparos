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

export async function GET(request: NextRequest) {
  const code  = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  const base = new URL(request.url).origin

  if (error || !code) {
    return NextResponse.redirect(`${base}/?google=error`)
  }

  // Troca o code pelos tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
      grant_type:    'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()

  if (!tokens.access_token) {
    return NextResponse.redirect(`${base}/?google=error`)
  }

  // Salva no Supabase (não sobrescreve refresh_token se Google não devolveu um novo)
  const supabase = await createClient()
  const upsertData: Record<string, unknown> = {
    id:           1,
    access_token: tokens.access_token,
    expires_at:   Date.now() + (tokens.expires_in ?? 3600) * 1000,
    updated_at:   new Date().toISOString(),
  }
  if (tokens.refresh_token) {
    upsertData.refresh_token = tokens.refresh_token
  }
  await supabase.from('google_tokens').upsert(upsertData)

  return NextResponse.redirect(`${base}/?google=connected`)
}
