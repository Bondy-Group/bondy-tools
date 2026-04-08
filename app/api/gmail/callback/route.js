import { NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const BASE_URL = process.env.NEXTAUTH_URL || 'https://tools.wearebondy.com'
const REDIRECT_URI = BASE_URL + '/api/gmail/callback'

const SUPABASE_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'

async function exchangeCodeForTokens(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
      code,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('Token exchange failed: ' + JSON.stringify(data))
  return data
}

async function saveTokenToSupabase(email, refreshToken, accessToken, expiresIn) {
  const expiresAt = Math.floor(Date.now() / 1000) + (expiresIn || 3600)

  const res = await fetch(SUPABASE_URL + '/rest/v1/gmail_tokens', {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      email,
      refresh_token: refreshToken,
      access_token: accessToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error('Supabase save failed: ' + err)
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // El usuario canceló o hubo error en Google
  if (error) {
    const reason = encodeURIComponent(error)
    return NextResponse.redirect(BASE_URL + '/gmail/connect?error=' + reason)
  }

  if (!code || !state) {
    return NextResponse.redirect(BASE_URL + '/gmail/connect?error=missing_params')
  }

  // Decodificar state para obtener el recruiter email
  let recruiterEmail
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    recruiterEmail = decoded.recruiter
  } catch {
    return NextResponse.redirect(BASE_URL + '/gmail/connect?error=invalid_state')
  }

  if (!recruiterEmail) {
    return NextResponse.redirect(BASE_URL + '/gmail/connect?error=no_recruiter_in_state')
  }

  // Intercambiar code por tokens
  let tokens
  try {
    tokens = await exchangeCodeForTokens(code)
  } catch (err) {
    console.error('[gmail/callback] Token exchange error:', err.message)
    return NextResponse.redirect(BASE_URL + '/gmail/connect?error=token_exchange_failed')
  }

  const { access_token, refresh_token, expires_in } = tokens

  if (!refresh_token) {
    // Esto no debería pasar con prompt=consent, pero por las dudas
    console.error('[gmail/callback] No refresh_token received for', recruiterEmail)
    return NextResponse.redirect(BASE_URL + '/gmail/connect?error=no_refresh_token')
  }

  // Guardar en Supabase
  try {
    await saveTokenToSupabase(recruiterEmail, refresh_token, access_token, expires_in)
    console.log('[gmail/callback] Token guardado para', recruiterEmail)
  } catch (err) {
    console.error('[gmail/callback] Supabase error:', err.message)
    return NextResponse.redirect(BASE_URL + '/gmail/connect?error=supabase_save_failed')
  }

  // Éxito — redirigir a la página de confirmación
  const successEmail = encodeURIComponent(recruiterEmail)
  return NextResponse.redirect(BASE_URL + '/gmail/connect?success=true&email=' + successEmail)
}
