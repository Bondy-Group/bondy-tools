'use client'

import Link from 'next/link'

const BondyLogo = () => (
  <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
    <rect width="7" height="26" rx="1" fill="#111111"/>
    <rect x="7" y="1" width="16" height="11" rx="5.5" fill="#111111"/>
    <rect x="7" y="14" width="17" height="11" rx="5.5" fill="#111111"/>
    <circle cx="27" cy="29" r="3" fill="#E05C00"/>
  </svg>
)

const sections = [
  {
    href: '/internal',
    number: '01',
    title: 'Equipo',
    titleItalic: 'Bondy',
    description: 'Asistente de informes, extensión de Chrome, scorecard y recursos del equipo.',
    available: true,
  },
  {
    href: '/recruitment',
    number: '02',
    title: 'Recursos para',
    titleItalic: 'Recruiters',
    description: 'Herramientas y materiales gratuitos para equipos de talent acquisition.',
    available: false,
  },
  {
    href: '/hiring',
    number: '03',
    title: 'Hiring',
    titleItalic: 'Strategy',
    description: 'Guías para hiring managers y fondos planeando su estrategia en LATAM.',
    available: false,
  },
]

export default function HomePage() {
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
        </div>
        <span className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D8D6D2' }}>
          tools.wearebondy.com
        </span>
      </nav>

      {/* Header */}
      <section style={{ padding: '56px 64px 48px', borderBottom: '1px solid #EBEBEB' }}>
        <div className="font-mono-bondy" style={{
          fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase',
          color: '#E05C00', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          <span style={{ display: 'block', width: '20px', height: '1px', background: '#E05C00' }} />
          Bondy Tools
        </div>
        <h1 className="font-display" style={{
          fontSize: 'clamp(40px, 5vw, 60px)', fontWeight: 900, lineHeight: 1.0,
          letterSpacing: '-0.02em', color: '#111111', marginBottom: '16px'
        }}>
          Todo en un<br />
          <em style={{ color: '#E05C00', fontStyle: 'italic' }}>solo lugar.</em>
        </h1>
        <p style={{ fontSize: '15px', color: '#888885', fontWeight: 300, maxWidth: '480px', lineHeight: 1.7 }}>
          Plataforma de recursos para el equipo Bondy, recruiters y equipos de hiring en LATAM.
        </p>
      </section>

      {/* Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '1px solid #EBEBEB' }}>
        {sections.map((s, i) => (
          s.available ? (
            <Link key={s.href} href={s.href} style={{
              borderRight: i < sections.length - 1 ? '1px solid #EBEBEB' : 'none',
              padding: '40px 36px',
              display: 'flex', flexDirection: 'column',
              textDecoration: 'none', color: 'inherit',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.6)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D8D6D2', marginBottom: '32px' }}>{s.number}</div>
              <h2 className="font-display" style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.01em', color: '#111111', marginBottom: '12px', lineHeight: 1.2 }}>
                {s.title}<br /><em style={{ color: '#E05C00', fontStyle: 'italic' }}>{s.titleItalic}</em>
              </h2>
              <p style={{ fontSize: '13px', color: '#888885', fontWeight: 300, lineHeight: 1.7, marginBottom: '32px', flex: 1 }}>{s.description}</p>
              <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#E05C00' }}>
                Entrar →
              </div>
            </Link>
          ) : (
            <div key={s.href} style={{
              borderRight: i < sections.length - 1 ? '1px solid #EBEBEB' : 'none',
              padding: '40px 36px',
              display: 'flex', flexDirection: 'column',
              opacity: 0.4,
            }}>
              <div className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#D8D6D2', marginBottom: '32px' }}>{s.number}</div>
              <h2 className="font-display" style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.01em', color: '#111111', marginBottom: '12px', lineHeight: 1.2 }}>
                {s.title}<br /><em style={{ color: '#E05C00', fontStyle: 'italic' }}>{s.titleItalic}</em>
              </h2>
              <p style={{ fontSize: '13px', color: '#888885', fontWeight: 300, lineHeight: 1.7, marginBottom: '32px', flex: 1 }}>{s.description}</p>
              <div className="font-mono-bondy" style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D8D6D2', border: '1px solid #EBEBEB', padding: '4px 10px', display: 'inline-block' }}>
                Próximamente
              </div>
            </div>
          )
        ))}
      </section>

      {/* Footer bar */}
      <div style={{ padding: '20px 64px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#D8D6D2', textTransform: 'uppercase' }}>
          © {new Date().getFullYear()} Bondy Group
        </span>
        <a href="https://newbondy.wearebondy.com" target="_blank" rel="noopener noreferrer"
          className="font-mono-bondy" style={{ fontSize: '10px', letterSpacing: '0.1em', color: '#D8D6D2', textTransform: 'uppercase', textDecoration: 'none' }}>
          wearebondy.com ↗
        </a>
      </div>

    </main>
  )
}
