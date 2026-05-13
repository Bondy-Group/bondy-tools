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
    backLabel: '← Recursos Recruiters',
    backHref: '/recursos-recruiters',
    kicker: 'tools.wearebondy.com · recursos recruiters · market pulse',
    titleLeft: 'Calibrá tu próxima ',
    titleEm: 'búsqueda.',
    lede: (
      <>
        <strong>Para recruiters y sourcers.</strong> Top stacks pedidos, tendencias mes a mes y qué empresas están hiring agresivo en LATAM y US remote. Para que cuando te pase un brief raro, sepas si está alineado al mercado o no.
      </>
    ),
    stats: {
      volume: 'jobs activos',
      volumeHint: 'últimos 30 días',
      growth: 'el mercado',
      growthHint: 'volumen vs mes anterior',
      remote: 'remoto',
      remoteHint: 'si pedís on-site, juega en contra',
      rising: 'skill que explotó',
      risingHint: 'mes contra mes',
    },
    risingTitle: 'Skills emergentes',
    risingKicker: 'lo que tu hiring manager te va a pedir en 2 meses',
    risingBadgeNew: 'nuevo',
    topStacksTitle: 'Top stacks pedidos',
    topStacksKicker: 'últimos 30 días',
    trendsTitle: 'Tendencias mes a mes',
    trendsKicker: 'top stacks · últimos 6 meses',
    categoryTitle: 'Distribución por categoría',
    categoryKicker: 'mix del mercado',
    seniorityTitle: 'Seniority más pedido',
    seniorityKicker: 'mix del mercado',
    modalityTitle: 'Modalidad ofrecida',
    modalityKicker: 'mix del mercado',
    companiesTitle: 'Quiénes están hiring agresivo',
    companiesKicker: 'top empresas activas',
    companiesNote: 'Pista comercial: empresas con muchos jobs abiertos son señales de escala. Cruzá con tus búsquedas activas.',
  },
  en: {
    backLabel: '← Recruiter Resources',
    backHref: '/recursos-recruiters',
    kicker: 'tools.wearebondy.com · recruiter resources · market pulse',
    titleLeft: 'Calibrate your next ',
    titleEm: 'search.',
    lede: (
      <>
        <strong>For recruiters and sourcers.</strong> Top stacks in demand, month-over-month trends and who is hiring aggressively in LATAM and US remote. So when a weird brief lands on your desk, you know if it is aligned with the market or not.
      </>
    ),
    stats: {
      volume: 'active jobs',
      volumeHint: 'last 30 days',
      growth: 'the market',
      growthHint: 'volume vs last month',
      remote: 'remote',
      remoteHint: 'on-site = uphill battle',
      rising: 'skill that exploded',
      risingHint: 'month over month',
    },
    risingTitle: 'Emerging skills',
    risingKicker: 'what your hiring manager will ask for in 2 months',
    risingBadgeNew: 'new',
    topStacksTitle: 'Top stacks in demand',
    topStacksKicker: 'last 30 days',
    trendsTitle: 'Month over month trends',
    trendsKicker: 'top stacks · last 6 months',
    categoryTitle: 'Distribution by category',
    categoryKicker: 'market mix',
    seniorityTitle: 'Top seniority asked',
    seniorityKicker: 'market mix',
    modalityTitle: 'Modality offered',
    modalityKicker: 'market mix',
    companiesTitle: 'Who is hiring aggressively',
    companiesKicker: 'top active companies',
    companiesNote: 'Commercial tip: companies with many open jobs are signals of scaling. Cross with your active searches.',
  },
}

export default function MarketPulseRecruiterClient() {
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

      <Section title={c.topStacksTitle} kicker={c.topStacksKicker}>
        <BarList items={data.top_stacks.slice(0, 15)} badgeKey="delta_pct" />
      </Section>

      {data.trends.series.some(s => s.values.some(v => v > 0)) && (
        <Section title={c.trendsTitle} kicker={c.trendsKicker}>
          <LineChart months={data.trends.months} monthLabels={monthLabels} series={data.trends.series} />
        </Section>
      )}

      <Section title={c.categoryTitle} kicker={c.categoryKicker}>
        <div className="mp-grid-2">
          <DonutChart items={data.category.slice(0, 5).map(d => ({ ...d, label: d.label }))} />
          <div>
            <h3 style={{ fontFamily: "'Special Elite', Georgia, serif", fontSize: 20, margin: '0 0 12px' }}>{c.seniorityTitle}</h3>
            <BarList items={data.seniority.filter(s => s.value !== 'Not specified').slice(0, 6).map(s => ({ label: s.value, count: s.count }))} labelKey="label" />
          </div>
        </div>
      </Section>

      <Section title={c.modalityTitle} kicker={c.modalityKicker}>
        <DonutChart items={data.modality.map(m => ({ ...m, label: m.value }))} />
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

      <MarketPulseFooter lang={lang} generatedAt={data.generated_at} />
    </main>
  )
}
