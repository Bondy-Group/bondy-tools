import { getServerSession } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { NextResponse } from 'next/server'

// Inline authOptions para que getServerSession pueda leer el token
const authOptions = {
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
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.access_token = account.access_token
        token.refresh_token = account.refresh_token
        token.expires_at = account.expires_at
      }
      return token
    },
    async session({ session, token }) {
      if (session?.user) {
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

export async function GET(request) {
  const session = await getServerSession(authOptions)

  if (!session?.access_token) {
    console.log('No access_token in session:', JSON.stringify(session))
    return NextResponse.json({ events: [], debug: 'no_token' }, { status: 200 })
  }

  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

  // Rango del día completo en UTC-3 (Argentina)
  const timeMin = new Date(date + 'T00:00:00-03:00').toISOString()
  const timeMax = new Date(date + 'T23:59:59-03:00').toISOString()

  try {
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
    url.searchParams.set('timeMin', timeMin)
    url.searchParams.set('timeMax', timeMax)
    url.searchParams.set('singleEvents', 'true')
    url.searchParams.set('orderBy', 'startTime')
    url.searchParams.set('maxResults', '20')

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.json()
      console.error('Calendar API error:', err)
      return NextResponse.json({ events: [], error: err.error?.message }, { status: 200 })
    }

    const data = await res.json()
    const events = (data.items || [])
      .filter(e => e.status !== 'cancelled' && e.transparency !== 'transparent')
      .map(e => ({
        id: e.id,
        title: e.summary || '(Sin título)',
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
        allDay: !e.start?.dateTime,
        description: e.description || '',
        attendees: (e.attendees || []).map(a => a.email).filter(Boolean),
        meetLink: e.hangoutLink || e.conferenceData?.entryPoints?.[0]?.uri || null,
      }))

    return NextResponse.json({ events })
  } catch (e) {
    console.error('Calendar fetch error:', e)
    return NextResponse.json({ events: [] }, { status: 200 })
  }
}
