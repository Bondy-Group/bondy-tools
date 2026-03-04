'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import InterviewTab from '@/components/InterviewTab'
import CulturalFitTab from '@/components/CulturalFitTab'
import ScorecardAdminPage from '@/app/internal/scorecard-admin/page'

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

const BondyLogo = () => (
  <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
    <rect width="7" height="26" rx="1" fill="#111111"/>
    <rect x="7" y="1" width="16" height="11" rx="5.5" fill="#111111"/>
    <rect x="7" y="14" width="17" height="11" rx="5.5" fill="#111111"/>
    <circle cx="27" cy="29" r="3" fill="#E05C00"/>
  </svg>
)

const IconReport = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="4" y="6" width="24" height="28" rx="2" stroke="#E05C00" strokeWidth="1.5"/>
    <line x1="10" y1="14" x2="22" y2="14" stroke="#E05C00" strokeWidth="1.5"/>
    <line x1="10" y1="19" x2="22" y2="19" stroke="#E05C00" strokeWidth="1.5"/>
    <line x1="10" y1="24" x2="17" y2="24" stroke="#E05C00" strokeWidth="1.5"/>
    <circle cx="31" cy="31" r="7" fill="#F9F8F6" stroke="#E05C00" strokeWidth="1.5"/>
    <path d="M28 31l2 2 4-4" stroke="#E05C00" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const IconChrome = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="14" stroke="#4A90D9" strokeWidth="1.5"/>
    <circle cx="20" cy="20" r="6" fill="#F9F8F6" stroke="#4A90D9" strokeWidth="1.5"/>
    <path d="M20 6v8M32 26l-7-4M32 14l-7 4M20 34v-8M8 14l7 4M8 26l7-4" stroke="#4A90D9" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const IconBook = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="6" y="8" width="10" height="26" rx="1" stroke="#6B9E78" strokeWidth="1.5"/>
    <rect x="18" y="8" width="10" height="26" rx="1" stroke="#6B9E78" strokeWidth="1.5"/>
    <rect x="30" y="8" width="6" height="26" rx="1" stroke="#6B9E78" strokeWidth="1.5"/>
  </svg>
)

const IconHub = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="4" fill="#E05C00"/>
    <circle cx="20" cy="20" r="4" stroke="#E05C00" strokeWidth="1.5"/>
    <rect x="6" y="8" width="10" height="7" rx="2" stroke="#E05C00" strokeWidth="1.5"/>
    <rect x="24" y="8" width="10" height="7" rx="2" stroke="#E05C00" strokeWidth="1.5"/>
    <rect x="6" y="25" width="10" height="7" rx="2" stroke="#E05C00" strokeWidth="1.5"/>
    <rect x="24" y="25" width="10" height="7" rx="2" stroke="#E05C00" strokeWidth="1.5"/>
    <line x1="16" y1="11.5" x2="20" y2="18" stroke="#E05C00" strokeWidth="1.5"/>
    <line x1="24" y1="11.5" x2="20" y2="18" stroke="#E05C00" strokeWidth="1.5"/>
    <line x1="16" y1="28.5" x2="20" y2="22" stroke="#E05C00" strokeWidth="1.5"/>
    <line x1="24" y1="28.5" x2="20" y2="22" stroke="#E05C00" strokeWidth="1.5"/>
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
    ctaColor: '#E05C00',
    available: true,
    internal: true,
  },
  {
    id: 'chrome',
    number: '02',
    icon: <IconChrome />,
    title: 'Extensión Chrome',
    description: 'Capturá perfiles de LinkedIn directamente en tu flujo de trabajo. Descargá e instalá con el instructivo.',
    cta: 'Descargar',
    ctaColor: '#4A90D9',
    available: true,
    internal: true,
  },
  {
    id: 'interview-hub',
    number: '03',
    icon: <IconHub />,
    title: 'Interview Hub',
    description: 'Agendá entrevistas, generá preguntas por competencia con IA y tomá notas estructuradas durante la sesión.',
    cta: 'Abrir Hub',
    ctaColor: '#E05C00',
    available: true,
    href: '/interview-hub',
  },
  {
    id: 'library',
    number: '04',
    icon: <IconBook />,
    title: 'Biblioteca de Recursos',
    description: 'Libros, guías y materiales de referencia para el equipo. Descargables y organizados por categoría.',
    cta: null,
    ctaColor: '#6B9E78',
    available: false,
  },
]

export default function InternalPage() {
  const [activeResource, setActiveResource] = useState(null)
  const { data: session } = useSession()
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email)

  return (
    <main style={{ background: '#F9F8F6', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{
        borderBottom: '1px solid #EBEBEB',
        padding: '20px 64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(249,248,246,0.95)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BondyLogo />
          <span className="font-display" style={{ fontSize: '18px', fontWeight: 900, color: '#111111', letterSpacing: '-0.02em' }}>
            Bond<em style={{ color: '#E05C00', fontStyle: 'italic' }}>y</em>.
          </span>
          <span className="font-mono-bondy" style={{
            fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase',
            color: '#E05C00', background: 'rgba(224,92,0,0.08)',
            padding: '3px 8px', border: '1px solid rgba(224,92,0,0.2)'
          }}>
            Internal
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {session?.user?.email && (
            <span className="font-mono-bondy" style={{ fontSize: '10px', color: '#bbb', letterSpacing: '0.08em' }}>
              {session.user.email}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="font-mono-bondy"
            style={{
              fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#888885', background: 'none', border: '1px solid #EBEBEB',
              padding: '5px 12px', cursor: 'pointer', borderRadius: '4px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#E05C00'; e.currentTarget.style.color = '#E05C00' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#EBEBEB'; e.currentTarget.style.color = '#888885' }}
          >
            Cerrar sesión
          </button>
          <Link href="/" className="font-mono-bondy" style={{
            fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
            color: '#888885', textDecoration: 'none'
          }}>
            ← Bondy Tools
          </Link>
        </div>
      </nav>

      {/* Header */}
      <section style={{ padding: '56px 64px 48px', borderBottom: '1px solid #EBEBEB' }}>
        <div className="font-mono-bondy" style={{
          fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase',
          color: '#E05C00', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ display: 'block', width: '20px', height: '1px', background: '#E05C00' }} />
          Equipo Bondy
        </div>
        <h1 className="font-display" style={{
          fontSize: 'clamp(40px, 5vw, 60px)', fontWeight: 900, lineHeight: 1.0,
          letterSpacing: '-0.02em', color: '#111111', marginBottom: '16px'
        }}>
          Tu centro de<br />
          <em style={{ color: '#E05C00', fontStyle: 'italic' }}>recursos.</em>
        </h1>
        <p style={{ fontSize: '15px', color: '#888885', fontWeight: 300, maxWidth: '480px', lineHeight: 1.7 }}>
          Todo lo que necesitás para hacer tu trabajo. Herramientas, extensiones y materiales del equipo.
        </p>
      </section>

      {/* Section label */}
      {!activeResource && (
        <div style={{
          padding: '16px 64px', borderBottom: '1px solid #EBEBEB',
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ display: 'block', width: '16px', height: '1px', background: '#E05C00' }} />
          <span className="font-mono-bondy" style={{
            fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#E05C00'
          }}>
            Herramientas activas
          </span>
        </div>
      )}

      {/* Resource cards or active tool */}
      {!activeResource ? (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #EBEBEB' }}>
          {resources.map((r, i) => {
            const borderRight = i < resources.length - 1 ? '1px solid #EBEBEB' : 'none'
            
            if (!r.available) {
              return (
                <div key={r.id} style={{
                  borderRight,
                  padding: '40px 36px', display: 'flex', flexDirection: 'column', opacity: 0.4,
                }}>
                  <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D8D6D2', marginBottom: '28px' }}>{r.number}</div>
                  <div style={{ marginBottom: '20px' }}>{r.icon}</div>
                  <h2 className="font-display" style={{ fontSize: '22px', fontWeight: 700, color: '#111111', marginBottom: '12px', lineHeight: 1.2 }}>{r.title}</h2>
                  <p style={{ fontSize: '13px', color: '#888885', fontWeight: 300, lineHeight: 1.7, flex: 1, marginBottom: '28px' }}>{r.description}</p>
                  <div className="font-mono-bondy" style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D8D6D2', border: '1px solid #EBEBEB', padding: '4px 10px', display: 'inline-block' }}>
                    Próximamente
                  </div>
                </div>
              )
            }

            // Cards con href navegan a página separada
            if (r.href) {
              return (
                <Link key={r.id} href={r.href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    borderRight,
                    padding: '40px 36px', display: 'flex', flexDirection: 'column',
                    background: 'transparent', cursor: 'pointer',
                    transition: 'background 0.2s', height: '100%',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D8D6D2', marginBottom: '28px' }}>{r.number}</div>
                    <div style={{ marginBottom: '20px' }}>{r.icon}</div>
                    <h2 className="font-display" style={{ fontSize: '22px', fontWeight: 700, color: '#111111', marginBottom: '12px', lineHeight: 1.2, letterSpacing: '-0.01em' }}>{r.title}</h2>
                    <p style={{ fontSize: '13px', color: '#888885', fontWeight: 300, lineHeight: 1.7, flex: 1, marginBottom: '28px' }}>{r.description}</p>
                    <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: r.ctaColor }}>
                      {r.cta} →
                    </div>
                  </div>
                </Link>
              )
            }

            // Cards inline (assistant, chrome)
            return (
              <button key={r.id} onClick={() => setActiveResource(r.id)}
                style={{
                  borderRight,
                  padding: '40px 36px', display: 'flex', flexDirection: 'column',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left', transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D8D6D2', marginBottom: '28px' }}>{r.number}</div>
                <div style={{ marginBottom: '20px' }}>{r.icon}</div>
                <h2 className="font-display" style={{ fontSize: '22px', fontWeight: 700, color: '#111111', marginBottom: '12px', lineHeight: 1.2, letterSpacing: '-0.01em' }}>{r.title}</h2>
                <p style={{ fontSize: '13px', color: '#888885', fontWeight: 300, lineHeight: 1.7, flex: 1, marginBottom: '28px' }}>{r.description}</p>
                <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: r.ctaColor }}>
                  {r.cta} →
                </div>
              </button>
            )
          })}
        </section>
      ) : (
        /* Active tool view */
        <section>
          <div style={{ padding: '16px 64px', borderBottom: '1px solid #EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ display: 'block', width: '16px', height: '1px', background: '#E05C00' }} />
              <span className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#E05C00' }}>
                Asistente de Informes
              </span>
            </div>
            <button onClick={() => setActiveResource(null)} className="font-mono-bondy" style={{
              fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
              color: '#888885', background: 'none', border: 'none', cursor: 'pointer'
            }}>
              ← Volver
            </button>
          </div>
          <div style={{ padding: '40px 64px' }}>
            <AssistantTabs isAdmin={isAdmin} />
          </div>
        </section>
      )}

      {/* Footer */}
      <div style={{ padding: '20px 64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '40px' }}>
        <span className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#D8D6D2', textTransform: 'uppercase' }}>
          Uso exclusivo equipo Bondy
        </span>
      </div>

    </main>
  )
}

function AssistantTabs({ isAdmin }) {
  const [activeTab, setActiveTab] = useState('interview')

  const tabs = [
    { id: 'interview', label: 'Screening Report' },
    { id: 'cultural', label: 'Cultural Fit' },
    ...(isAdmin ? [{ id: 'scorecards', label: '⚙ Client Management', admin: true }] : []),
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '32px', borderBottom: '1px solid #EBEBEB', paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className="font-mono-bondy"
            style={{
              padding: '10px 20px',
              fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase',
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === tab.id ? (tab.admin ? '#E05C00' : '#111111') : '#888885',
              borderBottom: activeTab === tab.id ? `2px solid ${tab.admin ? '#E05C00' : '#E05C00'}` : '2px solid transparent',
              transition: 'all 0.2s',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === 'interview' && <InterviewTab />}
      {activeTab === 'cultural' && <CulturalFitTab />}
      {activeTab === 'scorecards' && isAdmin && <ScorecardAdminPage embedded />}
    </div>
  )
}
