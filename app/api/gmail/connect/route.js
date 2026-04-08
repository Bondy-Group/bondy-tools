import { NextResponse } from 'next/server'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const BASE_URL = process.env.NEXTAUTH_URL || 'https://tools.wearebondy.com'
const REDIRECT_URI = BASE_URL + '/api/gmail/callback'

// Scopes mínimos: solo compose (no se necesita send ni read)
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.compose',
  'email',
  'profile',
].join(' ')

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const recruiterEmail = searchParams.get('recruiter')

  if (!recruiterEmail) {
    return NextResponse.json(
      { error: 'Falta el parámetro "recruiter" (ej: ?recruiter=lucia@wearebondy.com)' },
      { status: 400 }
    )
  }

  if (!GOOGLE_CLIENT_ID) {
    return NextResponse.json(
      { error: 'GOOGLE_CLIENT_ID no configurado en env vars' },
      { status: 500 }
    )
  }

  // Encode recruiter email en el state para recuperarlo en el callback
  const state = Buffer.from(JSON.stringify({ recruiter: recruiterEmail })).toString('base64url')

  const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  oauthUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
  oauthUrl.searchParams.set('redirect_uri', REDIRECT_URI)
  oauthUrl.searchParams.set('response_type', 'code')
  oauthUrl.searchParams.set('scope', SCOPES)
  oauthUrl.searchParams.set('access_type', 'offline')
  oauthUrl.searchParams.set('prompt', 'consent')
  oauthUrl.searchParams.set('state', state)
  // login_hint prefillea el email en la pantalla de Google
  oauthUrl.searchParams.set('login_hint', recruiterEmail)

  return NextResponse.redirect(oauthUrl.toString())
}
