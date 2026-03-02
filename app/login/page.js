'use client'

import { signIn, useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const BondyLogo = () => (
  <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
    <rect width="7" height="26" rx="1" fill="#111111"/>
    <rect x="7" y="1" width="16" height="11" rx="5.5" fill="#111111"/>
    <rect x="7" y="14" width="17" height="11" rx="5.5" fill="#111111"/>
    <circle cx="27" cy="29" r="3" fill="#E05C00"/>
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
    <main style={{ background: '#F9F8F6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 24px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <BondyLogo />
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '32px', fontWeight: 900, color: '#111', letterSpacing: '-0.02em', margin: '0 0 8px' }}>
            Bond<em style={{ color: '#E05C00', fontStyle: 'italic' }}>y</em> Tools
          </h1>
          <p style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#888', margin: 0 }}>
            Uso exclusivo equipo Bondy
          </p>
        </div>

        <div style={{ background: 'white', borderRadius: '16px', border: '1.5px solid #EBEBEB', padding: '36px', boxShadow: '0 2px 20px rgba(0,0,0,0.04)' }}>
          <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.7, margin: '0 0 28px', textAlign: 'center' }}>
            Ingresá con tu cuenta de Google de Bondy para acceder a las herramientas del equipo.
          </p>

          <button
            onClick={() => signIn('google', { callbackUrl: '/internal' })}
            style={{
              width: '100%', padding: '14px 20px', borderRadius: '10px',
              background: '#111', color: 'white', border: 'none',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              fontFamily: 'DM Mono, monospace', letterSpacing: '0.05em',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#E05C00'}
            onMouseLeave={e => e.currentTarget.style.background = '#111'}
          >
            <GoogleIcon />
            Continuar con Google
          </button>

          <p style={{ fontSize: '11px', color: '#bbb', textAlign: 'center', margin: '20px 0 0', fontFamily: 'DM Mono, monospace' }}>
            Solo cuentas @wearebondy.com
          </p>
        </div>
      </div>
    </main>
  )
}

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)
