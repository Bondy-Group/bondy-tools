/**
 * lib/gmail.js
 * Helpers compartidos para operaciones de Gmail (draft creation, token management).
 * Usados por /api/gmail-draft y /api/gmail/create-draft
 */

const SUPABASE_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'

/** Obtiene los tokens de un recruiter desde Supabase */
export async function getRecruiterTokens(email) {
  const res = await fetch(
    SUPABASE_URL + '/rest/v1/gmail_tokens?email=eq.' + encodeURIComponent(email) + '&select=refresh_token,access_token,expires_at',
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: 'Bearer ' + SUPABASE_KEY,
      },
    }
  )
  const data = await res.json()
  return data?.[0] || null
}

/** Refresca el access token con el refresh token */
export async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('Token refresh failed: ' + JSON.stringify(data))
  return data.access_token
}

/** Persiste el access token actualizado en Supabase */
export async function updateAccessToken(email, accessToken) {
  await fetch(SUPABASE_URL + '/rest/v1/gmail_tokens?email=eq.' + encodeURIComponent(email), {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: accessToken, updated_at: new Date().toISOString() }),
  })
}

/** Obtiene un access token válido (refresca si es necesario) */
export async function getValidAccessToken(recruiterEmail) {
  const tokenRow = await getRecruiterTokens(recruiterEmail)
  if (!tokenRow) {
    throw new Error(
      `No hay token de Gmail para ${recruiterEmail}. El recruiter necesita visitar tools.wearebondy.com/gmail/connect`
    )
  }

  let { access_token, refresh_token, expires_at } = tokenRow
  const isExpired = !expires_at || Date.now() / 1000 > expires_at - 60
  if (isExpired) {
    access_token = await refreshAccessToken(refresh_token)
    await updateAccessToken(recruiterEmail, access_token)
  }

  return access_token
}

/** Crea un draft en el Gmail del recruiter */
export async function createGmailDraft(accessToken, to, subject, htmlBody) {
  const emailLines = [
    'To: ' + to,
    'Subject: ' + subject,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
  ]
  const raw = Buffer.from(emailLines.join('\r\n')).toString('base64url')

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: { raw } }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error('Gmail API error: ' + err)
  }
  return res.json()
}
