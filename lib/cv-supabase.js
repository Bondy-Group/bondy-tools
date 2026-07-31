// lib/cv-supabase.js
// Sube el CV en PDF a un bucket privado de Supabase Storage y devuelve una URL
// firmada temporal. Airtable la usa para ingerir el archivo (queda como adjunto
// nativo en la tabla); después la URL firmada se vence, así el CV no queda expuesto.

import { getSupabaseAdmin } from '@/lib/supabase'

const BUCKET = 'cvs'

export async function uploadCvToSupabase({ base64, filename }) {
  const supa = getSupabaseAdmin()
  const safe = (filename || 'CV.pdf').replace(/[^\w.\- ]/g, '_')
  const path = `${Date.now()}-${safe}`
  const buf = Buffer.from(base64, 'base64')

  const up = await supa.storage.from(BUCKET).upload(path, buf, {
    contentType: 'application/pdf',
    upsert: false,
  })
  if (up.error) throw new Error(`Supabase upload: ${up.error.message}`)

  // URL firmada por 1 hora: suficiente para que Airtable la ingiera y re-hostee.
  const signed = await supa.storage.from(BUCKET).createSignedUrl(path, 3600)
  if (signed.error || !signed.data?.signedUrl) {
    throw new Error(`Supabase signed URL: ${signed.error?.message || 'sin url'}`)
  }
  return { url: signed.data.signedUrl, path }
}
