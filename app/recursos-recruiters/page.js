'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════════
   Recursos para Recruiters — sub-hub bajo tools.wearebondy.com
   Reusa el sistema visual de la landing v2 (.btl-* en globals.css).
   ═══════════════════════════════════════════════════════════════════ */

const BondyLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4"  y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" />
    <rect x="22" y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
    <rect x="4"  y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
  </svg>
)

const BondyUnderline = ({ width = 360, color = '#4A8C40' }) => {
  const mid = width / 2
  return (
    <svg width={width} height="8" viewBox={`0 0 ${width} 8`} fill="none" style={{ display: 'block', maxWidth: '100%' }}>
      <path d={`M0 4 Q${mid * 0.5} 1 ${mid} 4 Q${mid * 1.5} 7 ${width} 4`} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

const CONTENT = {
  es: {
    backToTools: '← tools.wearebondy.com',
    kicker: 'tools.wearebondy.com · recursos para recruiters',
    titleLeft: 'Recursos para ',
    titleEm: 'Recruiters.',
    ledeStrong: 'Una caja de herramientas para gente de talent.',
    ledeRest: ' Materiales gratuitos para recruiters, sourcers, talent acquisition y people ops trabajando con equipos tech en LATAM. Empezamos por un job board específico para roles de recruiting.',
    metaTools: 'tools',
    metaAudience: 'audiencia',
    metaSince: 'desde',
    sectionLeft: '— Las herramientas',
    sectionRight: 'mostrando',
    footLeft: '© 2026 Bondy Group · Buenos Aires',
    footRight: 'wearebondy.com ↗',
    tools: [
      {
        num: '01',
        kicker: 'Job board · Recruiters',
        title: 'Busco Trabajo',
        titleEm: 'Trabajo',
        desc: 'Roles abiertos de recruiting, sourcing, talent acquisition, people ops y talent development en LATAM y worldwide. Actualizados a diario.',
        tools: ['Recruiter / Sourcer', 'Talent Acquisition', 'People Ops', 'Talent Development'],
        cta: 'Entrar →',
        href: '/recursos-recruiters/busco-trabajo',
        status: 'live',
        statusLabel: 'Activo · Sin login',
      },
      {
        num: '02',
        kicker: 'Intel · Mercado tech',
        title: 'Market Pulse',
        titleEm: 'Pulse',
        desc: 'Qué skills están subiendo, qué empresas más contratan tech, top stacks por categoría. Data real del mercado LATAM y US remoto, actualizada cada día.',
        tools: ['Skills en alza', 'Top empresas hiring', 'Tendencias mes a mes'],
        cta: 'Entrar →',
        href: '/recursos-recruiters/pulse',
        status: 'live',
        statusLabel: 'Activo · Sin login',
      },
      {
        num: '03',
        kicker: 'Outreach',
        title: 'Plantillas de Outreach',
        titleEm: 'Outreach',
        desc: 'Plantillas y frameworks para escribir primer-touch que abre conversaciones con candidatos pasivos en tech.',
        tools: ['First-touch', 'Follow-up', 'Calibradores'],
        cta: 'Próximamente',
        href: '#',
        status: 'soon',
        statusLabel: 'Próximamente',
      },
      {
        num: '04',
        kicker: 'Calibración',
        title: 'Calibradores de búsqueda',
        titleEm: 'búsqueda',
        desc: 'Cómo armar una scorecard que sirva, cómo calibrar con hiring managers difíciles, cómo saber si un perfil cuelga antes de la entrevista técnica.',
        tools: ['Scorecards', 'Calibración inicial', 'Señales tempranas'],
        cta: 'Próximamente',
        href: '#',
        status: 'soon',
        statusLabel: 'Próximamente',
      },
    ],
  },
  en: {
    backToTools: '← tools.wearebondy.com',
    kicker: 'tools.wearebondy.com · recruiter resources',
    titleLeft: 'Recruiter ',
    titleEm: 'Resources.',
    ledeStrong: 'A toolbox for talent people.',
    ledeRest: ' Free materials for recruiters, sourcers, talent acquisition and people ops working with tech teams across LATAM. We are starting with a job board specifically for recruiting roles.',
    metaTools: 'tools',
    metaAudience: 'audience',
    metaSince: 'since',
    sectionLeft: '— The tools',
    sectionRight: 'showing',
    footLeft: '© 2026 Bondy Group · Buenos Aires',
    footRight: 'wearebondy.com ↗',
    tools: [
      {
        num: '01',
        kicker: 'Job board · Recruiters',
        title: 'Open Roles',
        titleEm: 'Roles',
        desc: 'Open roles in recruiting, sourcing, talent acquisition, people ops and talent development across LATAM and worldwide. Updated daily.',
        tools: ['Recruiter / Sourcer', 'Talent Acquisition', 'People Ops', 'Talent Development'],
        cta: 'Enter →',
        href: '/recursos-recruiters/busco-trabajo',
        status: 'live',
        statusLabel: 'Live · No login',
      },
      {
        num: '02',
        kicker: 'Intel · Tech market',
        title: 'Market Pulse',
        titleEm: 'Pulse',
        desc: 'Which skills are rising, which companies are hiring most tech, top stacks by category. Real LATAM and US remote market data, updated daily.',
        tools: ['Rising skills', 'Top hiring companies', 'Month-over-month trends'],
        cta: 'Enter →',
        href: '/recursos-recruiters/pulse',
        status: 'live',
        statusLabel: 'Live · No login',
      },
      {
        num: '03',
        kicker: 'Outreach',
        title: 'Outreach Templates',
        titleEm: 'Templates',
        desc: 'Templates and frameworks for first-touch messages that actually open conversations with passive tech candidates.',
        tools: ['First-touch', 'Follow-up', 'Calibrators'],
        cta: 'Coming soon',
        href: '#',
        status: 'soon',
        statusLabel: 'Coming soon',
      },
      {
        num: '04',
        kicker: 'Calibration',
        title: 'Search Calibrators',
        titleEm: 'Calibrators',
        desc: 'How to build a useful scorecard, how to calibrate with tough hiring managers, how to spot a misalignment before the technical interview.',
        tools: ['Scorecards', 'Initial calibration', 'Early signals'],
        cta: 'Coming soon',
        href: '#',
        status: 'soon',
        statusLabel: 'Coming soon',
      },
    ],
  },
}

function Card({ a }) {
  const isSoon = a.status === 'soon'
  const titleHead = a.title.replace(new RegExp(`${a.titleEm}$`), '').trim()

  const inner = (
    <>
      <div className="btl-card__top">
        <span className="btl-card__num">{a.num}</span>
        <span className={`btl-card__stamp ${isSoon ? 'is-soon' : ''}`}>{a.statusLabel}</span>
      </div>
      <div className="btl-card__kicker">— {a.kicker}</div>
      <h3 className="btl-card__title">
        {titleHead} <em>{a.titleEm}.</em>
      </h3>
      <p className="btl-card__desc">{a.desc}</p>
      <div className="btl-card__bottom">
        <div className="btl-card__tools">
          {a.tools.slice(0, 3).map((t, j) => (
            <span key={j} className="btl-card__tool">{t}</span>
          ))}
        </div>
        <span className="btl-card__cta">{a.cta}</span>
      </div>
    </>
  )

  if (isSoon) {
    return <div className="btl-card is-soon" aria-disabled="true">{inner}</div>
  }
  return <Link href={a.href} className="btl-card">{inner}</Link>
}

export default function RecursosRecruitersPage() {
  const [lang, setLang] = useState('es')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const saved = window.localStorage.getItem('bondy_tools_lang')
      if (saved === 'es' || saved === 'en') setLang(saved)
    } catch {}
  }, [])

  useEffect(() => {
    if (mounted) {
      try { window.localStorage.setItem('bondy_tools_lang', lang) } catch {}
    }
  }, [lang, mounted])

  const c = CONTENT[lang]
  const all = c.tools
  const liveCount = all.filter(a => a.status === 'live').length

  return (
    <main className="btl-root">
      <header className="btl-bar">
        <Link href="/" className="btl-bar__brand">
          <BondyLogo size={22} />
          <span className="btl-bar__brand-name">Bondy Tools</span>
        </Link>
        <div className="btl-bar__right">
          <Link href="/" className="btl-bar__back">{c.backToTools}</Link>
          <span className="btl-bar__sep" />
          <div className="btl-lang">
            <span
              className={lang === 'es' ? 'is-active' : ''}
              onClick={() => setLang('es')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLang('es') }}
            >ES</span>
            <i>/</i>
            <span
              className={lang === 'en' ? 'is-active' : ''}
              onClick={() => setLang('en')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setLang('en') }}
            >EN</span>
          </div>
        </div>
      </header>

      <div className="btl-content">
        <section className="btl-hero">
          <div className="btl-kicker">
            <div className="btl-kicker__rule" />
            <span className="btl-kicker__text">{c.kicker}</span>
          </div>
          <h1 className="btl-hero__title">
            {c.titleLeft}
            <span className="btl-hero__title-tools">
              <em>{c.titleEm}</em>
              <span className="btl-hero__under"><BondyUnderline width={360} /></span>
            </span>
          </h1>
          <div className="btl-hero__row">
            <p className="btl-hero__lede">
              <strong>{c.ledeStrong}</strong>{c.ledeRest}
            </p>
            <div className="btl-hero__meta">
              <div><strong>{String(all.length).padStart(2, '0')}</strong> · {c.metaTools}</div>
              <div><strong>01</strong> · {c.metaAudience}</div>
              <div>{c.metaSince} <strong>2008</strong></div>
            </div>
          </div>
        </section>

        <div className="btl-sec-label">
          <span className="btl-sec-label__l">{c.sectionLeft}</span>
          <span className="btl-sec-label__r">{liveCount} · {c.sectionRight}</span>
        </div>

        <div className="btl-grid">
          {all.map((a) => <Card key={a.num} a={a} />)}
        </div>

        <footer className="btl-foot">
          <span>{c.footLeft}</span>
          <a href="https://wearebondy.com">{c.footRight}</a>
        </footer>
      </div>
    </main>
  )
}
