import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const res = await fetch(
      `https://api.notificame.com.br/v1/templates/${process.env.NOTIFICAME_CHANNEL}`,
      {
        headers: { 'X-Api-Token': process.env.NOTIFICAME_TOKEN! },
        cache: 'no-store',
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Erro ao buscar templates' }, { status: res.status })
    }

    const data = await res.json()
    // A API retorna array com um objeto { data: [...], paging: {...} }
    const payload = Array.isArray(data) ? data[0] : data
    const templates = payload?.data ?? []

    return NextResponse.json(templates)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
