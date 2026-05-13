'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  MarketPulseHeader,
  MarketPulseFooter,
  StatCard,
  BarList,
  LineChart,
  DonutChart,
  Section,
  PulseSkeleton,
  useBondyLang,
} from '@/app/_components/market-pulse/MarketPulseShared'
import { monthLabel } from '@/lib/market-pulse/normalize'

const COPY = {
  es: {
    backLabel: '← Busco Trabajo',
    backHref: '/busco-trabajo',
    kicker: 'tools.wearebondy.com · busco trabajo · market pulse',
    titleLeft: 'El pulso del ',
    titleEm: 'mercado tech.',
    lede: (
      <>
        <strong>Para candidatos.</strong> Qué skills están en alza, qué empresas más contratan tech y dónde están las oportunidades hoy. Data real del mercado LATAM y US remoto — sale de JDs reales, no de encuestas, y se actualiza cada día.
      </>
    ),
    stats: {
      volume: 'roles publicados',
      volumeHint: 'últimos 30 días',
      remote: 'remoto',
      remoteHint: 'mayoría LATAM-friendly',
      companies: 'empresas hiring',
      companiesHint: 'distintas, últimos 30 días',
      rising: 'skill que más subió',
      risingHint: 'mes contra mes',
    },
    risingTitle: 'Skills que están explotando',
    risingKicker: 'tendencia mes a mes',
    risingBadgeNew: 'nuevo',
    topStacksTitle: 'Top stacks pedidos',
    topStacksKicker: 'últimos 30 días',
    trendsTitle: 'Evolución por mes',
    trendsKicker: 'últimos 6 meses',
    modalityTitle: 'Cómo se trabaja',
    modalityKicker: 'modalidad',
    seniorityTitle: 'Niveles más pedidos',
    seniorityKicker: 'seniority',
    companiesTitle: 'Quiénes más contratan',
    companiesKicker: 'top empresas activas',
    cta: 'Ver los roles abiertos ahora →',
    ctaHref: '/busco-trabajo/jobs-tech',
    risingPctLabel: (pct) => `+${pct}%`,
    risingNewLabel: 'no aparecía hace 30 días',
  },
  en: {
    backLabel: '← Job Search',
    backHref: '/busco-trabajo',
    kicker: 'tools.wearebondy.com · job search · market pulse',
    titleLeft: 'The pulse of the ',
    titleEm: 'tech market.',
    lede: (
      <>
        <strong>For candidates.</strong> Which skills are rising, which companies are hiring tech and where the opportunities are today. Real LATAM and US remote market data — straight from actual JDs, not surveys, refreshed daily.
      </>
    ),
    stats: {
      volume: 'open roles',
      volumeHint: 'last 30 days',
      remote: 'remote',
      remoteHint: 'mostly LATAM-friendly',
      companies: 'hiring companies',
      companiesHint: 'distinct, last 30 days',
      rising: 'top rising skill',
      risingHint: 'month over month',
    },
    risingTitle: 'Skills going exponential',
    risingKicker: 'month over month',
    risingBadgeNew: 'new',
    topStacksTitle: 'Top stacks in demand',
    topStacksKicker: 'last 30 days',
    trendsTitle: 'Monthly evolution',
    trendsKicker: 'last 6 months',
    modalityTitle: 'How people work',
    modalityKicker: 'modality',
    seniorityTitle: 'Most requested levels',
    seniorityKicker: 'seniority',
    companiesTitle: 'Who is hiring the most',
    companiesKicker: 'top active companies',
    cta: 'See open roles now →',
    ctaHref: '/busco-trabajo/jobs-tech',
    risingPctLabel: (pct) => `+${pct}%`,
    risingNewLabel: 'was not on the map 30 days ago',
  },
}

export default function MarketPulseCandidateClient() {
  const [lang, setLang] = useBondyLang()
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    fetch('/api/market-pulse')
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(setData)
      .catch(() => setErr(true))
  }, [])

  const c = COPY[lang]

  if (err) {
    return (
      <main className="btl-root mp-page">
        <MarketPulseHeader lang={lang} setLang={setLang} backHref={c.backHref} backLabel={c.backLabel} />
        <div className="mp-loading">
          <p>{lang === 'es' ? 'Hubo un problema cargando los datos. Probá refrescar en un minuto.' : 'Could not load the data. Try refreshing in a minute.'}</p>
        </div>
      </main>
    )
  }

  if (!data) {
    return (
      <main className="btl-root mp-page">
        <MarketPulseHeader lang={lang} setLang={setLang} backHref={c.backHref} backLabel={c.backLabel} />
        <PulseSkeleton lang={lang} />
      </main>
    )
  }

  const topRising = data.rising_skills[0]
  const monthLabels = data.trends.months.map(m => monthLabel(m, lang))

  return (
    <main className="btl-root mp-page">
      <MarketPulseHeader lang={lang} setLang={setLang} backHref={c.backHref} backLabel={c.backLabel} />

      <section className="mp-hero">
        <div className="mp-hero__kicker">{c.kicker}</div>
        <h1 className="mp-hero__title">{c.titleLeft}<em>{c.titleEm}</em></h1>
        <p className="mp-hero__lede">{c.lede}</p>
      </section>

      <div className="mp-statgrid">
        <StatCard
          label={c.stats.volume}
          value={data.volume.last_30d.toLocaleString()}
          hint={c.stats.volumeHint}
        />
        <StatCard
          label={c.stats.remote}
          value={data.volume.remote_pct != null ? data.volume.remote_pct : '—'}
          suffix={data.volume.remote_pct != null ? '%' : ''}
          hint={c.stats.remoteHint}
        />
        <StatCard
          label={c.stats.companies}
          value={data.volume.companies_30d.toLocaleString()}
          hint={c.stats.companiesHint}
        />
        {topRising && (
          <StatCard
            tone="green"
            label={c.stats.rising}
            value={topRising.stack}
            hint={topRising.delta_pct != null ? `+${topRising.delta_pct}% ${c.stats.risingHint}` : c.risingNewLabel}
          />
        )}
      </div>

      {data.rising_skills.length > 0 && (
        <Section title={c.risingTitle} kicker={c.risingKicker}>
          <div className="mp-rising">
            {data.rising_skills.map(s => (
              <div key={s.stack} className="mp-rising__card">
                <div className="mp-rising__top">
                  <span className="mp-rising__name">{s.stack}</span>
                  <span className={`mp-rising__badge ${s.is_new ? 'is-new' : ''}`}>
                    {s.is_new ? c.risingBadgeNew : c.risingPctLabel(s.delta_pct)}
                  </span>
                </div>
                <p className="mp-rising__hint">
                  {s.count} {lang === 'es' ? 'menciones · de' : 'mentions · was'} {s.prev_count} {lang === 'es' ? 'el mes anterior' : 'last month'}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title={c.topStacksTitle} kicker={c.topStacksKicker}>
        <div className="mp-grid-2">
          <BarList items={data.top_stacks.slice(0, 12)} badgeKey="delta_pct" />
          <DonutChart items={data.category.slice(0, 5).map(c => ({ ...c, label: c.label }))} />
        </div>
      </Section>

      {data.trends.series.some(s => s.values.some(v => v > 0)) && (
        <Section title={c.trendsTitle} kicker={c.trendsKicker}>
          <LineChart months={data.trends.months} monthLabels={monthLabels} series={data.trends.series} />
        </Section>
      )}

      <Section title={c.modalityTitle} kicker={c.modalityKicker}>
        <div className="mp-grid-2">
          <DonutChart items={data.modality.map(m => ({ ...m, label: m.value }))} />
          <div>
            <h3 style={{ fontFamily: "'Special Elite', Georgia, serif", fontSize: 20, margin: '0 0 12px' }}>{c.seniorityTitle}</h3>
            <BarList items={data.seniority.filter(s => s.value !== 'Not specified').slice(0, 6).map(s => ({ label: s.value, count: s.count }))} labelKey="label" />
          </div>
        </div>
      </Section>

      <Section title={c.companiesTitle} kicker={c.companiesKicker}>
        <div className="mp-companies">
          {data.top_companies.map(c => (
            <div key={c.company} className="mp-companies__card">
              <span className="mp-companies__name">{c.company}</span>
              <span className="mp-companies__count">{c.count}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="" kicker="">
        <div style={{ textAlign: 'center', padding: '12px 0 24px' }}>
          <Link href={c.ctaHref} style={{
            fontFamily: "'Courier Prime', monospace",
            fontSize: 13,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#FEFCF9',
            background: '#1A1A1A',
            textDecoration: 'none',
            padding: '14px 28px',
            display: 'inline-block',
          }}>{c.cta}</Link>
        </div>
      </Section>

      <MarketPulseFooter lang={lang} generatedAt={data.generated_at} />
    </main>
  )
}
