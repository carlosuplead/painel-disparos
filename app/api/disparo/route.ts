import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const n8nUrl = process.env.N8N_WEBHOOK_DISPARO ?? process.env.NEXT_PUBLIC_N8N_WEBHOOK_DISPARO ?? ''

    if (!n8nUrl) {
      return NextResponse.json({ error: 'URL do webhook não configurada' }, { status: 500 })
    }

    const res = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const text = await res.text()

    return new NextResponse(text, { status: res.status })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
