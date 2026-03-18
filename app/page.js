'use client'

import Link from 'next/link'

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

const sections = [
  {
    href: '/internal',
    number: '01',
    title: 'Equipo Bondy',
    description: 'Asistente de informes, extensión de Chrome, scorecard y recursos del equipo.',
    available: true,
  },
  {
    href: '/recruitment',
    number: '02',
    title: 'Recursos para Recruiters',
    description: 'Herramientas y materiales gratuitos para equipos de talent acquisition.',
    available: false,
  },
  {
    href: '/hiring',
    number: '03',
    title: 'Hiring Strategy',
    description: 'Guías para hiring managers y fondos planeando su estrategia en LATAM.',
    available: false,
  },
]

export default function HomePage() {
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
            Tools
          </span>
        </div>
        <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint }}>
          tools.wearebondy.com
        </span>
      </nav>

      {/* Header */}
      <section style={{ padding: '4rem clamp(1.25rem,5vw,4rem) 3rem', borderBottom: `1px solid ${tw.rule}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
          <div style={{ width: '22px', height: '1px', background: tw.green }} />
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.green }}>
            Bondy Tools
          </span>
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 'clamp(2.5rem,5vw,4rem)', lineHeight: 0.96, color: tw.inkMid, marginBottom: '0.5rem' }} className="tw-ink-heavy">
          Todo en un<br />solo lugar.
        </h1>
        <svg width="240" height="8" viewBox="0 0 240 8" fill="none" style={{ display: 'block', marginBottom: '1.5rem' }}>
          <path d="M0 4 Q60 1 120 4 Q180 7 240 4" stroke="#4A8C40" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
        <p style={{ fontFamily: mono, fontSize: '14px', color: tw.inkFaint, maxWidth: '480px', lineHeight: 1.7 }}>
          Plataforma de recursos para el equipo Bondy, recruiters y equipos de hiring en LATAM.
        </p>
      </section>

      {/* Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: `1px solid ${tw.rule}` }}>
        {sections.map((s, i) => (
          s.available ? (
            <Link key={s.href} href={s.href} style={{
              borderRight: i < sections.length - 1 ? `1px solid ${tw.rule}` : 'none',
              padding: '3rem clamp(1rem,3vw,2.5rem)',
              display: 'flex', flexDirection: 'column',
              textDecoration: 'none', color: 'inherit',
              background: i % 2 === 0 ? tw.white : tw.bg,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,140,64,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? tw.white : tw.bg}
            >
              <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: '2rem' }}>{s.number}</div>
              <h2 style={{ fontFamily: serif, fontSize: '1.4rem', color: tw.inkMid, marginBottom: '1rem', lineHeight: 1.2 }} className="tw-ink">{s.title}</h2>
              <p style={{ fontFamily: mono, fontSize: '13px', color: tw.inkSub, lineHeight: 1.7, marginBottom: '2rem', flex: 1 }}>{s.description}</p>
              <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.green }}>
                Entrar →
              </div>
            </Link>
          ) : (
            <div key={s.href} style={{
              borderRight: i < sections.length - 1 ? `1px solid ${tw.rule}` : 'none',
              padding: '3rem clamp(1rem,3vw,2.5rem)',
              display: 'flex', flexDirection: 'column',
              opacity: 0.4,
            }}>
              <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: '2rem' }}>{s.number}</div>
              <h2 style={{ fontFamily: serif, fontSize: '1.4rem', color: tw.inkMid, marginBottom: '1rem', lineHeight: 1.2 }}>{s.title}</h2>
              <p style={{ fontFamily: mono, fontSize: '13px', color: tw.inkSub, lineHeight: 1.7, marginBottom: '2rem', flex: 1 }}>{s.description}</p>
              <div style={{ fontFamily: mono, fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: tw.inkFaint, border: `1px solid ${tw.rule}`, padding: '4px 10px', display: 'inline-block' }}>
                Próximamente
              </div>
            </div>
          )
        ))}
      </section>

      {/* Footer */}
      <div style={{ padding: '1.25rem clamp(1.25rem,5vw,4rem)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em', color: tw.inkFaint }}>
          © {new Date().getFullYear()} Bondy Group
        </span>
        <a href="https://wearebondy.com" target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: mono, fontSize: '11px', letterSpacing: '0.10em', color: tw.green, textDecoration: 'none' }}>
          wearebondy.com ↗
        </a>
      </div>

    </main>
  )
}
