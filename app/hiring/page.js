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

/* ── Icons ── */
const IconRadar = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="20" cy="20" r="13" stroke="#4A8C40" strokeWidth="1.5"/>
    <circle cx="20" cy="20" r="7"  stroke="#4A8C40" strokeWidth="1.5"/>
    <circle cx="20" cy="20" r="2"  fill="#4A8C40"/>
    <line x1="20" y1="7"  x2="20" y2="33" stroke="#4A8C40" strokeWidth="1" strokeDasharray="2 3"/>
    <line x1="7"  y1="20" x2="33" y2="20" stroke="#4A8C40" strokeWidth="1" strokeDasharray="2 3"/>
  </svg>
)

const IconSalary = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="5" y="10" width="30" height="20" rx="2" stroke="#7A7874" strokeWidth="1.5"/>
    <circle cx="20" cy="20" r="5" stroke="#7A7874" strokeWidth="1.5"/>
    <line x1="5"  y1="15" x2="11" y2="15" stroke="#7A7874" strokeWidth="1.5"/>
    <line x1="29" y1="15" x2="35" y2="15" stroke="#7A7874" strokeWidth="1.5"/>
    <line x1="5"  y1="25" x2="11" y2="25" stroke="#7A7874" strokeWidth="1.5"/>
    <line x1="29" y1="25" x2="35" y2="25" stroke="#7A7874" strokeWidth="1.5"/>
  </svg>
)

const IconJD = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <rect x="8" y="5" width="20" height="26" rx="2" stroke="#7A7874" strokeWidth="1.5"/>
    <line x1="13" y1="12" x2="23" y2="12" stroke="#7A7874" strokeWidth="1.5"/>
    <line x1="13" y1="17" x2="23" y2="17" stroke="#7A7874" strokeWidth="1.5"/>
    <line x1="13" y1="22" x2="19" y2="22" stroke="#7A7874" strokeWidth="1.5"/>
    <path d="M26 28l4-4 4 4-4 4-4-4z" stroke="#7A7874" strokeWidth="1.5" fill="none"/>
  </svg>
)

const IconRoadmap = () => (
  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
    <circle cx="8"  cy="12" r="3" stroke="#7A7874" strokeWidth="1.5"/>
    <circle cx="20" cy="20" r="3" stroke="#7A7874" strokeWidth="1.5"/>
    <circle cx="32" cy="28" r="3" stroke="#7A7874" strokeWidth="1.5"/>
    <line x1="11" y1="13.5" x2="17" y2="18.5" stroke="#7A7874" strokeWidth="1.5" strokeLinecap="round"/>
    <line x1="23" y1="21.5" x2="29" y2="26.5" stroke="#7A7874" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const tools = [
  {
    href: '/culture-quiz',
    number: '01',
    title: 'Culture Quiz',
    description: 'Completá el quiz y obtené un scorecard con el perfil cultural de tu empresa en 8 dimensiones clave.',
    icon: <IconRadar />,
    available: true,
  },
  {
    href: '#',
    number: '02',
    title: 'Salary Benchmarks LATAM',
    description: 'Rangos salariales actualizados para perfiles tech y de negocio en Argentina, Colombia, México y Brasil.',
    icon: <IconSalary />,
    available: false,
  },
  {
    href: '#',
    number: '03',
    title: 'Job Description Builder',
    description: 'Generá descripciones de roles optimizadas para el mercado LATAM con IA, listas para publicar.',
    icon: <IconJD />,
    available: false,
  },
  {
    href: '#',
    number: '04',
    title: 'Hiring Roadmap',
    description: 'Templates y guías para estructurar un proceso de contratación escalable y replicable desde cero.',
    icon: <IconRoadmap />,
    available: false,
  },
]

export default function HiringPage() {
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
            Hiring Strategy
          </span>
        </div>
        <Link href="/" style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.inkFaint, textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.color = tw.green}
          onMouseLeave={e => e.currentTarget.style.color = tw.inkFaint}
        >
          ← Bondy Tools
        </Link>
      </nav>

      {/* Header */}
      <section style={{ padding: '4rem clamp(1.25rem,5vw,4rem) 3rem', borderBottom: `1px solid ${tw.rule}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
          <div style={{ width: '22px', height: '1px', background: tw.green }} />
          <span style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: tw.green }}>
            03 — Hiring Strategy
          </span>
        </div>
        <h1 style={{ fontFamily: serif, fontSize: 'clamp(2.5rem,5vw,4rem)', lineHeight: 0.96, color: tw.inkMid, marginBottom: '0.5rem' }} className="tw-ink-heavy">
          Estrategia de<br />hiring en LATAM.
        </h1>
        <svg width="240" height="8" viewBox="0 0 240 8" fill="none" style={{ display: 'block', marginBottom: '1.5rem' }}>
          <path d="M0 4 Q60 1 120 4 Q180 7 240 4" stroke="#4A8C40" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </svg>
        <p style={{ fontFamily: mono, fontSize: '14px', color: tw.inkFaint, maxWidth: '480px', lineHeight: 1.7 }}>
          Guías y herramientas para hiring managers y fondos planeando su estrategia de talento en la región.
        </p>
      </section>

      {/* Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', borderBottom: `1px solid ${tw.rule}` }}>
        {tools.map((t, i) => (
          t.available ? (
            <Link key={t.href} href={t.href} style={{
              borderRight: i % 2 === 0 ? `1px solid ${tw.rule}` : 'none',
              borderBottom: i < tools.length - 2 ? `1px solid ${tw.rule}` : 'none',
              padding: '3rem clamp(1rem,3vw,2.5rem)',
              display: 'flex', flexDirection: 'column',
              textDecoration: 'none', color: 'inherit',
              background: i % 2 === 0 ? tw.white : tw.bg,
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(74,140,64,0.04)'}
            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? tw.white : tw.bg}
            >
              <div style={{ marginBottom: '1.5rem' }}>{t.icon}</div>
              <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: '1rem' }}>{t.number}</div>
              <h2 style={{ fontFamily: serif, fontSize: '1.4rem', color: tw.inkMid, marginBottom: '1rem', lineHeight: 1.2 }} className="tw-ink">{t.title}</h2>
              <p style={{ fontFamily: mono, fontSize: '13px', color: tw.inkSub, lineHeight: 1.7, marginBottom: '2rem', flex: 1 }}>{t.description}</p>
              <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: tw.green }}>
                Entrar →
              </div>
            </Link>
          ) : (
            <div key={t.href} style={{
              borderRight: i % 2 === 0 ? `1px solid ${tw.rule}` : 'none',
              borderBottom: i < tools.length - 2 ? `1px solid ${tw.rule}` : 'none',
              padding: '3rem clamp(1rem,3vw,2.5rem)',
              display: 'flex', flexDirection: 'column',
              opacity: 0.4,
            }}>
              <div style={{ marginBottom: '1.5rem' }}>{t.icon}</div>
              <div style={{ fontFamily: mono, fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: '1rem' }}>{t.number}</div>
              <h2 style={{ fontFamily: serif, fontSize: '1.4rem', color: tw.inkMid, marginBottom: '1rem', lineHeight: 1.2 }}>{t.title}</h2>
              <p style={{ fontFamily: mono, fontSize: '13px', color: tw.inkSub, lineHeight: 1.7, marginBottom: '2rem', flex: 1 }}>{t.description}</p>
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
