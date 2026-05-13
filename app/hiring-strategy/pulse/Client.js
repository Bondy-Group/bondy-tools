'use client'

import { useEffect, useState } from 'react'
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
    backLabel: '← Hiring Strategy',
    backHref: '/hiring-strategy',
    kicker: 'tools.wearebondy.com · hiring strategy · market pulse',
    titleLeft: 'Tu mercado, ',
    titleEm: 'en tiempo real.',
    lede: (
      <>
        <strong>Para hiring managers, VPs y fondos.</strong> Lo que pide tu industria, lo que piden tus competidores y dónde está la presión sobre tu próximo hire. Sale de JDs reales del mercado LATAM y US remoto, normalizado y actualizado cada día.
      </>
    ),
    stats: {
      volume: 'JDs analizados',
      volumeHint: 'últimos 30 días',
      growth: 'crecimiento del mercado',
      growthHint: 'vs mes anterior',
      remote: 'ofrece remoto',
      remoteHint: 'si pedís on-site, perdés talento',
      rising: 'skill que más subió',
      risingHint: 'mes contra mes',
    },
    risingTitle: 'Skills que tu competencia ya está pidiendo',
    risingKicker: 'tendencia mes a mes',
    risingBadgeNew: 'nuevo',
    industryTitle: 'Lo que pide el mercado tech',
    industryKicker: 'categorías más activas',
    trendsTitle: 'Cómo evoluciona la demanda',
    trendsKicker: 'últimos 6 meses',
    modalityTitle: 'Qué modalidad ofrecen tus competidores',
    modalityKicker: 'distribución del mercado',
    seniorityTitle: 'Qué seniorities buscan',
    seniorityKicker: 'distribución del mercado',
    companiesTitle: 'Quiénes están hiring agresivo',
    companiesKicker: 'top empresas activas',
    companiesNote: 'Empresas con más jobs abiertos hoy. Si están en tu vertical, pelean por tu mismo talento.',
    insightTitle: 'Lectura rápida',
    insightCopy: (top, total, remotePct, rising) => (
      <>
        <strong>{top.stack}</strong> es el skill #1 con {top.count} menciones. El mercado abrió <strong>{total.toLocaleString()}</strong> jobs en 30 días, con <strong>{remotePct}%</strong> de roles 100% remoto. {rising ? <>El que más subió es <strong>{rising.stack}</strong>{rising.delta_pct != null ? ` (+${rising.delta_pct}% vs mes anterior)` : ' (no aparecía hace 30 días)'}.</> : null}
      </>
    ),
    salaryWarning: '🚧 Benchmarks de compensación — en construcción. Mateo está arreglando un bug del scrapper que mezcla salarios mensuales (LATAM) con anuales (US). Sale cuando esté.',
  },
  en: {
    backLabel: '← Hiring Strategy',
    backHref: '/hiring-strategy',
    kicker: 'tools.wearebondy.com · hiring strategy · market pulse',
    titleLeft: 'Your market, ',
    titleEm: 'in real time.',
    lede: (
      <>
        <strong>For hiring managers, VPs and funds.</strong> What your industry asks for, what your competitors ask for and where the pressure on your next hire is coming from. From real JDs in LATAM and US remote, normalized and refreshed daily.
      </>
    ),
    stats: {
      volume: 'JDs analyzed',
      volumeHint: 'last 30 days',
      growth: 'market growth',
      growthHint: 'vs last month',
      remote: 'offer remote',
      remoteHint: 'on-site = you lose talent',
      rising: 'top rising skill',
      risingHint: 'month over month',
    },
    risingTitle: 'Skills your competition is already asking for',
    risingKicker: 'month over month',
    risingBadgeNew: 'new',
    industryTitle: 'What the tech market is asking for',
    industryKicker: 'most active categories',
    trendsTitle: 'How demand evolves',
    trendsKicker: 'last 6 months',
    modalityTitle: 'What modality your competitors offer',
    modalityKicker: 'market distribution',
    seniorityTitle: 'Which seniorities they look for',
    seniorityKicker: 'market distribution',
    companiesTitle: 'Who is hiring aggressively',
    companiesKicker: 'top active companies',
    companiesNote: 'Companies with the most open jobs today. If they are in your vertical, they are fighting for your same talent.',
    insightTitle: 'Quick read',
    insightCopy: (top, total, remotePct, rising) => (
      <>
        <strong>{top.stack}</strong> is the #1 skill with {top.count} mentions. The market opened <strong>{total.toLocaleString()}</strong> jobs in 30 days, with <strong>{remotePct}%</strong> of roles 100% remote. {rising ? <>The biggest mover is <strong>{rising.stack}</strong>{rising.delta_pct != null ? ` (+${rising.delta_pct}% vs last month)` : ' (was not on the map 30 days ago)'}.</> : null}
      </>
    ),
    salaryWarning: '🚧 Compensation benchmarks — under construction. Mateo is fixing a scraper bug that mixes monthly salaries (LATAM) with annual ones (US). Coming when ready.',
  },
}

export default function MarketPulseHiringManagerClient() {
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

  const topStack = data.top_stacks[0]
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
          tone={data.volume.delta_pct != null && data.volume.delta_pct > 0 ? 'green' : ''}
          label={c.stats.growth}
          value={data.volume.delta_pct != null ? (data.volume.delta_pct > 0 ? '+' : '') + data.volume.delta_pct : '—'}
          suffix={data.volume.delta_pct != null ? '%' : ''}
          hint={c.stats.growthHint}
        />
        <StatCard
          label={c.stats.remote}
          value={data.volume.remote_pct != null ? data.volume.remote_pct : '—'}
          suffix={data.volume.remote_pct != null ? '%' : ''}
          hint={c.stats.remoteHint}
        />
        {topRising && (
          <StatCard
            tone="green"
            label={c.stats.rising}
            value={topRising.stack}
            hint={topRising.delta_pct != null ? `+${topRising.delta_pct}% ${c.stats.risingHint}` : ''}
          />
        )}
      </div>

      <Section title={c.insightTitle} kicker="—">
        <p style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--bondy-ink-sub)', maxWidth: 760, margin: 0 }}>
          {topStack ? c.insightCopy(topStack, data.volume.last_30d, data.volume.remote_pct, topRising) : null}
        </p>
      </Section>

      {data.rising_skills.length > 0 && (
        <Section title={c.risingTitle} kicker={c.risingKicker}>
          <div className="mp-rising">
            {data.rising_skills.map(s => (
              <div key={s.stack} className="mp-rising__card">
                <div className="mp-rising__top">
                  <span className="mp-rising__name">{s.stack}</span>
                  <span className={`mp-rising__badge ${s.is_new ? 'is-new' : ''}`}>
                    {s.is_new ? c.risingBadgeNew : `+${s.delta_pct}%`}
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

      <Section title={c.industryTitle} kicker={c.industryKicker}>
        <div className="mp-grid-2">
          <BarList items={data.top_stacks.slice(0, 12)} badgeKey="delta_pct" />
          <DonutChart items={data.category.slice(0, 5).map(d => ({ ...d, label: d.label }))} />
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
        <p style={{ fontSize: 13, color: 'var(--bondy-ink-faint)', margin: '0 0 16px' }}>{c.companiesNote}</p>
        <div className="mp-companies">
          {data.top_companies.map(co => (
            <div key={co.company} className="mp-companies__card">
              <span className="mp-companies__name">{co.company}</span>
              <span className="mp-companies__count">{co.count}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="" kicker="">
        <div style={{
          padding: '20px 24px',
          background: 'rgba(184,166,64,0.08)',
          borderLeft: '3px solid #B8A640',
          fontSize: 13,
          color: 'var(--bondy-ink-sub)',
          lineHeight: 1.5,
        }}>{c.salaryWarning}</div>
      </Section>

      <MarketPulseFooter lang={lang} generatedAt={data.generated_at} />
    </main>
  )
}
