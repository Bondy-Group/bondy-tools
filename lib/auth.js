import GoogleProvider from 'next-auth/providers/google'

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly',
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
      if (account) {
        token.access_token = account.access_token
        token.refresh_token = account.refresh_token
        token.expires_at = account.expires_at
      }
      if (user) token.sub = user.id
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
