import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return htmlResponse(null, error ?? 'OAuth cancelled')
  }

  try {
    const baseUrl     = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    const redirectUri = `${baseUrl}/api/linkedin-oauth/callback`

    // Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        client_id:     process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    })
    const tokenData = await tokenRes.json()
    if (!tokenRes.ok || !tokenData.access_token) throw new Error('Token exchange failed')

    // Fetch OpenID userinfo
    const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const user = await userRes.json()
    if (!userRes.ok) throw new Error('Failed to fetch user info')

    const name  = [user.given_name, user.family_name].filter(Boolean).join(' ')
    const email = user.email ?? ''

    return htmlResponse({ name, email }, null)
  } catch {
    return htmlResponse(null, 'Failed to retrieve LinkedIn profile')
  }
}

function htmlResponse(
  data: { name: string; email: string } | null,
  error: string | null
): NextResponse {
  const payload = data
    ? JSON.stringify({ type: 'linkedin-prefill', name: data.name, email: data.email })
    : JSON.stringify({ type: 'linkedin-error', error })

  const html = `<!DOCTYPE html>
<html>
  <head><title>LinkedIn</title></head>
  <body>
    <script>
      try { window.opener.postMessage(${payload}, '*') } catch(e) {}
      window.close()
    </script>
  </body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
