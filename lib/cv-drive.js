// lib/cv-drive.js
// Sube un CV en PDF a la carpeta de Drive de Bondy (compartida con el equipo,
// no pública) y devuelve el link para guardar en Airtable.
// Reusa el patrón de auth por service account de lib/google-docs.js.

const SCOPES = 'https://www.googleapis.com/auth/drive'

function parseServiceAccount() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_JSON')
  // Puede estar guardada en base64 o como JSON crudo. Probamos ambos.
  try { return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) } catch {}
  try { return JSON.parse(raw) } catch {}
  throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON no es base64-JSON ni JSON válido')
}

async function getAccessToken() {
  const sa = parseServiceAccount()
  const now = Math.floor(Date.now() / 1000)
  const enc = (o) =>
    Buffer.from(JSON.stringify(o)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const headerB64 = enc({ alg: 'RS256', typ: 'JWT' })
  const payloadB64 = enc({
    iss: sa.client_email,
    scope: SCOPES,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })
  const signingInput = `${headerB64}.${payloadB64}`
  const crypto = await import('crypto')
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signingInput, 'utf8')
  const signatureB64 = sign.sign(sa.private_key, 'base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const jwt = `${signingInput}.${signatureB64}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Google auth failed: ${JSON.stringify(data).slice(0, 200)}`)
  return data.access_token
}

// Sube un PDF (base64) a Drive. Devuelve { link, id }.
export async function uploadCvToDrive({ base64, filename }) {
  const token = await getAccessToken()
  // Carpeta "candidatos" en el Drive de Bondy. Debe estar compartida con la
  // cuenta de servicio (permiso de editor) para que pueda subir ahí.
  const folderId = process.env.CV_DRIVE_FOLDER_ID || '1yoWb-jVpLczmnuYmptT2zYoZcf1Y0vkQ'
  const boundary = 'bondycv' + Math.floor(Math.random() * 1e9).toString(36)
  const meta = { name: filename || 'CV.pdf', mimeType: 'application/pdf' }
  if (folderId) meta.parents = [folderId]
  const fileBuf = Buffer.from(base64, 'base64')
  const pre = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
    'utf8'
  )
  const post = Buffer.from(`\r\n--${boundary}--`, 'utf8')
  const body = Buffer.concat([pre, fileBuf, post])

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.id) {
    let saEmail = '?'
    try { saEmail = parseServiceAccount().client_email } catch {}
    throw new Error(`Drive upload failed (compartir la carpeta con ${saEmail} como editor): ${JSON.stringify(data).slice(0, 150)}`)
  }
  return { link: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`, id: data.id }
}
