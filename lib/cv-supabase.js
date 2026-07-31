// lib/cv-supabase.js
// Sube el CV a un bucket privado de Supabase Storage usando la REST API directa
// (sin supabase-js, que daba "fetch failed" en este contexto) y devuelve una URL
// firmada temporal. Airtable la usa para ingerir el archivo como adjunto nativo;
// después la URL se vence, así el CV no queda expuesto.

const SUPA_URL = process.env.CV_SUPABASE_URL || 'https://tchppyxhapxtjemxrbqm.supabase.co'
const BUCKET = 'cvs'

export async function uploadCvToSupabase({ base64, filename }) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY missing')

  const safe = (filename || 'CV.pdf').replace(/[^\w.\- ]/g, '_')
  const path = `${Date.now()}-${safe}`
  const buf = Buffer.from(base64, 'base64')

  const up = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/pdf', 'x-upsert': 'false' },
    body: buf,
  })
  if (!up.ok) throw new Error(`Supabase upload ${up.status}: ${(await up.text()).slice(0, 150)}`)

  const sign = await fetch(`${SUPA_URL}/storage/v1/object/sign/${BUCKET}/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: 3600 }),
  })
  if (!sign.ok) throw new Error(`Supabase sign ${sign.status}: ${(await sign.text()).slice(0, 150)}`)

  const data = await sign.json()
  return { url: `${SUPA_URL}/storage/v1${data.signedURL}`, path }
}
