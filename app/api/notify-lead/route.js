import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const NOTIFY_LEAD_SECRET = process.env.NOTIFY_LEAD_SECRET || 'bondy-notify-lead-internal'
const NOTIFY_EMAIL_TO = 'hello@wearebondy.com'
const SENDER_EMAIL = 'mara@wearebondy.com'

async function getRefreshToken(email) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(email)}&select=refresh_token,access_token,expires_at`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  )
  const data = await res.json()
  return data?.[0] || null
}

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

async function updateAccessToken(email, accessToken) {
  await fetch(`${SUPABASE_URL}/rest/v1/gmail_tokens?email=eq.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ access_token: accessToken, updated_at: new Date().toISOString() }),
  })
}

async function buildRawEmail(to, subject, htmlBody, fromEmail) {
  const emailLines = [
    `From: Bondy Leads <${fromEmail}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    htmlBody,
  ]
  return Buffer.from(emailLines.join('\r\n')).toString('base64url')
}

// Crea un draft y luego lo envía (funciona con gmail.compose scope)
async function sendEmail(accessToken, to, subject, htmlBody, fromEmail) {
  const raw = await buildRawEmail(to, subject, htmlBody, fromEmail)

  // Paso 1: crear el draft
  const draftRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: { raw } }),
  })

  if (!draftRes.ok) {
    const err = await draftRes.text()
    throw new Error('Gmail draft creation error: ' + err)
  }

  const draft = await draftRes.json()
  const draftId = draft.id

  // Paso 2: enviar el draft
  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id: draftId }),
  })

  if (!sendRes.ok) {
    const err = await sendRes.text()
    throw new Error('Gmail draft send error: ' + err)
  }

  return sendRes.json()
}

function buildEmailHtml(lead) {
  const { name, email, company, role, service, message, created_at } = lead

  const date = new Date(created_at || Date.now()).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'full',
    timeStyle: 'short',
  })

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Lead — Bondy</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #1a1a1a; padding: 24px 32px; }
    .header h1 { color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.3px; }
    .header p { color: #888; margin: 4px 0 0; font-size: 13px; }
    .body { padding: 32px; }
    .field { margin-bottom: 20px; }
    .field label { display: block; font-size: 11px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .field value { display: block; font-size: 15px; color: #1a1a1a; }
    .message-box { background: #f8f8f8; border-left: 3px solid #1a1a1a; padding: 16px 20px; border-radius: 0 6px 6px 0; margin-top: 4px; }
    .message-box p { margin: 0; font-size: 15px; color: #333; line-height: 1.6; white-space: pre-wrap; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    .footer { padding: 20px 32px; background: #fafafa; border-top: 1px solid #eee; }
    .footer p { margin: 0; font-size: 12px; color: #aaa; }
    .badge { display: inline-block; background: #1a1a1a; color: #fff; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px; margin-bottom: 20px; }
    a { color: #1a1a1a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 New Lead — ${name}</h1>
      <p>${date}</p>
    </div>
    <div class="body">
      <span class="badge">wearebondy.com</span>

      <div class="field">
        <label>Nombre</label>
        <value>${name || '—'}</value>
      </div>

      <div class="field">
        <label>Email</label>
        <value><a href="mailto:${email}">${email || '—'}</a></value>
      </div>

      ${company ? `
      <div class="field">
        <label>Empresa</label>
        <value>${company}</value>
      </div>` : ''}

      ${role ? `
      <div class="field">
        <label>Rol / Cargo</label>
        <value>${role}</value>
      </div>` : ''}

      ${service ? `
      <div class="field">
        <label>Servicio de interés</label>
        <value>${service}</value>
      </div>` : ''}

      <hr class="divider">

      <div class="field">
        <label>Mensaje</label>
        <div class="message-box">
          <p>${message || '—'}</p>
        </div>
      </div>
    </div>
    <div class="footer">
      <p>Este email fue generado automáticamente por el sistema de leads de Bondy.</p>
    </div>
  </div>
</body>
</html>
  `.trim()
}

export async function POST(req) {
  // Autenticación interna
  const authHeader = req.headers.get('x-notify-secret')
  if (authHeader !== NOTIFY_LEAD_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let lead
  try {
    lead = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, email, message } = lead
  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Missing required fields: name, email, message' }, { status: 400 })
  }

  // Obtener token de Gmail del sender (mara@wearebondy.com)
  const tokenRow = await getRefreshToken(SENDER_EMAIL)
  if (!tokenRow) {
    // Fallback: si no hay token, logueamos el error pero no rompemos
    console.error(`[notify-lead] No Gmail token for ${SENDER_EMAIL}. Mara needs to log in at tools.wearebondy.com first.`)
    return NextResponse.json({
      error: `No Gmail token for ${SENDER_EMAIL}. Please log in at tools.wearebondy.com to authorize email sending.`,
      lead_received: true,
    }, { status: 503 })
  }

  // Refrescar access token si expiró
  let accessToken = tokenRow.access_token
  const isExpired = !tokenRow.expires_at || Date.now() / 1000 > tokenRow.expires_at - 60
  if (isExpired) {
    try {
      accessToken = await refreshAccessToken(tokenRow.refresh_token)
      await updateAccessToken(SENDER_EMAIL, accessToken)
    } catch (err) {
      console.error('[notify-lead] Token refresh failed:', err.message)
      return NextResponse.json({ error: 'Token refresh failed: ' + err.message }, { status: 500 })
    }
  }

  // Construir y enviar email
  const subject = `New lead: ${name}`
  const htmlBody = buildEmailHtml(lead)

  try {
    const result = await sendEmail(accessToken, NOTIFY_EMAIL_TO, subject, htmlBody, SENDER_EMAIL)
    console.log(`[notify-lead] Email sent. messageId=${result.id}`)
    return NextResponse.json({ ok: true, message_id: result.id })
  } catch (err) {
    console.error('[notify-lead] Send failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
