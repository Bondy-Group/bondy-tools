'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════════
   Bondy Tools landing — v2 (Brand v4)
   Spec: design_handoff_bondy_tools_landing/README.md
   Implementation target: final-landing.{jsx,css} + Pressed-Paper CardB
   Scoped under .btl-root in globals.css to avoid leaking globals.
   ═══════════════════════════════════════════════════════════════════ */

const BondyLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4"  y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" />
    <rect x="22" y="5"  width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
    <rect x="4"  y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
  </svg>
)

const BondyUnderline = ({ width = 420, color = '#4A8C40' }) => {
  const mid = width / 2
  return (
    <svg width={width} height="8" viewBox={`0 0 ${width} 8`} fill="none" style={{ display: 'block', maxWidth: '100%' }}>
      <path d={`M0 4 Q${mid * 0.5} 1 ${mid} 4 Q${mid * 1.5} 7 ${width} 4`} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  )
}

const CONTENT = {
  es: {
    backToSite: '← wearebondy.com',
    kicker: 'tools.wearebondy.com · v2',
    titleLeft: 'Bondy ',
    titleEm: 'Tools.',
    ledeStrong: 'Cuatro puertas. Una sola obsesión:',
    ledeRest: ' hacer mejor el trabajo de contratar y de buscar trabajo. Algunas piezas son para nuestro equipo, otras para los recruiters y hiring managers, y otras para cualquiera buscando un próximo paso.',
    metaTools: 'herramientas',
    metaAudiences: 'audiencias',
    metaSince: 'desde',
    pillsAll: 'Todas',
    pillsLive: 'Activas',
    pillsSoon: 'Próximamente',
    sectionLeft: '— Las cuatro puertas',
    sectionRight: 'mostrando',
    footLeft: '© 2026 Bondy Group · Buenos Aires',
    footRight: 'wearebondy.com ↗',
    audiences: [
      {
        num: '01',
        kicker: 'Equipo · Bondy',
        title: 'Equipo Bondy',
        titleEm: 'Bondy',
        desc: 'Plataforma interna del equipo. Acceso con login.',
        tools: ['Asistente de informes', 'Extensión de Chrome', 'Scorecards', 'Recursos del equipo'],
        cta: 'Entrar →',
        href: '/internal',
        status: 'live',
        statusLabel: 'Activo · Login',
      },
      {
        num: '02',
        kicker: 'Recruiters',
        title: 'Recursos para Recruiters',
        titleEm: 'Recruiters',
        desc: 'Herramientas y materiales gratuitos para equipos de talent acquisition en LATAM.',
        tools: ['Plantillas de outreach', 'Calibradores de búsqueda', 'Guías de scorecard'],
        cta: 'Entrar →',
        href: '/recursos-recruiters',
        status: 'live',
        statusLabel: 'Activo · Sin login',
      },
      {
        num: '03',
        kicker: 'Hiring Managers · VPs · CEOs',
        title: 'Hiring Strategy',
        titleEm: 'Strategy',
        desc: 'Guías para hiring managers y fondos planeando su estrategia de contratación en LATAM.',
        tools: ['Modelos de planning', 'Benchmarks de comp.', 'Frameworks de calibración'],
        cta: 'Próximamente',
        href: '#',
        status: 'soon',
        statusLabel: 'Próximamente',
      },
      {
        num: '04',
        kicker: 'Candidatos · Talento',
        title: 'Busco Trabajo',
        titleEm: 'Trabajo',
        desc: 'Roles tech abiertos en LATAM y worldwide, actualizados a diario. Filtrá por categoría, modalidad, seniority y tecnología.',
        tools: ['Roles abiertos', 'Filtros por modalidad', 'Salarios publicados', 'Aplicación guiada'],
        cta: 'Entrar →',
        href: '/busco-trabajo',
        status: 'live',
        statusLabel: 'Activo · Sin login',
      },
    ],
  },
  en: {
    backToSite: '← wearebondy.com',
    kicker: 'tools.wearebondy.com · v2',
    titleLeft: 'Bondy ',
    titleEm: 'Tools.',
    ledeStrong: 'Four doors. One obsession:',
    ledeRest: ' make hiring and being hired better. Some pieces are for our team, others for recruiters and hiring managers, and others for anyone looking for a next step.',
    metaTools: 'tools',
    metaAudiences: 'audiences',
    metaSince: 'since',
    pillsAll: 'All',
    pillsLive: 'Live',
    pillsSoon: 'Coming soon',
    sectionLeft: '— The four doors',
    sectionRight: 'showing',
    footLeft: '© 2026 Bondy Group · Buenos Aires',
    footRight: 'wearebondy.com ↗',
    audiences: [
      {
        num: '01',
        kicker: 'Team · Bondy',
        title: 'Bondy Team',
        titleEm: 'Team',
        desc: 'Internal team platform. Login required.',
        tools: ['Report assistant', 'Chrome extension', 'Scorecards', 'Team resources'],
        cta: 'Enter →',
        href: '/internal',
        status: 'live',
        statusLabel: 'Live · Login',
      },
      {
        num: '02',
        kicker: 'Recruiters',
        title: 'Recruiter Resources',
        titleEm: 'Resources',
        desc: 'Free tools and materials for LATAM talent acquisition teams.',
        tools: ['Outreach templates', 'Search calibrators', 'Scorecard guides'],
        cta: 'Enter →',
        href: '/recursos-recruiters',
        status: 'live',
        statusLabel: 'Live · No login',
      },
      {
        num: '03',
        kicker: 'Hiring Managers · VPs · CEOs',
        title: 'Hiring Strategy',
        titleEm: 'Strategy',
        desc: 'Playbooks for hiring managers and funds planning their LATAM hiring strategy.',
        tools: ['Planning models', 'Comp. benchmarks', 'Calibration frameworks'],
        cta: 'Coming soon',
        href: '#',
        status: 'soon',
        statusLabel: 'Coming soon',
      },
      {
        num: '04',
        kicker: 'Candidates · Talent',
        title: 'Busco Trabajo',
        titleEm: 'Trabajo',
        desc: 'Open tech roles in LATAM and worldwide, updated daily. Filter by category, modality, seniority and stack.',
        tools: ['Open roles', 'Modality filters', 'Published salaries', 'Guided apply'],
        cta: 'Enter →',
        href: '/busco-trabajo',
        status: 'live',
        statusLabel: 'Live · No login',
      },
    ],
  },
}

function Card({ a }) {
  const isSoon = a.status === 'soon'
  // Replace last word in title with the em wrap
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

export default function HomePage() {
  const [lang, setLang] = useState('es')
  const [filter, setFilter] = useState('all')
  const [mounted, setMounted] = useState(false)

  // Hydrate language from localStorage after mount
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
  const all = c.audiences
  const liveCount = all.filter(a => a.status === 'live').length
  const soonCount = all.filter(a => a.status === 'soon').length
  const filtered = filter === 'live' ? all.filter(a => a.status === 'live')
    : filter === 'soon' ? all.filter(a => a.status === 'soon')
    : all

  return (
    <main className="btl-root">
      {/* Top bar */}
      <header className="btl-bar">
        <Link href="/" className="btl-bar__brand">
          <BondyLogo size={22} />
          <span className="btl-bar__brand-name">Bondy Tools</span>
        </Link>
        <div className="btl-bar__right">
          <a href="https://wearebondy.com" className="btl-bar__back">{c.backToSite}</a>
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
        {/* Hero */}
        <section className="btl-hero">
          <div className="btl-kicker">
            <div className="btl-kicker__rule" />
            <span className="btl-kicker__text">{c.kicker}</span>
          </div>
          <h1 className="btl-hero__title">
            {c.titleLeft}
            <span className="btl-hero__title-tools">
              <em>{c.titleEm}</em>
              <span className="btl-hero__under"><BondyUnderline width={420} /></span>
            </span>
          </h1>
          <div className="btl-hero__row">
            <p className="btl-hero__lede">
              <strong>{c.ledeStrong}</strong>{c.ledeRest}
            </p>
            <div className="btl-hero__meta">
              <div><strong>04</strong> · {c.metaTools}</div>
              <div><strong>03</strong> · {c.metaAudiences}</div>
              <div>{c.metaSince} <strong>2008</strong></div>
            </div>
          </div>
        </section>

        {/* Filter pills */}
        <div className="btl-pills">
          <button type="button" className={`btl-pill ${filter === 'all' ? 'is-active' : ''}`} onClick={() => setFilter('all')}>
            {c.pillsAll} <span className="btl-pill__count">{all.length}</span>
          </button>
          <button type="button" className={`btl-pill ${filter === 'live' ? 'is-active' : ''}`} onClick={() => setFilter('live')}>
            {c.pillsLive} <span className="btl-pill__count">{liveCount}</span>
          </button>
          <button type="button" className={`btl-pill ${filter === 'soon' ? 'is-active' : ''}`} onClick={() => setFilter('soon')}>
            {c.pillsSoon} <span className="btl-pill__count">{soonCount}</span>
          </button>
        </div>

        <div className="btl-sec-label">
          <span className="btl-sec-label__l">{c.sectionLeft}</span>
          <span className="btl-sec-label__r">{filtered.length} {c.sectionRight}</span>
        </div>

        {/* Grid */}
        <div className="btl-grid">
          {filtered.map((a) => <Card key={a.num} a={a} />)}
        </div>

        {/* Footer */}
        <footer className="btl-foot">
          <span>{c.footLeft}</span>
          <a href="https://wearebondy.com">{c.footRight}</a>
        </footer>
      </div>
    </main>
  )
}
