import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      `https://api.notificame.com.br/v1/templates/${process.env.NOTIFICAME_CHANNEL}`,
      {
        headers: { 'X-Api-Token': process.env.NOTIFICAME_TOKEN! },
        cache: 'no-store',
      }
    )
    if (!res.ok) return NextResponse.json({ error: 'Erro ao buscar templates' }, { status: res.status })
    const data = await res.json()
    const payload = Array.isArray(data) ? data[0] : data
    const templates = payload?.data ?? []
    return NextResponse.json(templates)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const name = request.nextUrl.searchParams.get('name')
    if (!name) return NextResponse.json({ error: 'Nome do template obrigatório.' }, { status: 400 })

    const res = await fetch(
      `https://api.notificame.com.br/v2/channels/whatsapp/templates/${process.env.NOTIFICAME_CHANNEL}/${encodeURIComponent(name)}`,
      {
        method: 'DELETE',
        headers: { 'X-Api-Token': process.env.NOTIFICAME_TOKEN! },
      }
    )
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const templateData = await request.json()
    const res = await fetch(
      `https://api.notificame.com.br/v1/templates/${process.env.NOTIFICAME_CHANNEL}`,
      {
        method: 'POST',
        headers: {
          'X-Api-Token': process.env.NOTIFICAME_TOKEN!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.NOTIFICAME_CHANNEL,
          contents: [{ template: templateData }],
        }),
      }
    )
    const data = await res.json()
    if (!res.ok) return NextResponse.json({ error: data }, { status: res.status })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
