'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import SesionesCarreraCard from '@/app/_components/SesionesCarrera'

/* ═══════════════════════════════════════════════════════════════════
   Busco Trabajo — sub-hub para candidatos bajo tools.wearebondy.com
   Reusa el sistema visual btl (.btl-* en globals.css), patrón gemelo
   a /recursos-recruiters/page.js.

   Las 4 tarjetas activas linkean a:
   - Job board scrappeado: /busco-trabajo/jobs-tech (interno)
   - Búsquedas Bondy: wearebondy.com/{lang}/roles (externo)
   - Sumar perfil al talent pool: wearebondy.com/{lang}/sumar-perfil (externo)
   - Referidos: wearebondy.com/{lang}/referrals (externo)

   Market Pulse + Alertas personalizadas quedan como "próximamente".
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
    kicker: 'tools.wearebondy.com · busco trabajo',
    titleLeft: 'Busco ',
    titleEm: 'Trabajo.',
    ledeStrong: 'Una caja de herramientas para candidatos tech.',
    ledeRest: ' Roles activos, búsquedas exclusivas de Bondy, intel del mercado y un atajo para que las búsquedas correctas te encuentren a vos.',
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
        kicker: 'Job board · Tech',
        title: 'Jobs Tech',
        titleEm: 'Tech',
        desc: 'Sin avisos viejos: agregamos posiciones de varias fuentes todos los días y solo dejamos a la vista lo publicado en las últimas 72 horas. Volvé mañana, vas a ver otras. Sin login, sin fricción. Curados con el mismo criterio que aplicamos a nuestras búsquedas embebidas — si no pasa nuestro filtro, no lo listamos.',
        tools: ['Software engineering', 'Data & AI', 'DevOps / SRE', 'Producto / Diseño'],
        cta: 'Entrar →',
        href: '/busco-trabajo/jobs-tech',
        external: false,
        status: 'live',
        statusLabel: 'Activo · Sin login',
      },
      {
        num: '02',
        kicker: 'Búsquedas Bondy · Exclusivas',
        title: 'Roles Bondy',
        titleEm: 'Bondy',
        desc: 'Roles que estamos sourceando directo con nuestros clientes. Aplicás vía Bondy, te acompañamos en todo el proceso. Curadas, embebidas y con feedback honesto.',
        tools: ['Sourcing directo', 'Feedback de proceso', 'Acompañamiento'],
        cta: 'Ver roles →',
        href: 'https://wearebondy.com/es/roles',
        external: true,
        status: 'live',
        statusLabel: 'Activo · Sin login',
      },
      {
        num: '03',
        kicker: 'Talent pool',
        title: 'Sumar tu Perfil',
        titleEm: 'Perfil',
        desc: 'No tenés que estar buscando hoy. Sumate al pool de Bondy y te contactamos cuando aparece una búsqueda que matchea tu stack y senioridad.',
        tools: ['Sin login', '5 min', 'Editable después'],
        cta: 'Sumarme →',
        href: 'https://wearebondy.com/es/sumar-perfil',
        external: true,
        status: 'live',
        statusLabel: 'Activo · Sin login',
      },
      {
        num: '04',
        kicker: 'Referidos',
        title: 'Referir a alguien',
        titleEm: 'alguien',
        desc: '¿Conocés a alguien que encaja en una búsqueda? Si lo contratamos, vos cobrás. Programa de referidos abierto, sin trabas.',
        tools: ['USD 1.000 por contratación', 'Sin trabas', 'Pago al cierre'],
        cta: 'Referir →',
        href: 'https://wearebondy.com/es/referrals',
        external: true,
        status: 'live',
        statusLabel: 'Activo · Sin login',
      },
      {
        num: '05',
        kicker: 'Intel · Mercado tech',
        title: 'Market Pulse',
        titleEm: 'Pulse',
        desc: 'Qué skills mandan, qué empresas más contratan y dónde están las oportunidades. Data real del mercado LATAM y US remoto, actualizada cada día.',
        tools: ['Skills emergentes', 'Top empresas hiring', 'Tendencias mes a mes'],
        cta: 'Entrar →',
        href: '/busco-trabajo/pulse',
        external: false,
        status: 'live',
        statusLabel: 'Activo · Sin login',
      },
      {
        num: '06',
        kicker: 'Alertas',
        title: 'Alertas Personalizadas',
        titleEm: 'Personalizadas',
        desc: 'Email solo cuando aparece un rol que matchea tus filtros — stack, seniority, modalidad y país. Evolución del digest semanal actual.',
        tools: ['Filtros por stack', 'Filtros por seniority', 'Sin spam'],
        cta: 'Próximamente',
        href: '#',
        external: false,
        status: 'soon',
        statusLabel: 'Próximamente',
      },
    ],
  },
  en: {
    backToTools: '← tools.wearebondy.com',
    kicker: 'tools.wearebondy.com · job search',
    titleLeft: 'Job ',
    titleEm: 'Search.',
    ledeStrong: 'A toolbox for tech candidates.',
    ledeRest: ' Live open roles, Bondy exclusive searches, market intel and a shortcut so the right searches find you.',
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
        kicker: 'Job board · Tech',
        title: 'Tech Jobs',
        titleEm: 'Jobs',
        desc: 'No stale listings: we add roles from multiple sources every day and only surface what was published in the last 72 hours. Come back tomorrow, you will see new ones. No login, no friction. Curated with the same filter we apply to our embedded searches — if it does not pass, we do not list it.',
        tools: ['Software engineering', 'Data & AI', 'DevOps / SRE', 'Product / Design'],
        cta: 'Enter →',
        href: '/busco-trabajo/jobs-tech',
        external: false,
        status: 'live',
        statusLabel: 'Live · No login',
      },
      {
        num: '02',
        kicker: 'Bondy searches · Exclusive',
        title: 'Bondy Roles',
        titleEm: 'Roles',
        desc: 'Roles we are sourcing directly with our clients. You apply through Bondy, we walk you through the whole process. Curated, embedded, honest feedback.',
        tools: ['Direct sourcing', 'Process feedback', 'Hand-held'],
        cta: 'See roles →',
        href: 'https://wearebondy.com/en/roles',
        external: true,
        status: 'live',
        statusLabel: 'Live · No login',
      },
      {
        num: '03',
        kicker: 'Talent pool',
        title: 'Join the Pool',
        titleEm: 'Pool',
        desc: 'You do not have to be actively looking. Join the Bondy talent pool and we reach out when a search matches your stack and seniority.',
        tools: ['No login', '5 min', 'Editable later'],
        cta: 'Join →',
        href: 'https://wearebondy.com/en/sumar-perfil',
        external: true,
        status: 'live',
        statusLabel: 'Live · No login',
      },
      {
        num: '04',
        kicker: 'Referrals',
        title: 'Refer Someone',
        titleEm: 'Someone',
        desc: 'Know someone who fits an open role? If we hire them, you get paid. Open referral program, no strings attached.',
        tools: ['USD 1,000 per hire', 'No strings', 'Paid at close'],
        cta: 'Refer →',
        href: 'https://wearebondy.com/en/referrals',
        external: true,
        status: 'live',
        statusLabel: 'Live · No login',
      },
      {
        num: '05',
        kicker: 'Intel · Tech market',
        title: 'Market Pulse',
        titleEm: 'Pulse',
        desc: 'Which skills are in demand, which companies are hiring most and where the opportunities are. Real LATAM and US remote market data, updated daily.',
        tools: ['Emerging skills', 'Top hiring companies', 'Month-over-month trends'],
        cta: 'Enter →',
        href: '/busco-trabajo/pulse',
        external: false,
        status: 'live',
        statusLabel: 'Live · No login',
      },
      {
        num: '06',
        kicker: 'Alerts',
        title: 'Custom Alerts',
        titleEm: 'Alerts',
        desc: 'Email only when a role matches your filters — stack, seniority, modality and country. Evolution of the current weekly digest.',
        tools: ['Stack filters', 'Seniority filters', 'No spam'],
        cta: 'Coming soon',
        href: '#',
        external: false,
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
  if (a.external) {
    return <a href={a.href} target="_blank" rel="noopener noreferrer" className="btl-card">{inner}</a>
  }
  return <Link href={a.href} className="btl-card">{inner}</Link>
}

export default function BuscoTrabajoLandingClient() {
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
              <div><strong>{String(all.length + 1).padStart(2, '0')}</strong> · {c.metaTools}</div>
              <div><strong>01</strong> · {c.metaAudience}</div>
              <div>{c.metaSince} <strong>2008</strong></div>
            </div>
          </div>
        </section>

        <div className="btl-sec-label">
          <span className="btl-sec-label__l">{c.sectionLeft}</span>
          <span className="btl-sec-label__r">{liveCount + 1} · {c.sectionRight}</span>
        </div>

        <div className="btl-grid">
          {all.map((a) => <Card key={a.num} a={a} />)}
          <SesionesCarreraCard pagina="busco-trabajo" lang={lang} num="07" />
        </div>

        <footer className="btl-foot">
          <span>{c.footLeft}</span>
          <a href="https://wearebondy.com">{c.footRight}</a>
        </footer>
      </div>
    </main>
  )
}
