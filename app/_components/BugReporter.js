'use client'

/**
 * BugReporter — el "bichito" flota abajo a la derecha en TODAS las páginas de
 * tools.wearebondy.com (montado en app/layout.js). Cualquier visitante puede
 * abrir el panel, describir un bug y mandarlo. El reporte va por email a
 * hello@wearebondy.com via POST /api/report-bug.
 *
 * Estilo: Sistema Typewriter de Bondy (crema #FEFCF9, tinta #1A1A1A, acento
 * verde #4A8C40, bordes #E8E4DE, títulos Special Elite).
 */

import { useState, useCallback } from 'react'

const GREEN = '#4A8C40'
const INK = '#1A1A1A'
const SUB = '#5A5550'
const FAINT = '#7A7874'
const RULE = '#E8E4DE'
const CREAM = '#FEFCF9'

// El dibujo del bichito — un bichito verde de Bondy (cuerpo, cabeza, antenas,
// patitas y unos puntitos). Se reusa en el botón y en el header del panel.
function Bichito({ size = 26, waving = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {/* antenas */}
      <path d="M12 8 Q10 3 7 3" stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M20 8 Q22 3 25 3" stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <circle cx="6.5" cy="2.6" r="1.4" fill={INK} />
      <circle cx="25.5" cy="2.6" r="1.4" fill={INK} />
      {/* patitas */}
      <path d="M9 15 L3 13 M9 19 L3 20 M9 23 L4 26" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M23 15 L29 13 M23 19 L29 20 M23 23 L28 26" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
      {/* cabeza */}
      <circle cx="16" cy="9" r="4.4" fill={INK} />
      <circle cx="14.4" cy="8.6" r="0.9" fill={CREAM} />
      <circle cx="17.6" cy="8.6" r="0.9" fill={CREAM} />
      {/* cuerpo */}
      <ellipse cx="16" cy="19.5" rx="7.6" ry="8.4" fill={GREEN} />
      {/* linea central */}
      <path d="M16 12 L16 27.5" stroke={INK} strokeWidth="1.4" strokeLinecap="round" opacity="0.55" />
      {/* puntitos */}
      <circle cx="12" cy="17" r="1.5" fill={INK} opacity="0.7" />
      <circle cx="20" cy="17" r="1.5" fill={INK} opacity="0.7" />
      <circle cx="11.7" cy="22" r="1.3" fill={INK} opacity="0.7" />
      <circle cx="20.3" cy="22" r="1.3" fill={INK} opacity="0.7" />
    </svg>
  )
}

export default function BugReporter() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [hp, setHp] = useState('') // honeypot
  const [status, setStatus] = useState('idle') // idle | sending | done | error
  const [errorMsg, setErrorMsg] = useState('')

  const reset = useCallback(() => {
    setMessage('')
    setEmail('')
    setHp('')
    setStatus('idle')
    setErrorMsg('')
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    // pequeño delay para no ver el reset mientras se cierra
    setTimeout(reset, 200)
  }, [reset])

  const submit = useCallback(
    async (e) => {
      e.preventDefault()
      if (message.trim().length < 3 || status === 'sending') return
      setStatus('sending')
      setErrorMsg('')
      try {
        const res = await fetch('/api/report-bug', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message.trim(),
            email: email.trim(),
            hp,
            pageUrl: typeof window !== 'undefined' ? window.location.href : '',
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && data.ok) {
          setStatus('done')
        } else {
          setStatus('error')
          setErrorMsg(data.error || 'No pudimos enviar el reporte. Probá de nuevo.')
        }
      } catch {
        setStatus('error')
        setErrorMsg('No pudimos enviar el reporte. Probá de nuevo.')
      }
    },
    [message, email, hp, status]
  )

  const font = "'Plus Jakarta Sans', system-ui, sans-serif"
  const display = "'Special Elite', Georgia, serif"

  return (
    <div style={{ fontFamily: font }}>
      {/* Botón flotante */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Reportar un bug"
          title="¿Encontraste un error? Reportalo"
          style={{
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            zIndex: 2147483000,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px 10px 12px',
            background: CREAM,
            color: INK,
            border: `1px solid ${RULE}`,
            borderRadius: '999px',
            boxShadow: '0 4px 18px rgba(26,26,26,0.12)',
            cursor: 'pointer',
            fontFamily: font,
            fontSize: '11px',
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <Bichito size={26} />
          <span>Reportar bug</span>
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Reportar un bug"
          style={{
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            zIndex: 2147483000,
            width: 'min(360px, calc(100vw - 32px))',
            background: CREAM,
            border: `1px solid ${RULE}`,
            boxShadow: '0 10px 40px rgba(26,26,26,0.18)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '14px 16px',
              borderBottom: `1px solid ${RULE}`,
              background: '#FFFFFF',
            }}
          >
            <Bichito size={28} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: display, fontSize: '15px', color: INK, lineHeight: 1.1 }}>
                Encontraste un bicho
              </div>
              <div style={{ fontSize: '11px', color: FAINT, marginTop: '2px' }}>
                Contanos qué se rompió
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: FAINT,
                fontSize: '20px',
                lineHeight: 1,
                padding: '2px 4px',
              }}
            >
              ×
            </button>
          </div>

          {/* Cuerpo */}
          <div style={{ padding: '16px' }}>
            {status === 'done' ? (
              <div style={{ textAlign: 'center', padding: '12px 4px 8px' }}>
                <div style={{ fontFamily: display, fontSize: '17px', color: INK, marginBottom: '6px' }}>
                  ¡Gracias! 🐛
                </div>
                <p style={{ fontSize: '13px', color: SUB, lineHeight: 1.6, margin: '0 0 16px' }}>
                  Recibimos tu reporte. Lo revisamos y lo arreglamos lo antes posible.
                </p>
                <button
                  type="button"
                  onClick={close}
                  style={{
                    fontFamily: font,
                    fontSize: '11px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    background: GREEN,
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    cursor: 'pointer',
                  }}
                >
                  Listo
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                {/* honeypot: oculto para humanos, tentador para bots */}
                <input
                  type="text"
                  name="company_website"
                  value={hp}
                  onChange={(e) => setHp(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', opacity: 0 }}
                />

                <label
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                    color: FAINT,
                    marginBottom: '6px',
                  }}
                >
                  ¿Qué pasó?
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  autoFocus
                  rows={4}
                  maxLength={4000}
                  placeholder="Ej: cuando subo mi CV en PDF, el botón no hace nada…"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: font,
                    fontSize: '13px',
                    lineHeight: 1.6,
                    color: INK,
                    background: '#FFFFFF',
                    border: `1px solid ${RULE}`,
                    padding: '10px 12px',
                    outline: 'none',
                  }}
                />

                <label
                  style={{
                    display: 'block',
                    fontSize: '10px',
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                    color: FAINT,
                    margin: '12px 0 6px',
                  }}
                >
                  Tu email <span style={{ textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="para avisarte cuando lo arreglemos"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    fontFamily: font,
                    fontSize: '13px',
                    color: INK,
                    background: '#FFFFFF',
                    border: `1px solid ${RULE}`,
                    padding: '10px 12px',
                    outline: 'none',
                  }}
                />

                {status === 'error' && (
                  <p style={{ fontSize: '12px', color: '#B24A3A', margin: '10px 0 0' }}>{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={message.trim().length < 3 || status === 'sending'}
                  style={{
                    width: '100%',
                    marginTop: '14px',
                    fontFamily: font,
                    fontSize: '11px',
                    letterSpacing: '0.10em',
                    textTransform: 'uppercase',
                    background: message.trim().length < 3 ? RULE : GREEN,
                    color: message.trim().length < 3 ? FAINT : '#fff',
                    border: 'none',
                    padding: '12px 20px',
                    cursor: message.trim().length < 3 || status === 'sending' ? 'default' : 'pointer',
                    transition: 'background .15s',
                  }}
                >
                  {status === 'sending' ? 'Enviando…' : 'Enviar reporte →'}
                </button>

                <p style={{ fontSize: '10px', color: FAINT, margin: '10px 0 0', lineHeight: 1.5 }}>
                  Guardamos la página y el navegador para poder reproducir el error.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
