import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ALLOWED_IMAGE = ['image/jpeg', 'image/jpg', 'image/png']
const ALLOWED_VIDEO = ['video/mp4']
const MAX_IMAGE = 5  * 1024 * 1024  // 5MB
const MAX_VIDEO = 16 * 1024 * 1024  // 16MB

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

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const type = formData.get('type') as string // 'image' | 'video'

  if (!file) return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 })

  const isImage   = type === 'image'
  const allowed   = isImage ? ALLOWED_IMAGE : ALLOWED_VIDEO
  const maxSize   = isImage ? MAX_IMAGE : MAX_VIDEO
  const fmtLabel  = isImage ? 'JPG ou PNG' : 'MP4'

  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: `Formato inválido. Use ${fmtLabel}.` }, { status: 400 })
  }
  if (file.size > maxSize) {
    return NextResponse.json({ error: `Arquivo muito grande. Máximo: ${isImage ? '5MB' : '16MB'}.` }, { status: 400 })
  }

  const ext      = file.name.split('.').pop() ?? (isImage ? 'jpg' : 'mp4')
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const path     = `${isImage ? 'images' : 'videos'}/${filename}`

  const buffer  = new Uint8Array(await file.arrayBuffer())
  const supabase = await createClient()

  const { error } = await supabase.storage
    .from('template-media')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage
    .from('template-media')
    .getPublicUrl(path)

  return NextResponse.json({ url: publicUrl })
}
