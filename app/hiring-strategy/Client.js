'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════════
   Hiring Strategy — sub-hub para hiring managers, VPs y CEOs
   bajo tools.wearebondy.com. Reusa el sistema visual btl.
   Patrón gemelo a /recursos-recruiters/page.js y /busco-trabajo/Client.js.
   Por ahora todas las tools son "próximamente". El primer release
   será Market Pulse (PR 2).
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
    kicker: 'tools.wearebondy.com · hiring strategy',
    titleLeft: 'Hiring ',
    titleEm: 'Strategy.',
    ledeStrong: 'Una caja de herramientas para hiring managers, VPs y fondos.',
    ledeRest: ' Datos del mercado tech LATAM, benchmarks de compensación y playbooks de calibración para que tu próxima contratación no dependa del gut feeling.',
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
        kicker: 'Intel · Mercado tech',
        title: 'Market Pulse',
        titleEm: 'Pulse',
        desc: 'Qué pide tu industria, qué piden tus competidores, empresas activas hiring el mismo perfil que vos y time-to-fill estimado. Data real del mercado, actualizada cada día.',
        tools: ['Lo que pide tu industria', 'Tus competidores', 'Time-to-fill'],
        cta: 'Entrar →',
        href: '/hiring-strategy/pulse',
        status: 'live',
        statusLabel: 'Activo · Sin login',
      },
      {
        num: '02',
        kicker: 'Compensación',
        title: 'Comp Benchmarks',
        titleEm: 'Benchmarks',
        desc: 'Cuánto deberías pagar para ese rol, en ese país, en esa industria. Benchmarks de compensación basados en JDs reales del mercado LATAM y US remoto.',
        tools: ['Por stack', 'Por seniority', 'Por país'],
        cta: 'Próximamente',
        href: '#',
        status: 'soon',
        statusLabel: 'Próximamente',
      },
      {
        num: '03',
        kicker: 'Calibración',
        title: 'Frameworks de Calibración',
        titleEm: 'Calibración',
        desc: 'Cómo armar una scorecard que sirva, cómo calibrar al equipo antes de arrancar, cómo evitar las trampas clásicas en la primera ronda. Material gratuito, sin embudo.',
        tools: ['Scorecards', 'Calibración inicial', 'Primera ronda'],
        cta: 'Próximamente',
        href: '#',
        status: 'soon',
        statusLabel: 'Próximamente',
      },
    ],
  },
  en: {
    backToTools: '← tools.wearebondy.com',
    kicker: 'tools.wearebondy.com · hiring strategy',
    titleLeft: 'Hiring ',
    titleEm: 'Strategy.',
    ledeStrong: 'A toolbox for hiring managers, VPs and funds.',
    ledeRest: ' LATAM tech market data, compensation benchmarks and calibration playbooks so your next hire does not depend on gut feeling.',
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
        kicker: 'Intel · Tech market',
        title: 'Market Pulse',
        titleEm: 'Pulse',
        desc: 'What your industry asks for, what your competitors ask for, companies actively hiring the same profile and estimated time-to-fill. Real market data, updated daily.',
        tools: ['What your industry wants', 'Your competitors', 'Time-to-fill'],
        cta: 'Enter →',
        href: '/hiring-strategy/pulse',
        status: 'live',
        statusLabel: 'Live · No login',
      },
      {
        num: '02',
        kicker: 'Compensation',
        title: 'Comp Benchmarks',
        titleEm: 'Benchmarks',
        desc: 'How much you should pay for that role, in that country, in that industry. Compensation benchmarks based on real JDs from LATAM and US remote markets.',
        tools: ['By stack', 'By seniority', 'By country'],
        cta: 'Coming soon',
        href: '#',
        status: 'soon',
        statusLabel: 'Coming soon',
      },
      {
        num: '03',
        kicker: 'Calibration',
        title: 'Calibration Frameworks',
        titleEm: 'Frameworks',
        desc: 'How to build a scorecard that actually works, how to calibrate the team before kickoff, how to avoid the classic first-round traps. Free material, no funnel.',
        tools: ['Scorecards', 'Initial calibration', 'First round'],
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

export default function HiringStrategyClient() {
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
