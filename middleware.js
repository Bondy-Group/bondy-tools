import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

// Routes that only Mara and Lucía can access (job board admin)
const RESTRICTED_PREFIXES = ['/internal/job-board', '/internal/applications']
const JOB_BOARD_ADMINS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const email = (req.nextauth?.token?.email || '').toLowerCase()

    const isRestricted = RESTRICTED_PREFIXES.some((p) => pathname.startsWith(p))
    if (isRestricted && !JOB_BOARD_ADMINS.includes(email)) {
      const url = req.nextUrl.clone()
      url.pathname = '/internal'
      url.searchParams.set('error', 'forbidden')
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  matcher: ['/internal/:path*'],
}
