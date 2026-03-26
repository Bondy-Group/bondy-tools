import GoogleProvider from 'next-auth/providers/google'

const SUPABASE_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'

async function saveGmailToken(email, refreshToken, accessToken, expiresAt) {
  await fetch(SUPABASE_URL + '/rest/v1/gmail_tokens', {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      email,
      refresh_token: refreshToken,
      access_token: accessToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }),
  })
}

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.compose',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user }) {
      const ALLOWED_DOMAINS = ['wearebondy.com', 'bondy.com']
      const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)
      const email = user.email || ''
      const domain = email.split('@')[1]
      if (ALLOWED_DOMAINS.includes(domain)) return true
      if (ALLOWED_EMAILS.includes(email)) return true
      return false
    },
    async jwt({ token, account, user }) {
      if (user) {
        token.sub = user.id
        token.email = user.email
      }
      if (account) {
        token.access_token = account.access_token
        token.refresh_token = account.refresh_token
        token.expires_at = account.expires_at
        // Guardar refresh token en Supabase para que Rex lo use
        const emailForToken = token.email || user?.email
        if (account.refresh_token && emailForToken) {
          try {
            await saveGmailToken(
              emailForToken,
              account.refresh_token,
              account.access_token,
              account.expires_at
            )
          } catch (err) {
            // No romper el login si falla el guardado del token en Supabase
            console.error('[auth] saveGmailToken error (non-fatal):', err.message)
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.sub
        session.access_token = token.access_token
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}


