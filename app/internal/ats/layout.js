import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export const metadata = { title: 'Bondy ATS' }

export default async function ATSLayout({ children }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return <>{children}</>
}
