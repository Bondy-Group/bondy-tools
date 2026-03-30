'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import InterviewTab from '@/components/InterviewTab'
import CulturalFitTab from '@/components/CulturalFitTab'
import ScorecardAdminPage from '@/app/internal/scorecard-admin/page'

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

const notebookBg = [
  'linear-gradient(90deg, transparent 68px, rgba(210,100,80,0.10) 68px, rgba(210,100,80,0.10) 69.5px, transparent 69.5px)',
  'repeating-linear-gradient(180deg, transparent 0px, transparent 31px, rgba(100,140,200,0.09) 31px, rgba(100,140,200,0.09) 32px)',
].join(',')

const tw = { bg: '#FEFCF9', inkMid: '#3A3530', inkSub: '#5A5550', inkFaint: '#7A7874', rule: '#E8E4DE', white: '#FFFFFF', green: '#4A8C40' }
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

/* ── Iconos — verde como acento principal ── */
const IconReport = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="4" y="6" width="24" height="28" rx="2" stroke="#4A8C40" strokeWidth="1.5"/>
    <line x1="10" y1="14" x2="22" y2="14" stroke="#4A8C40" strokeWidth="1.5"/>
    <line x1="10" y1="19" x2="22" y2="19" stroke="#4A8C40" strokeWidth="1.5"/>
    <line x1="10" y1="24" x2="17" y2="24" stroke="#4A8C40" strokeWidth="1.5"/>
    <circle cx="31" cy="31" r="7" fill="#FEFCF9" stroke="#4A8C40" strokeWidth="1.5"/>
    <path d="M28 31l2 2 4-4" stroke="#4A8C40" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconChrome = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="14" stroke="#7A7874" strokeWidth="1.5"/>
    <circle cx="20" cy="20" r="6" fill="#FEFCF9" stroke="#7A7874" strokeWidth="1.5"/>
    <path d="M20 6v8M32 26l-7-4M32 14l-7 4M20 34v-8M8 14l7 4M8 26l7-4" stroke="#7A7874" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const IconBook = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="6"  y="8" width="10" height="26" rx="1" stroke="#7A7874" strokeWidth="1.5"/>
    <rect x="18" y="8" width="10" height="26" rx="1" stroke="#7A7874" strokeWidth="1.5"/>
    <rect x="30" y="8" width="6"  height="26" rx="1" stroke="#7A7874" strokeWidth="1.5"/>
  </svg>
)

const IconHub = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="4" fill="#4A8C40"/>
    <rect x="6"  y="8"  width="10" height="7" rx="2" stroke="#4A8C40" strokeWidth="1.5"/>
    <rect x="24" y="8"  width="10" height="7" rx="2" stroke="#4A8C40" strokeWidth="1.5"/>
    <rect x="6"  y="25" width="10" height="7" rx="2" stroke="#4A8C40" strokeWidth="1.5"/>
    <rect x="24" y="25" width="10" height="7" rx="2" stroke="#4A8C40" strokeWidth="1.5"/>
    <line x1="16" y1="11.5" x2="20" y2="18" stroke="#4A8C40" strokeWidth="1.5"/>
    <line x1="24" y1="11.5" x2="20" y2="18" stroke="#4A8C40" strokeWidth="1.5"/>
    <line x1="16" y1="28.5" x2="20" y2="22" stroke="#4A8C40" strokeWidth="1.5"/>
    <line x1="24" y1="28.5" x2="20" y2="22" stroke="#4A8C40" strokeWidth="1.5"/>
  </svg>
)

const IconSignals = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="6"  y="26" width="5" height="8"  rx="1" stroke="#4A8C40" strokeWidth="1.5"/>
    <rect x="14" y="18" width="5" height="16" rx="1" stroke="#4A8C40" strokeWidth="1.5"/>
    <rect x="22" y="12" width="5" height="22" rx="1" stroke="#4A8C40" strokeWidth="1.5"/>
    <rect x="30" y="6"  width="5" height="28" rx="1" stroke="#4A8C40" strokeWidth="1.5"/>
    <path d="M8 18 L16 12 L24 8 L32 4" stroke="#4A8C40" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="32" cy="4" r="2.5" fill="#4A8C40"/>
  </svg>
)

const IconBruno = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="5" y="8" width="30" height="20" rx="3" stroke="#4A8C40" strokeWidth="1.5"/>
    <circle cx="14" cy="18" r="3" fill="#4A8C40" opacity="0.3"/>
    <circle cx="14" cy="18" r="1.5" fill="#4A8C40"/>
    <line x1="20" y1="14" x2="30" y2="14" stroke="#4A8C40" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="20" y1="18" x2="30" y2="18" stroke="#4A8C40" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="20" y1="22" x2="26" y2="22" stroke="#4A8C40" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 32 L18 28 H28" stroke="#4A8C40" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10" cy="33" r="2" fill="#4A8C40"/>
  </svg>
)

const resources = [
  {
    id: 'assistant',
    number: '01',
    icon: <IconReport />,
    title: 'Asistente de Informes',
    description: 'Generá screening reports y evaluaciones de cultural fit con IA. Incluye scorecard ponderado por posición.',
    cta: 'Abrir asistente',
    available: true,
    href: 'https://interview-report-gen1.vercel.app',
    external: true,
  },
  {
    id: 'chrome',
    number: '02',
    icon: <IconChrome />,
    title: 'Extensión Chrome',
    description: 'Capturá perfiles de LinkedIn directamente en tu flujo de trabajo. Descargá e instalá con el instructivo.',
    cta: 'Descargar',
    available: true,
    href: '/internal/chrome-extension',
  },
  {
    id: 'interview-hub',
    number: '03',
    icon: <IconHub />,
    title: 'Interview Hub',
    description: 'Agendá entrevistas, generá preguntas por competencia con IA y tomá notas estructuradas durante la sesión.',
    cta: 'Abrir Hub',
    available: true,
    href: '/interview-hub',
  },
  {
    id: 'market-signals',
    number: '04',
    icon: <IconSignals />,
    title: 'Market Signals',
    description: 'Señales del mercado tech: qué tecnologías y perfiles están contratando las empresas en LATAM.',
    cta: 'Ver señales',
    available: true,
    href: '/internal/market-signals',
  },
  {
    id: 'lead-analyzer',
    number: '05',
    icon: <IconBruno />,
    title: 'Lead Analyzer',
    description: 'Bruno analiza empresas con IA: scoring ICP, contacto verificado y draft de email personalizado en segundos.',
    cta: 'Abrir Bruno',
    available: true,
    href: '/internal/lead-analyzer',
  },
  {
    id: 'library',
    number: '06',
    icon: <IconBook />,
    title: 'Biblioteca de Recursos',
    description: 'Libros, guías y materiales de referencia para el equipo. Descargables y organizados por categoría.',
    cta: null,
    available: false,
  },
]

export default function InternalPage() {
  const [activeResource, setActiveResource] = useState(null)
  const { data: session } = useSession()
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email)

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
          <span style={{ fontFamily: serif, fontSize: '17px', color: '#1A1A1A', letterSpacing: '0.04em' }}>BONDY</span>
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
            style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint, background: 'none', border: `1px solid ${tw.rule}`, padding: '5px 12px', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = tw.green; e.currentTarget.style.color = tw.green }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = tw.rule; e.currentTarget.style.color = tw.inkFaint }}
          >
            Cerrar sesión
          </button>
          <Link href="/" style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none' }}>
            ← Bondy Tools
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section style={{ padding: '4rem clamp(1.25rem,5vw,4rem) 3rem', borderBottom: `1px solid ${tw.rule}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
          <div style={{ width: '20px', height: '1px', background: tw.green }} />
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green }}>
            Equipo Bondy
          </span>
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 'clamp(2.5rem,5vw,4rem)', lineHeight: 1.0, color: tw.inkMid, marginBottom: '0.5rem' }} className="tw-ink-heavy">
          Tu centro de<br />recursos.
        </h1>
        <svg width="220" height="8" viewBox="0 0 220 8" fill="none" style={{ display: 'block', marginBottom: '1.25rem' }}>
          <path d="M0 4 Q55 1 110 4 Q165 7 220 4" stroke="#4A8C40" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
        <p style={{ fontFamily: mono, fontSize: '14px', color: tw.inkFaint, maxWidth: '480px', lineHeight: 1.7 }}>
          Todo lo que necesitás para hacer tu trabajo. Herramientas, extensiones y materiales del equipo.
        </p>
      </section>

      {/* Label */}
      {!activeResource && (
        <div style={{ padding: '1rem clamp(1.25rem,5vw,4rem)', borderBottom: `1px solid ${tw.rule}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '16px', height: '1px', background: tw.green }} />
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green }}>
            Herramientas activas
          </span>
        </div>
      )}

      {/* Cards or active tool */}
      {!activeResource ? (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', borderBottom: `1px solid ${tw.rule}` }}>
          {resources.map((r, i) => {
            const borderRight = i < resources.length - 1 ? `1px solid ${tw.rule}` : 'none'
            const bgCard = i % 2 === 0 ? tw.white : tw.bg

            if (!r.available) {
              return (
                <div key={r.id} style={{ borderRight, padding: '2.5rem clamp(1rem,3vw,2.5rem)', display: 'flex', flexDirection: 'column', opacity: 0.4, background: bgCard }}>
                  <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: '1.75rem' }}>{r.number}</div>
                  <div style={{ marginBottom: '1.25rem' }}>{r.icon}</div>
                  <h2 style={{ fontFamily: serif, fontSize: '1.2rem', color: tw.inkMid, marginBottom: '0.75rem', lineHeight: 1.2 }}>{r.title}</h2>
                  <p style={{ fontFamily: mono, fontSize: '12px', color: tw.inkSub, lineHeight: 1.7, flex: 1, marginBottom: '1.75rem' }}>{r.description}</p>
                  <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.inkFaint, border: `1px solid ${tw.rule}`, padding: '4px 10px', display: 'inline-block' }}>
                    Próximamente
                  </div>
                </div>
              )
            }

            if (r.href) {
              const linkProps = r.external
                ? { href: r.href, target: '_blank', rel: 'noopener noreferrer' }
                : { href: r.href }
              return (
                <Link key={r.id} {...linkProps} style={{ textDecoration: 'none' }}>
                  <div style={{ borderRight, padding: '2.5rem clamp(1rem,3vw,2.5rem)', display: 'flex', flexDirection: 'column', background: bgCard, cursor: 'pointer', transition: 'background 0.2s', height: '100%' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,140,64,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = bgCard}
                  >
                    <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: '1.75rem' }}>{r.number}</div>
                    <div style={{ marginBottom: '1.25rem' }}>{r.icon}</div>
                    <h2 style={{ fontFamily: serif, fontSize: '1.2rem', color: tw.inkMid, marginBottom: '0.75rem', lineHeight: 1.2 }} className="tw-ink">{r.title}</h2>
                    <p style={{ fontFamily: mono, fontSize: '12px', color: tw.inkSub, lineHeight: 1.7, flex: 1, marginBottom: '1.75rem' }}>{r.description}</p>
                    <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.green }}>
                      {r.cta} →
                    </div>
                  </div>
                </Link>
              )
            }

            return (
              <button key={r.id} onClick={() => setActiveResource(r.id)}
                style={{ borderRight, padding: '2.5rem clamp(1rem,3vw,2.5rem)', display: 'flex', flexDirection: 'column', background: bgCard, border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,140,64,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = bgCard}
              >
                <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: '1.75rem' }}>{r.number}</div>
                <div style={{ marginBottom: '1.25rem' }}>{r.icon}</div>
                <h2 style={{ fontFamily: serif, fontSize: '1.2rem', color: tw.inkMid, marginBottom: '0.75rem', lineHeight: 1.2 }} className="tw-ink">{r.title}</h2>
                <p style={{ fontFamily: mono, fontSize: '12px', color: tw.inkSub, lineHeight: 1.7, flex: 1, marginBottom: '1.75rem' }}>{r.description}</p>
                <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.green }}>
                  {r.cta} →
                </div>
              </button>
            )
          })}
        </section>
      ) : (
        <section>
          <div style={{ padding: '1rem clamp(1.25rem,5vw,4rem)', borderBottom: `1px solid ${tw.rule}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '16px', height: '1px', background: tw.green }} />
              <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: tw.green }}>
                Asistente de Informes
              </span>
            </div>
            <button onClick={() => setActiveResource(null)} style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint, background: 'none', border: 'none', cursor: 'pointer' }}>
              ← Volver
            </button>
          </div>
          <div style={{ padding: '2.5rem clamp(1.25rem,5vw,4rem)' }}>
            <AssistantTabs isAdmin={isAdmin} />
          </div>
        </section>
      )}

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

function AssistantTabs({ isAdmin }) {
  const [activeTab, setActiveTab] = useState('interview')

  const tabs = [
    { id: 'interview', label: 'Screening Report' },
    { id: 'cultural', label: 'Cultural Fit' },
    ...(isAdmin ? [{ id: 'scorecards', label: 'Client Management', admin: true }] : []),
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '2rem', borderBottom: `1px solid ${tw.rule}`, paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 20px',
              fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? '#1A1A1A' : tw.inkFaint,
              borderBottom: activeTab === tab.id ? `2px solid ${tw.green}` : '2px solid transparent',
              transition: 'all 0.2s', marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'interview'  && <InterviewTab />}
      {activeTab === 'cultural'   && <CulturalFitTab />}
      {activeTab === 'scorecards' && isAdmin && <ScorecardAdminPage embedded />}
    </div>
  )
}
