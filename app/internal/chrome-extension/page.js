'use client'

import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

const notebookBg = [
  'linear-gradient(90deg, transparent 68px, rgba(210,100,80,0.10) 68px, rgba(210,100,80,0.10) 69.5px, transparent 69.5px)',
  'repeating-linear-gradient(180deg, transparent 0px, transparent 31px, rgba(100,140,200,0.09) 31px, rgba(100,140,200,0.09) 32px)',
].join(',')

const tw = {
  bg: '#FEFCF9', inkMid: '#3A3530', inkSub: '#5A5550', inkFaint: '#7A7874',
  rule: '#E8E4DE', white: '#FFFFFF', green: '#4A8C40', ink: '#1A1A1A',
}
const serif = "'Special Elite', Georgia, serif"
const mono  = "'Courier Prime', Courier, monospace"

const BondyLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4"  y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" />
    <rect x="22" y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
    <rect x="4"  y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
  </svg>
)

const steps = [
  {
    n: '01',
    title: 'Descargá e instalá',
    lines: [
      'Descomprimí el ZIP → obtenés la carpeta bondy-v3',
      'Abrí Chrome → chrome://extensions/',
      'Activá Developer mode (toggle arriba a la derecha)',
      'Clic en Load unpacked → seleccioná la carpeta bondy-v3',
      'Clic en el ícono de puzzle 🧩 → pineá Bondy Sourcing Assistant',
    ],
  },
  {
    n: '02',
    title: 'Configurá tu API Key',
    lines: [
      'Entrá a airtable.com → foto de perfil → Account',
      'Sección API → Create new token',
      'Nombre: "Bondy Extension" · Permisos: data.records:read + write',
      'Scope: Base General + Registro Comercial (CRM)',
      'Copiá el token (empieza con pat…)',
      'Clic en el ícono de Bondy en Chrome → pegá el token → Guardar',
      'Tiene que aparecer: ✓ API Key configurada',
    ],
  },
  {
    n: '03',
    title: 'Cómo se usa',
    lines: [
      'Abrí cualquier perfil en LinkedIn → el panel aparece solo a la derecha',
      'Si la persona ya está en la base → muestra el historial completo de procesos',
      'Si no está → muestra el formulario para cargarla a Airtable',
      'Al guardar queda registrado en Airtable automáticamente',
      'Funciona también en GitHub y Juicebox',
    ],
  },
]

export default function ChromeExtensionPage() {
  const { data: session } = useSession()

  return (
    <main style={{ backgroundColor: tw.bg, backgroundImage: notebookBg, minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{
        borderBottom: `1px solid ${tw.rule}`,
        padding: '0 clamp(1.25rem,5vw,4rem)',
        height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(254,252,249,0.97)',
        backgroundImage: notebookBg,
        position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <BondyLogo size={22} />
          <span style={{ fontFamily: serif, fontSize: '17px', color: tw.ink, letterSpacing: '0.04em' }}>BONDY</span>
          <span style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.green, border: `1px solid rgba(74,140,64,0.3)`, padding: '3px 8px' }}>
            Internal
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {session?.user?.email && (
            <span style={{ fontFamily: mono, fontSize: '10px', color: tw.inkFaint, letterSpacing: '0.06em' }}>
              {session.user.email}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint, background: 'none', border: `1px solid ${tw.rule}`, padding: '5px 12px', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = tw.green; e.currentTarget.style.color = tw.green }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = tw.rule; e.currentTarget.style.color = tw.inkFaint }}
          >
            Cerrar sesión
          </button>
          <Link href="/internal" style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none' }}>
            ← Volver
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section style={{ padding: '4rem clamp(1.25rem,5vw,4rem) 3rem', borderBottom: `1px solid ${tw.rule}`, display: 'flex', flexDirection: 'column', gap: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{ width: '20px', height: '1px', background: tw.green }} />
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green }}>
            Herramienta 02
          </span>
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 'clamp(2.2rem,4.5vw,3.5rem)', lineHeight: 1.05, color: tw.inkMid, marginBottom: '0.5rem' }}>
          Extensión Chrome
        </h1>
        <svg width="200" height="8" viewBox="0 0 200 8" fill="none" style={{ display: 'block', marginBottom: '1.25rem' }}>
          <path d="M0 4 Q50 1 100 4 Q150 7 200 4" stroke="#4A8C40" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
        <p style={{ fontFamily: mono, fontSize: '14px', color: tw.inkFaint, maxWidth: '500px', lineHeight: 1.7, marginBottom: '2.5rem' }}>
          Verificá y cargá candidatos en Airtable directamente desde LinkedIn, Juicebox o GitHub — sin copiar y pegar, sin salir del perfil.
        </p>

        {/* Download button */}
        <a
          href="/downloads/bondy-v3.zip"
          download="bondy-v3.zip"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            fontFamily: mono, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: tw.bg, background: tw.ink,
            padding: '14px 28px', textDecoration: 'none',
            transition: 'background 0.2s',
            alignSelf: 'flex-start',
          }}
          onMouseEnter={e => e.currentTarget.style.background = tw.green}
          onMouseLeave={e => e.currentTarget.style.background = tw.ink}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Descargar extensión (v3.1)
        </a>
      </section>

      {/* Steps */}
      <section style={{ borderBottom: `1px solid ${tw.rule}` }}>
        <div style={{ padding: '1rem clamp(1.25rem,5vw,4rem)', borderBottom: `1px solid ${tw.rule}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '16px', height: '1px', background: tw.green }} />
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green }}>
            Instructivo de instalación
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', borderBottom: `1px solid ${tw.rule}` }}>
          {steps.map((step, i) => (
            <div key={step.n} style={{
              borderRight: i < steps.length - 1 ? `1px solid ${tw.rule}` : 'none',
              padding: '2.5rem clamp(1rem,3vw,2.5rem)',
              background: i % 2 === 0 ? tw.white : tw.bg,
            }}>
              <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: '1rem' }}>
                {step.n}
              </div>
              <h2 style={{ fontFamily: serif, fontSize: '1.2rem', color: tw.inkMid, marginBottom: '1.25rem', lineHeight: 1.2 }}>
                {step.title}
              </h2>
              <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {step.lines.map((line, j) => (
                  <li key={j} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: mono, fontSize: '9px', color: tw.green, letterSpacing: '0.1em', minWidth: '16px', paddingTop: '2px' }}>
                      {String(j + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontFamily: mono, fontSize: '12px', color: tw.inkSub, lineHeight: 1.65 }}>
                      {line}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* Note */}
      <section style={{ padding: '2rem clamp(1.25rem,5vw,4rem)', borderBottom: `1px solid ${tw.rule}`, display: 'flex', gap: '1rem', alignItems: 'flex-start', maxWidth: '680px' }}>
        <div style={{ width: '3px', background: tw.green, flexShrink: 0, alignSelf: 'stretch', borderRadius: '2px' }} />
        <div>
          <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.green, marginBottom: '6px' }}>
            Nota
          </div>
          <p style={{ fontFamily: mono, fontSize: '12px', color: tw.inkSub, lineHeight: 1.7, margin: 0 }}>
            Cada miembro del equipo necesita configurar su propia API Key de Airtable. Los candidatos que cargues quedan registrados con tu nombre como sourcer. Ante cualquier problema con la instalación, avisale a Mara.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div style={{ padding: '1.25rem clamp(1.25rem,5vw,4rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem', borderTop: `1px solid ${tw.rule}` }}>
        <span style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em', color: tw.inkFaint }}>
          Uso exclusivo equipo Bondy
        </span>
        <a href="https://wearebondy.com" target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em', color: tw.green, textDecoration: 'none' }}>
          wearebondy.com ↗
        </a>
      </div>

    </main>
  )
}
