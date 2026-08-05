// lib/cv-supabase.js
// Sube el CV a un bucket privado de Supabase Storage usando la REST API directa
// y devuelve una URL firmada. Airtable la usa para ingerir el archivo como
// adjunto nativo (intake) y para guardar el link en la Base General.
//
// IMPORTANTE: el bucket `cvs` vive en el proyecto SCRAPER (tchppyxhapxtjemxrbqm),
// NO en el proyecto main de bondy-tools (ejvjpjwcbxicbknrbddb). Por eso usamos las
// mismas env vars dedicadas que el job board (lib/job-board.js) y NO
// SUPABASE_SERVICE_ROLE_KEY, que es la key del proyecto main y da
// "signature verification failed" contra este bucket.

const SUPA_URL = (
  process.env.CV_SUPABASE_URL ||
  process.env.JOB_BOARD_SUPABASE_URL ||
  process.env.SCRAPER_SUPABASE_URL ||
  'https://tchppyxhapxtjemxrbqm.supabase.co'
).trim()

const SERVICE_KEY = (
  process.env.CV_SUPABASE_KEY ||
  process.env.JOB_BOARD_SUPABASE_SERVICE_KEY ||
  process.env.SCRAPER_SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ''
).trim()

const BUCKET = 'cvs'

// expiresIn: segundos de validez de la URL firmada. Default 1h (para ingestión
// inmediata a Airtable). Pasar un valor largo cuando el link se guarda como
// referencia persistente (ej: campo CV de la Base General).
export async function uploadCvToSupabase({ base64, filename, expiresIn = 3600 }) {
  if (!SERVICE_KEY) throw new Error('CV Supabase service key missing (JOB_BOARD_SUPABASE_SERVICE_KEY)')

  const safe = (filename || 'CV.pdf').replace(/[^\w.\- ]/g, '_')
  const path = `${Date.now()}-${safe}`
  const buf = Buffer.from(base64, 'base64')

  const up = await fetch(`${SUPA_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/pdf', 'x-upsert': 'false' },
    body: buf,
  })
  if (!up.ok) throw new Error(`Supabase upload ${up.status}: ${(await up.text()).slice(0, 150)}`)

  const sign = await fetch(`${SUPA_URL}/storage/v1/object/sign/${BUCKET}/${encodeURIComponent(path)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn }),
  })
  if (!sign.ok) throw new Error(`Supabase sign ${sign.status}: ${(await sign.text()).slice(0, 150)}`)

  const data = await sign.json()
  return { url: `${SUPA_URL}/storage/v1${data.signedURL}`, path }
}
