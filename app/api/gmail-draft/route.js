import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REX_INTERNAL_SECRET = process.env.REX_INTERNAL_SECRET || 'rex-bondy-internal'

// Obtiene el refresh token del recruiter desde Supabase
async function getRefreshToken(recruiterEmail) {
  const res = await fetch(
    SUPABASE_URL + '/rest/v1/gmail_tokens?email=eq.' + encodeURIComponent(recruiterEmail) + '&select=refresh_token,access_token,expires_at',
    {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
      },
    }
  )
  const data = await res.json()
  return data?.[0] || null
}

// Refresca el access token usando el refresh token
async function refreshAccessToken(refreshToken) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('Error refreshing token: ' + JSON.stringify(data))
  return data.access_token
}

// Actualiza el access token en Supabase
async function updateAccessToken(email, accessToken) {
  await fetch(SUPABASE_URL + '/rest/v1/gmail_tokens?email=eq.' + encodeURIComponent(email), {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: accessToken, updated_at: new Date().toISOString() }),
  })
}

// Crea el draft en Gmail
async function createGmailDraft(accessToken, to, subject, htmlBody) {
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
      'Authorization': 'Bearer ' + accessToken,
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

export async function POST(req) {
  // Autenticación interna — solo Rex puede llamar este endpoint
  const authHeader = req.headers.get('x-rex-secret')
  if (authHeader !== REX_INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { recruiter_email, to, subject, html_body } = await req.json()

  if (!recruiter_email || !to || !subject || !html_body) {
    return NextResponse.json({ error: 'Missing fields: recruiter_email, to, subject, html_body' }, { status: 400 })
  }

  // 1. Obtener tokens del recruiter
  const tokenRow = await getRefreshToken(recruiter_email)
  if (!tokenRow) {
    return NextResponse.json({
      error: 'No hay token de Gmail para ' + recruiter_email + '. El recruiter necesita iniciar sesión en tools.wearebondy.com primero.',
    }, { status: 404 })
  }

  // 2. Obtener access token válido
  let accessToken = tokenRow.access_token
  const isExpired = !tokenRow.expires_at || Date.now() / 1000 > tokenRow.expires_at - 60
  if (isExpired) {
    accessToken = await refreshAccessToken(tokenRow.refresh_token)
    await updateAccessToken(recruiter_email, accessToken)
  }

  // 3. Crear draft en el Gmail del recruiter
  const draft = await createGmailDraft(accessToken, to, subject, html_body)

  return NextResponse.json({
    ok: true,
    draft_id: draft.id,
    message: 'Draft creado en el Gmail de ' + recruiter_email,
  })
}
