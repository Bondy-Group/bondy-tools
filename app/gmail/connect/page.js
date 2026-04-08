'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

// Logo 4 asientos (SVG exacto del brand system v4)
function BondyLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <rect x="4" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A"/>
      <rect x="22" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18"/>
      <rect x="4" y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42"/>
      <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40"/>
    </svg>
  )
}

const KNOWN_RECRUITERS = [
  'mara@wearebondy.com',
  'lucia@wearebondy.com',
  'rodrigo@wearebondy.com',
  'ximena@wearebondy.com',
]

function GmailConnectContent() {
  const searchParams = useSearchParams()
  const success = searchParams.get('success')
  const errorParam = searchParams.get('error')
  const emailParam = searchParams.get('email')

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // Prellenar email si viene en la URL
  useEffect(() => {
    if (emailParam) setEmail(decodeURIComponent(emailParam))
  }, [emailParam])

  const handleConnect = () => {
    if (!email || !email.includes('@')) return
    setLoading(true)
    window.location.href = `/api/gmail/connect?recruiter=${encodeURIComponent(email)}`
  }

  const errorMessages = {
    missing_params: 'Parámetros inválidos. Intentá de nuevo.',
    invalid_state: 'El estado de OAuth es inválido. Intentá de nuevo.',
    no_recruiter_in_state: 'No se pudo identificar el recruiter. Intentá de nuevo.',
    token_exchange_failed: 'Error al intercambiar el código con Google. Intentá de nuevo.',
    no_refresh_token: 'Google no devolvió el token de actualización. Intentá de nuevo.',
    supabase_save_failed: 'Error al guardar el token. Avisale a Mateo.',
    access_denied: 'Cancelaste la autorización. Podés intentarlo de nuevo cuando quieras.',
  }

  const errorMessage = errorMessages[errorParam] || (errorParam ? `Error: ${errorParam}` : null)

  const styles = {
    page: {
      minHeight: '100vh',
      backgroundColor: '#FEFCF9',
      backgroundImage: `
        linear-gradient(rgba(210,100,80,0.08) 1px, transparent 1px),
        linear-gradient(rgba(100,140,200,0.07) 1px, transparent 1px)
      `,
      backgroundSize: '100% 32px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 24px',
      fontFamily: "'Courier Prime', Courier, monospace",
    },
    card: {
      backgroundColor: '#FFFFFF',
      border: '1px solid #E8E4DE',
      padding: '40px 44px',
      maxWidth: '480px',
      width: '100%',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '32px',
    },
    wordmark: {
      fontFamily: "'Special Elite', Georgia, serif",
      fontSize: '18px',
      color: '#1A1A1A',
      letterSpacing: '0.04em',
    },
    label: {
      fontFamily: "'Courier Prime', Courier, monospace",
      fontSize: '10px',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: '#4A8C40',
      display: 'block',
      marginBottom: '10px',
    },
    title: {
      fontFamily: "'Special Elite', Georgia, serif",
      fontSize: '1.8rem',
      color: '#3A3530',
      lineHeight: '1.1',
      marginBottom: '12px',
      opacity: '0.92',
    },
    subtitle: {
      fontFamily: "'Courier Prime', Courier, monospace",
      fontSize: '13px',
      color: '#5A5550',
      lineHeight: '1.7',
      marginBottom: '28px',
    },
    inputLabel: {
      fontFamily: "'Courier Prime', Courier, monospace",
      fontSize: '9px',
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: '#7A7874',
      display: 'block',
      marginBottom: '6px',
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #E8E4DE',
      backgroundColor: '#FEFCF9',
      fontFamily: "'Courier Prime', Courier, monospace",
      fontSize: '14px',
      color: '#1A1A1A',
      outline: 'none',
      marginBottom: '20px',
      boxSizing: 'border-box',
    },
    button: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: "'Courier Prime', Courier, monospace",
      fontSize: '11px',
      letterSpacing: '0.10em',
      textTransform: 'uppercase',
      backgroundColor: loading ? '#5A5550' : '#4A8C40',
      color: '#fff',
      padding: '12px 24px',
      border: 'none',
      cursor: loading ? 'not-allowed' : 'pointer',
      width: '100%',
      justifyContent: 'center',
    },
    successBox: {
      backgroundColor: 'rgba(74,140,64,0.07)',
      border: '1px solid rgba(74,140,64,0.25)',
      borderLeft: '3px solid #4A8C40',
      padding: '16px 20px',
      marginBottom: '24px',
    },
    errorBox: {
      backgroundColor: 'rgba(180,60,40,0.06)',
      border: '1px solid rgba(180,60,40,0.2)',
      borderLeft: '3px solid #B43C28',
      padding: '16px 20px',
      marginBottom: '24px',
    },
    messageText: {
      fontFamily: "'Courier Prime', Courier, monospace",
      fontSize: '13px',
      color: '#3A3530',
      lineHeight: '1.6',
    },
    divider: {
      border: 'none',
      borderTop: '1px solid #E8E4DE',
      margin: '24px 0',
    },
    hint: {
      fontFamily: "'Courier Prime', Courier, monospace",
      fontSize: '11px',
      color: '#7A7874',
      lineHeight: '1.6',
    },
    quickLinks: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      marginTop: '12px',
    },
    quickLink: {
      fontFamily: "'Courier Prime', Courier, monospace",
      fontSize: '11px',
      letterSpacing: '0.06em',
      color: '#4A8C40',
      cursor: 'pointer',
      background: 'none',
      border: '1px solid rgba(74,140,64,0.25)',
      padding: '8px 14px',
      textAlign: 'left',
    },
    footer: {
      marginTop: '32px',
      fontFamily: "'Courier Prime', Courier, monospace",
      fontSize: '9px',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: '#7A7874',
      textAlign: 'center',
    },
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <BondyLogo size={26} />
          <span style={styles.wordmark}>BONDY</span>
        </div>

        {/* Label + Title */}
        <span style={styles.label}>Gmail · Activación</span>
        <h1 style={styles.title}>Conectar tu Gmail</h1>
        <p style={styles.subtitle}>
          Autorizá a Bondy a crear borradores en tu Gmail. Solo se necesita hacerlo una vez. Rex podrá preparar drafts listos para que vos los revisés y enviés.
        </p>

        {/* Success state */}
        {success && (
          <div style={styles.successBox}>
            <p style={{ ...styles.messageText, color: '#2E6B24' }}>
              ✓ Gmail conectado correctamente.
              {emailParam && (
                <><br /><span style={{ opacity: 0.8 }}>{decodeURIComponent(emailParam)}</span></>
              )}
              <br />Rex ya puede crear drafts en tu cuenta.
            </p>
          </div>
        )}

        {/* Error state */}
        {errorMessage && (
          <div style={styles.errorBox}>
            <p style={{ ...styles.messageText, color: '#B43C28' }}>
              {errorMessage}
            </p>
          </div>
        )}

        {/* Form */}
        {!success && (
          <>
            <label style={styles.inputLabel}>Tu email (@wearebondy.com)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="lucia@wearebondy.com"
              style={styles.input}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />

            <button
              onClick={handleConnect}
              disabled={loading || !email}
              style={styles.button}
            >
              {loading ? 'Redirigiendo a Google...' : 'Conectar mi Gmail con Google →'}
            </button>

            {/* Quick access para recruiters conocidos */}
            <hr style={styles.divider} />
            <p style={styles.hint}>Acceso rápido — team Bondy:</p>
            <div style={styles.quickLinks}>
              {KNOWN_RECRUITERS.map((r) => (
                <button
                  key={r}
                  style={styles.quickLink}
                  onClick={() => setEmail(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Reconectar si ya está conectado */}
        {success && (
          <>
            <hr style={styles.divider} />
            <button
              onClick={() => {
                window.history.replaceState({}, '', '/gmail/connect')
                window.location.reload()
              }}
              style={{ ...styles.button, backgroundColor: 'transparent', color: '#4A8C40', border: '1px solid rgba(74,140,64,0.35)' }}
            >
              Conectar otro Gmail →
            </button>
          </>
        )}
      </div>

      <p style={styles.footer}>
        Bondy Group · tools.wearebondy.com · Solo uso interno
      </p>
    </div>
  )
}

export default function GmailConnectPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#FEFCF9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Courier Prime', Courier, monospace",
        fontSize: '13px',
        color: '#7A7874',
      }}>
        Cargando...
      </div>
    }>
      <GmailConnectContent />
    </Suspense>
  )
}
