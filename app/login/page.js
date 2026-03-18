'use client'

import { signIn, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const notebookBg = [
  'linear-gradient(90deg, transparent 68px, rgba(210,100,80,0.10) 68px, rgba(210,100,80,0.10) 69.5px, transparent 69.5px)',
  'repeating-linear-gradient(180deg, transparent 0px, transparent 31px, rgba(100,140,200,0.09) 31px, rgba(100,140,200,0.09) 32px)',
].join(',')

const tw = { bg: '#FEFCF9', inkMid: '#3A3530', inkSub: '#5A5550', inkFaint: '#7A7874', rule: '#E8E4DE', white: '#FFFFFF', green: '#4A8C40' }
const serif = "'Special Elite', Georgia, serif"
const mono  = "'Courier Prime', Courier, monospace"

const BondyLogo = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4"  y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" />
    <rect x="22" y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
    <rect x="4"  y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
  </svg>
)

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function LoginPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated') router.push('/internal')
  }, [status, router])

  if (status === 'loading') return null

  return (
    <main style={{ backgroundColor: tw.bg, backgroundImage: notebookBg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <BondyLogo />
          </div>
          <h1 style={{ fontFamily: serif, fontSize: '2rem', color: tw.inkMid, margin: '0 0 8px' }} className="tw-ink">
            BONDY Tools
          </h1>
          <p style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.inkFaint, margin: 0 }}>
            Uso exclusivo equipo Bondy
          </p>
        </div>

        <div style={{ background: tw.white, border: `1px solid ${tw.rule}`, padding: '2.5rem' }}>
          <p style={{ fontFamily: mono, fontSize: '13px', color: tw.inkSub, lineHeight: 1.7, margin: '0 0 2rem', textAlign: 'center' }}>
            Ingresá con tu cuenta de Google de Bondy para acceder a las herramientas del equipo.
          </p>

          <button
            onClick={() => signIn('google', { callbackUrl: '/internal' })}
            style={{
              width: '100%', padding: '13px 20px',
              background: tw.green, color: 'white', border: 'none',
              fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em', textTransform: 'uppercase',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          <p style={{ fontFamily: mono, fontSize: '10px', color: tw.inkFaint, textAlign: 'center', margin: '1.25rem 0 0' }}>
            Solo cuentas @wearebondy.com
          </p>
        </div>

      </div>
    </main>
  )
}
