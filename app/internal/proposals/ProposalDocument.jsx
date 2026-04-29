'use client'

// ─────────────────────────────────────────────────────────
// Bondy — Proposal Document
// Port del proposal.jsx del template a Next.js / React 18.
// Recibe `data` (shape de rowToRenderData en lib/proposals.js).
// ─────────────────────────────────────────────────────────

import './proposal.css'

// ── Atoms ────────────────────────────────────────────────
function BondyMark({ size = 22, mono = false }) {
  const ink = '#1A1A1A'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="4"  y="5"  width="14" height="12" rx="2.5" fill={ink}/>
      <rect x="22" y="5"  width="14" height="12" rx="2.5" fill={ink} opacity={0.18}/>
      <rect x="4"  y="22" width="14" height="12" rx="2.5" fill={ink} opacity={0.42}/>
      <rect x="22" y="22" width="14" height="12" rx="2.5" fill={mono ? ink : '#4A8C40'}/>
    </svg>
  )
}

function Squiggle({ width = 220, color = '#4A8C40', strokeWidth = 2 }) {
  const mid = width / 2
  return (
    <svg width={width} height="8" viewBox={`0 0 ${width} 8`} fill="none" style={{ display: 'block' }}>
      <path d={`M0 4 Q${mid * 0.5} 1 ${mid} 4 Q${mid * 1.5} 7 ${width} 4`}
            stroke={color} strokeWidth={strokeWidth} fill="none" strokeLinecap="round"/>
    </svg>
  )
}

function Kicker({ children, color = '#4A8C40', noRule = false }) {
  return (
    <div className="kicker">
      {!noRule && <span className="kicker-rule" style={{ background: color }}/>}
      <span style={{ color }}>{children}</span>
    </div>
  )
}

function Label({ children, faint = false, style = {} }) {
  return <span className="label" style={{ color: faint ? '#7A7874' : '#4A8C40', ...style }}>{children}</span>
}

function SectionMark({ children }) {
  return <div className="section-mark"><Squiggle width={28} strokeWidth={1.5}/><span>{children}</span></div>
}

// ── Page wrapper ─────────────────────────────────────────
function Page({ children, n, total, client, lang, cover = false, dark = false }) {
  const labels = lang === 'es'
    ? { provider: 'BONDY GROUP LLC', tag: 'wearebondy.com', page: 'Pág.' }
    : { provider: 'BONDY GROUP LLC', tag: 'wearebondy.com', page: 'Page' }

  return (
    <article
      data-screen-label={`${String(n).padStart(2, '0')} ${cover ? 'Cover' : 'Page'}`}
      className={`page ${cover ? 'page--cover' : ''} ${dark ? 'page--dark' : ''}`}
    >
      {!cover && (
        <header className="page-head">
          <div className="page-head-l">
            <BondyMark size={14} mono={dark}/>
            <span className="page-head-name">BONDY</span>
            <span className="page-head-sep">·</span>
            <span className="page-head-meta">
              {lang === 'es' ? 'Acuerdo de servicio' : 'Service Agreement'} · {client.shortName}
            </span>
          </div>
          <div className="page-head-r">
            <span className="page-head-num">{String(n).padStart(2, '0')} / {String(total).padStart(2, '0')}</span>
          </div>
        </header>
      )}

      <div className={`page-body ${cover ? 'page-body--cover' : ''}`}>
        {children}
      </div>

      {!cover && (
        <footer className="page-foot">
          <span>{labels.provider}</span>
          <span>{labels.tag}</span>
          <span>{labels.page} {n} / {total}</span>
        </footer>
      )}
    </article>
  )
}

// ── 01 · Cover ───────────────────────────────────────────
function Cover({ data, lang }) {
  const t = lang === 'es' ? {
    kicker: 'Acuerdo de servicio',
    title1: 'Acuerdo de',
    title2: 'servicio.',
    prepFor: 'Preparado para',
    scope: 'Alcance',
    date: 'Fecha de propuesta',
    valid: 'Válido por 10 días hábiles',
    tagline: 'El estándar para hiring técnico desde 2008',
  } : {
    kicker: 'Service agreement',
    title1: 'Service',
    title2: 'agreement.',
    prepFor: 'Prepared for',
    scope: 'Scope of work',
    date: 'Proposal date',
    valid: 'Valid for 10 business days',
    tagline: 'The standard for technical hiring since 2008',
  }

  return (
    <div className="cover">
      <div className="cover-top">
        <div className="cover-mark">
          <BondyMark size={28}/>
          <span className="cover-mark-name">BONDY</span>
        </div>
        <div className="cover-date">
          <Label>{t.date}</Label>
          <span className="cover-date-val">{data.dateLong}</span>
        </div>
      </div>

      <div className="cover-mid">
        <Kicker noRule>{t.kicker} — {data.year}</Kicker>
        <h1 className="cover-title">
          {t.title1}<br/>
          <em className="accent">{t.title2}</em>
        </h1>
        <Squiggle width={360} strokeWidth={2.5}/>
      </div>

      <div className="cover-grid">
        <div className="cover-grid-cell">
          <Label>{t.prepFor}</Label>
          <div className="cover-grid-h">{data.client.name}</div>
          <div className="cover-grid-sub">{data.client.contact} · {data.client.contactRole}</div>
        </div>
        <div className="cover-grid-cell">
          <Label>{t.scope}</Label>
          <div className="cover-grid-h">{data.roles.length} {lang === 'es' ? 'búsquedas senior' : 'senior searches'}</div>
          <div className="cover-grid-sub">
            {data.roles.map((r) => r.title).join(' · ')}
          </div>
        </div>
        <div className="cover-grid-cell">
          <Label>{lang === 'es' ? 'Fee' : 'Fee'}</Label>
          <div className="cover-grid-h">{data.fee}%</div>
          <div className="cover-grid-sub">{lang === 'es' ? 'del bruto anual al ingreso' : 'of annual gross at hire'}</div>
        </div>
      </div>

      <div className="cover-bottom">
        <div className="cover-bottom-l">
          <span className="cover-tagline">{t.tagline}</span>
        </div>
        <div className="cover-bottom-r">
          <Label faint>{t.valid}</Label>
        </div>
      </div>
    </div>
  )
}

// ── 02 · Executive summary ───────────────────────────────
function ExecSummary({ data, lang }) {
  const t = lang === 'es' ? {
    section: '01 — Resumen ejecutivo',
    h: 'En qué nos estamos comprometiendo',
    p1: (
      <>
        Este Acuerdo de Servicio se firma el <strong>{data.dateLong}</strong> entre
        {' '}<strong>Bondy Group LLC</strong> (el “Proveedor”) y <strong>{data.client.legalName}</strong>{' '}
        (el “Cliente”). Establece los términos bajo los cuales Bondy proveerá servicios de
        recruiting senior para <strong>{data.roles.length} posiciones</strong>:{' '}
        {data.roles.map((r) => r.title).join(', ')}.
      </>
    ),
    p2: <>Bondy es una firma de Buenos Aires que es <em>el estándar</em> para hiring técnico en LATAM desde 2008. Trabajamos con compañías venture-backed que necesitan talento senior en Argentina y la región — rápido, pero no a costa de la calidad.</>,
    p3: <>Nuestro diferenciador es <em>método</em>: combinamos un scorecard propietario construido por psicólogos organizacionales con una base pre-vetada de 50,000+ candidatos LATAM. El resultado es un <strong>94% de retención</strong> y un ratio de <strong>1-de-4</strong> candidato-a-hire.</>,
    why: `Por qué esta propuesta está calibrada para ${data.client.shortName}`,
    bullets: [
      ['AI-first como modo de trabajo.', 'Filtramos por “AI Architects” — no “AI Operators”. Nuestro lente cognitivo distingue quién diseña y orquesta IA de quién la usa.'],
      ['DNA del cliente integrado.', `Las ${data.dna.length} fortalezas del documento interno de DNA — ${data.dna.map((d) => d.title).join(', ')} — se traducen al scorecard y se prueban en cada entrevista.`],
      ['Filtro senior-only.', 'Sin juniors. Sin semi-seniors. Cada candidato presentado tiene la madurez operativa para loops semanales sin micromanagement.'],
      ['Velocidad dentro del método.', 'Primer shortlist en 10–14 días corridos desde el kickoff. Más rápido si hay matches “Hot” en la base al kickoff.'],
    ],
  } : {
    section: '01 — Executive summary',
    h: 'What we are agreeing on',
    p1: (
      <>
        This Service Agreement is made on <strong>{data.dateLong}</strong> between
        {' '}<strong>Bondy Group LLC</strong> (the “Service Provider”) and{' '}
        <strong>{data.client.legalName}</strong> (the “Client”). It sets out the terms under which
        Bondy will provide senior engineering recruitment services for{' '}
        <strong>{data.roles.length} open positions</strong>:{' '}
        {data.roles.map((r) => r.title).join(', ')}.
      </>
    ),
    p2: <>Bondy is a Buenos Aires-based recruiting firm that has been <em>the standard</em> for technical hiring in LATAM since 2008. We work with venture-backed companies that need senior engineering talent in Argentina and the region — fast, but not at the expense of quality.</>,
    p3: <>Our differentiator is <em>method</em>: we combine a proprietary scorecard built by organizational psychologists with a 50,000+ pre-vetted LATAM candidate base. The result is a <strong>94% retention rate</strong> and a <strong>1-in-4</strong> candidate-to-hire ratio.</>,
    why: `Why this proposal is calibrated for ${data.client.shortName}`,
    bullets: [
      ['AI-first way of working.', 'We screen for “AI Architects” — not “AI Operators”. Our cognitive lens distinguishes who designs and orchestrates AI from who simply uses it.'],
      ['Client DNA integration.', `The ${data.dna.length} strengths from your internal DNA document — ${data.dna.map((d) => d.title).join(', ')} — translate into our scorecard and are tested in every interview.`],
      ['Senior-only filter.', 'No juniors. No semi-seniors. Every candidate presented has the operating maturity for weekly loops with no micromanagement.'],
      ['Speed within method.', 'First shortlist in 10–14 calendar days from kickoff. We move faster on “Hot” candidates already mapped in our base, flagged at kickoff.'],
    ],
  }

  // Override de bullets si hay approachNotes (operador-customizado)
  const bullets = data.approachNotes
    ? parseApproachNotes(data.approachNotes)
    : t.bullets

  return (
    <>
      <SectionMark>{t.section}</SectionMark>
      <h2 className="h2">{t.h}</h2>
      <Squiggle width={200}/>

      <div className="prose">
        <p className="p">{t.p1}</p>
        <p className="p">{t.p2}</p>
        <p className="p">{t.p3}</p>
      </div>

      <h3 className="h3" style={{ marginTop: '2rem' }}>{t.why}</h3>
      <ul className="bullets">
        {bullets.map(([a, b], i) => (
          <li key={i}>
            <span className="bullets-dash">—</span>
            <span><strong>{a}</strong> {b}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

// Convierte approachNotes (texto libre o "Title. Body" por línea) → bullets
function parseApproachNotes(notes) {
  return String(notes || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^([^.]+\.)\s*(.*)$/)
      if (m) return [m[1], m[2]]
      return [line, '']
    })
}

// ── 03 · Roles ───────────────────────────────────────────
function Roles({ data, lang }) {
  const t = lang === 'es' ? {
    section: '02 — Roles en alcance',
    h: 'Qué vamos a buscar',
    intro: <>{data.roles.length} hires senior, AI-first, para {data.client.location} ({data.client.workMode}). Roles intencionalmente generalistas — el cliente no contrata por stack tag.</>,
    cols: ['Rol', 'Foco / dominio', 'Cant.'],
    total: 'Total vacantes',
    note: 'Las JDs específicas y los criterios de screening cognitivo AI-first se cierran en el kickoff (ver Sección 5).',
  } : {
    section: '02 — Roles in scope',
    h: 'What we will be searching for',
    intro: <>{data.roles.length} senior, AI-first engineering hires for {data.client.location} ({data.client.workMode}). Roles are intentionally generalist — {data.client.shortName} does not hire by stack tag.</>,
    cols: ['Role', 'Focus / domain', 'Qty'],
    total: 'Total vacancies',
    note: 'Specific JDs and AI-first cognitive screening criteria will be locked at kickoff (see Section 5).',
  }

  return (
    <>
      <SectionMark>{t.section}</SectionMark>
      <h2 className="h2">{t.h}</h2>
      <Squiggle width={200}/>
      <p className="p prose-narrow">{t.intro}</p>

      <div className="roles-grid">
        <div className="roles-grid-head">
          <span>{t.cols[0]}</span>
          <span>{t.cols[1]}</span>
          <span style={{ textAlign: 'right' }}>{t.cols[2]}</span>
        </div>
        {data.roles.map((r, i) => (
          <div key={i} className="roles-grid-row">
            <div className="roles-cell">
              <Label faint style={{ marginBottom: 6, display: 'block' }}>{String(i + 1).padStart(2, '0')}</Label>
              <div className="roles-title">{r.title}</div>
            </div>
            <div className="roles-cell">
              <p className="p" style={{ fontSize: 13.5 }}>{r.focus}</p>
            </div>
            <div className="roles-cell roles-qty">{r.qty}</div>
          </div>
        ))}
        <div className="roles-grid-total">
          <span>{t.total}</span>
          <span className="roles-total-num">{data.roles.reduce((a, r) => a + Number(r.qty || 0), 0)}</span>
        </div>
      </div>

      <p className="footnote">{t.note}</p>
    </>
  )
}

// ── 04 · Method ──────────────────────────────────────────
function Method({ data, lang }) {
  const t = lang === 'es' ? {
    section: '03 — Método',
    h: 'Cómo Bondy trabaja la búsqueda',
    intro: <>Cada búsqueda es un proyecto. Hacemos trabajo diagnóstico antes de presentar candidatos para que el match sea cultural, técnico y de ritmo. La <em>regla 1-de-4</em> es no negociable: si menos de 1 de cada 4 candidatos avanza, paramos y recalibramos con vos en lugar de empujar volumen.</>,
    steps: [
      ['Step 01', 'Kickoff & DNA mapping', 'Sesión de trabajo con el squad senior. Traducimos el DNA del cliente a un scorecard medible. Preview compatibilidad-dinámica con candidatos ya en base — típicamente 5–10 nombres.'],
      ['Step 02', 'Sourcing dirigido',     'Outreach solo a candidatos con compatibilidad medida. Nunca quemamos al cliente con outreach masivo. Hot candidates de base aparecen en 48–72 horas.'],
      ['Step 03', 'Entrevistas DNA',       'Cada candidato es screeneado por las 6 fortalezas. Scoring basado en evidencia por psicólogos organizacionales certificados, no impresiones.'],
      ['Step 04', 'Shortlist & garantía',  'Recibís un shortlist de 3 candidatos por rol con scorecards completos. Garantía de placement a 30 días sobre cada hire.'],
    ],
    quote: 'Si menos de 1 de cada 4 candidatos avanza, paramos la búsqueda.',
    quoteSub: 'Recalibramos con vos. No mandamos más volumen.',
  } : {
    section: '03 — Method',
    h: 'How Bondy works the search',
    intro: <>Every search is a project. We do diagnostic work upfront so the candidates we present already match — culturally, technically, in working rhythm. The <em>1-in-4 rule</em> is non-negotiable: if fewer than 1 in 4 candidates advances, we pause and recalibrate with you instead of pushing volume.</>,
    steps: [
      ['Step 01', 'Kickoff & DNA mapping', 'Working session with the senior squad. We translate the Client DNA into a measurable scorecard. Compatibility-dynamic preview with candidates already in base — typically 5–10 names.'],
      ['Step 02', 'Targeted sourcing',     'Outreach only to candidates with measured compatibility. We never burn the client with mass outreach. Hot candidates surface in 48–72 hours.'],
      ['Step 03', 'DNA interviews',        'Each candidate is screened for the 6 strengths. Evidence-based scoring by certified organizational psychologists, not impressions.'],
      ['Step 04', 'Shortlist & guarantee', 'You receive a shortlist of 3 candidates per role with full scorecards. 30-day placement guarantee on every hire.'],
    ],
    quote: 'If fewer than 1 in 4 candidates advances, we stop the search.',
    quoteSub: 'We recalibrate with you. We do not send more volume.',
  }

  return (
    <>
      <SectionMark>{t.section}</SectionMark>
      <h2 className="h2">{t.h}</h2>
      <Squiggle width={200}/>
      <p className="p prose-narrow">{t.intro}</p>

      <div className="steps-grid">
        {t.steps.map(([n, title, body], i) => (
          <div key={i} className="step-cell">
            <Label faint>{n}</Label>
            <div className="step-title">{title}</div>
            <p className="p step-body">{body}</p>
          </div>
        ))}
      </div>

      <div className="pullquote">
        <Label>{lang === 'es' ? 'Principio' : 'Principle'}</Label>
        <div className="pullquote-body">
          <p className="pullquote-q">{t.quote}</p>
          <p className="p">{t.quoteSub}</p>
        </div>
      </div>
    </>
  )
}

// ── 05 · DNA & Cognitive lens ────────────────────────────
function DNASection({ data, lang }) {
  const t = lang === 'es' ? {
    section: '04 — Scorecard',
    h: 'El DNA del cliente, en nuestro scorecard',
    intro: 'Las 6 fortalezas se vuelven la capa de evidencia soft-skill del scorecard. Para cada candidato entregamos evidencia estructurada — no un checkbox.',
    cogH: 'Lente cognitivo AI-first',
    cogBody: <>Más allá de las 6 fortalezas, cada candidato AI-first es evaluado contra nuestro framework propietario: <strong>AI Operator</strong> vs. <strong>AI Architect</strong>. Operators usan herramientas IA. Architects diseñan cómo la IA piensa, orquesta y embarca. Filtramos por el segundo.</>,
  } : {
    section: '04 — Scorecard',
    h: 'The Client DNA, in our scorecard',
    intro: 'The 6 strengths become the soft-skill evidence layer of our scorecard. For each candidate, we deliver structured evidence — not a checkbox.',
    cogH: 'AI-first cognitive lens',
    cogBody: <>Beyond the 6 strengths, every AI-first candidate is assessed against our proprietary framework: <strong>AI Operator</strong> vs. <strong>AI Architect</strong>. Operators use AI tools. Architects design how AI thinks, orchestrates and ships. We screen for the second.</>,
  }

  return (
    <>
      <SectionMark>{t.section}</SectionMark>
      <h2 className="h2">{t.h}</h2>
      <Squiggle width={200}/>
      <p className="p prose-narrow">{t.intro}</p>

      <div className="dna-grid">
        {data.dna.map((d, i) => (
          <div key={i} className="dna-cell">
            <span className="dna-num">{String(i + 1).padStart(2, '0')}</span>
            <div className="dna-body">
              <div className="dna-title">{d.title}</div>
              <div className="dna-desc">{d.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <h3 className="h3" style={{ marginTop: '2.5rem' }}>{t.cogH}</h3>
      <p className="p">{t.cogBody}</p>

      <div className="ops-vs">
        <div className="ops-col">
          <Label faint>{lang === 'es' ? 'No buscamos' : 'We do not screen for'}</Label>
          <div className="ops-h">AI Operator</div>
          <div className="ops-desc">{lang === 'es' ? 'Usa herramientas IA. Sigue prompts. Acelera tareas.' : 'Uses AI tools. Follows prompts. Speeds up tasks.'}</div>
        </div>
        <div className="ops-arrow">→</div>
        <div className="ops-col ops-col--accent">
          <Label>{lang === 'es' ? 'Sí buscamos' : 'We screen for'}</Label>
          <div className="ops-h">AI Architect</div>
          <div className="ops-desc">{lang === 'es' ? 'Diseña sistemas IA. Orquesta agentes. Embarca a producción.' : 'Designs AI systems. Orchestrates agents. Ships to production.'}</div>
        </div>
      </div>
    </>
  )
}

// ── 06 · Fees & Terms ────────────────────────────────────
function TermBlock({ title, children }) {
  return (
    <div className="term-block">
      <div className="term-block-h">{title}</div>
      <div className="term-block-body">
        {typeof children === 'string' ? <p className="p">{children}</p> : children}
      </div>
    </div>
  )
}

function Fees({ data, lang }) {
  const t = lang === 'es' ? {
    section: '05 — Fees & condiciones',
    h: 'Inversión',
    intro: 'El fee se calcula como porcentaje del bruto anual del candidato al ingreso. Sin retainer. Sin fee de kickoff. La sesión de kickoff, el scorecard DNA y el screening cognitivo AI-first están incluidos.',
    feeLabel: 'Fee de recruiting',
    feeFormula: `FEE = (Bruto mensual × 12) × ${data.fee}%`,
    feeNote: `Base salarial en ${data.salaryCurrency} con ajuste IPC trimestral. Fee calculado sobre el bruto al día de inicio del candidato.`,
    pre: ['Candidatos pre-existentes', 'Si el cliente desea incluir en una búsqueda gestionada por Bondy un candidato previamente identificado o referido por el cliente, el proceso sigue sujeto a fees. En ese caso, Bondy factura el 50% del fee aplicable.'],
    guar: ['Garantía de placement', 'Garantía de 30 días por placement. Si el candidato renuncia voluntariamente o es desvinculado dentro de los 30 días desde el inicio, Bondy realiza una búsqueda de reemplazo sin costo adicional. La garantía no aplica si la desvinculación se relaciona con incumplimiento de buenas prácticas (acoso, discriminación, abuso), incumplimiento del cliente con el empleado, o evaluación incorrecta de skills técnicos por parte del cliente.'],
    pay: ['Términos de pago', 'Fee facturado el día de inicio del candidato. Las facturas vencen a 14 días de recibidas. Pasados 30 días corridos desde la recepción sin pago, aplican intereses por mora calculados sobre los días adicionales de atraso:'],
    payRows: [['1–10 días adicionales', '+1.95%'], ['11–20 días adicionales', '+3.89%'], ['21–30 días adicionales', '+5.84%']],
    cancel: ['Cancelación', 'Si el cliente termina una requisición antes de presentar 3 candidatos válidos: 25% del cap salarial mensual acordado. Después de presentados 3 válidos: 50%. La fee de cancelación no aplica si la búsqueda es cubierta por otro consultor o referido interno.'],
    commit: ['Compromiso', 'El cliente se compromete a comunicación y decisiones oportunas. Si no responde por más de 10 días corridos, Bondy se reserva el derecho de terminar la requisición y aplicar la fee de cancelación.'],
  } : {
    section: '05 — Fees & terms',
    h: 'Investment',
    intro: 'Fee is calculated as a percentage of the candidate\u2019s annual gross salary at hire. No retainer. No kickoff fee. The kickoff session, the DNA scorecard, and the AI-first cognitive screening are all included.',
    feeLabel: 'Recruitment fee',
    feeFormula: `FEE = (Monthly gross × 12) × ${data.fee}%`,
    feeNote: `Salary base in ${data.salaryCurrency} with quarterly CPI adjustment. Fee calculated on gross salary at candidate's start date.`,
    pre: ['Pre-existing candidates', 'If the client wishes to include in a Bondy-managed search a candidate previously identified, contacted or referred by the client, the process remains subject to fees. In that case, Bondy invoices 50% of the applicable recruitment fee.'],
    guar: ['Placement guarantee', '30-day guarantee per placement. If the candidate voluntarily resigns or is terminated within 30 days of start date, Bondy conducts a replacement search at no additional cost. The guarantee does not apply if termination relates to non-compliance with good practices (harassment, discrimination, abuse), client breach of obligations to the employee, or client misjudging technical skills or seniority during the interview process.'],
    pay: ['Payment terms', 'Fee invoiced on candidate\u2019s start date. Invoices due within 14 days of receipt. Past 30 consecutive days from receipt without payment, late-payment interest applies on additional days of delay:'],
    payRows: [['1–10 additional days', '+1.95%'], ['11–20 additional days', '+3.89%'], ['21–30 additional days', '+5.84%']],
    cancel: ['Cancellation', 'If the client terminates a requisition before Bondy presents 3 suitable candidates: 25% of the agreed monthly salary cap. After 3 suitable candidates have been presented: 50%. The cancellation fee does not apply if the search is filled by another consultant or by an internal referral.'],
    commit: ['Commitment', 'Client agrees to prompt and timely communication and decision-making. If client does not respond for more than 10 calendar days, Bondy reserves the right to terminate the requisition and apply the cancellation fee.'],
  }

  return (
    <>
      <SectionMark>{t.section}</SectionMark>
      <h2 className="h2">{t.h}</h2>
      <Squiggle width={200}/>
      <p className="p prose-narrow">{t.intro}</p>

      <div className="fee-callout">
        <div className="fee-callout-l">
          <Label>{t.feeLabel}</Label>
          <div className="fee-callout-num">
            <span className="fee-callout-pct">{data.fee}<span className="fee-callout-mod">%</span></span>
            <Squiggle width={120} strokeWidth={2}/>
            <span className="fee-callout-of">{lang === 'es' ? 'del bruto anual' : 'of annual gross salary'}</span>
          </div>
        </div>
        <div className="fee-callout-r">
          <Label faint>{lang === 'es' ? 'Fórmula' : 'Formula'}</Label>
          <div className="fee-callout-formula">{t.feeFormula}</div>
          <p className="footnote" style={{ marginTop: 8 }}>{t.feeNote}</p>
        </div>
      </div>

      <TermBlock title={t.pre[0]}>{t.pre[1]}</TermBlock>
      <TermBlock title={t.guar[0]}>{t.guar[1]}</TermBlock>
      <TermBlock title={t.pay[0]}>
        <p className="p">{t.pay[1]}</p>
        <div className="pay-grid">
          {t.payRows.map(([k, v], i) => (
            <div key={i} className="pay-row">
              <span>{k}</span>
              <span className="pay-val">{v}</span>
            </div>
          ))}
        </div>
      </TermBlock>
      <TermBlock title={t.cancel[0]}>{t.cancel[1]}</TermBlock>
      <TermBlock title={t.commit[0]}>{t.commit[1]}</TermBlock>
    </>
  )
}

// ── 07 · Timeline ────────────────────────────────────────
function Timeline({ data, lang }) {
  const firstRoleTitle = data.roles[0]?.title || ''
  const allTitles = data.roles.map((r) => r.title).join(', ')

  const t = lang === 'es' ? {
    section: '06 — Timeline',
    h: 'Qué pasa después de la firma',
    rows: [
      ['Día 0',     'Acuerdo firmado. Bondy agenda kickoff dentro de 48 horas.'],
      ['Día 1–2',   `Sesión de kickoff. Cerramos JDs (${allTitles}), scorecard DNA, criterios AI-first, bandas salariales y mecánica de proceso.`],
      ['Día 3–7',   'Preview compatibilidad-dinámica desde base. Hot candidates surgen para revisión temprana. Outreach dirigido empieza.'],
      ['Día 10–14', `Primer shortlist para el rol prioritario (default: ${firstRoleTitle}). 3 candidatos con scorecards completos.`],
      ['Día 14–28', 'Shortlists para los roles restantes. Coordinación de entrevistas, references checks, soporte de offer.'],
      ['Día 30+',   'Placement y ventana de garantía 30 días. Check-in post-hire al día 15 y 45.'],
    ],
    foot: 'Podemos comprimir este timeline si hay Hot candidates en base que matchean al kickoff. No lo comprimimos a costa del método.',
  } : {
    section: '06 — Timeline',
    h: 'What happens after you sign',
    rows: [
      ['Day 0',     'Agreement signed. Bondy schedules kickoff within 48 hours.'],
      ['Day 1–2',   `Kickoff session. Lock JDs (${allTitles}), DNA scorecard, AI-first criteria, salary bands, and process mechanics.`],
      ['Day 3–7',   'Compatibility-dynamic preview from base. Hot candidates surface for early review. Targeted outreach begins.'],
      ['Day 10–14', `First shortlist for the priority role (default: ${firstRoleTitle}). 3 candidates with full scorecards.`],
      ['Day 14–28', 'Shortlists for remaining roles. Interview coordination, reference checks, offer support.'],
      ['Day 30+',   'Placement and 30-day guarantee window. Post-hire check-in at day 15 and day 45.'],
    ],
    foot: 'We can compress this timeline if Hot candidates from our base match at kickoff. We will not compress it at the cost of method.',
  }

  return (
    <>
      <SectionMark>{t.section}</SectionMark>
      <h2 className="h2">{t.h}</h2>
      <Squiggle width={200}/>

      <div className="timeline">
        {t.rows.map(([k, v], i) => (
          <div key={i} className="timeline-row">
            <div className="timeline-day">{k}</div>
            <div className="timeline-body">{v}</div>
          </div>
        ))}
      </div>

      <p className="footnote">{t.foot}</p>
    </>
  )
}

// ── 08 · Acceptance ──────────────────────────────────────
function Acceptance({ data, lang }) {
  const t = lang === 'es' ? {
    section: '07 — Términos & aceptación',
    h: 'Plazo y firma',
    p1: 'Este Acuerdo permanece en vigor por la duración del proceso de recruiting y puede ser terminado por cualquiera de las partes mediante notificación escrita, sujeto a los términos de cancelación de la Sección 5.',
    p2: 'Bondy puede, a su discreción, usar canales de sourcing adicionales. Todos los candidatos presentados están pre-screeneados contra el scorecard DNA y el lente cognitivo AI-first.',
    valid: 'Esta propuesta es válida por diez (10) días hábiles desde la fecha indicada en la portada.',
    accept: 'Al firmar abajo, ambas partes reconocen y aceptan los términos de este Acuerdo.',
    sigBondy: 'Bondy Group LLC',
    sigClient: data.client.legalName,
    name: 'Nombre & cargo',
    date: 'Fecha',
    tagline: 'Bondy · El estándar para hiring técnico desde 2008',
  } : {
    section: '07 — Terms & acceptance',
    h: 'Term and signature',
    p1: 'This Agreement remains in full force for the duration of the recruitment process and may be terminated by either party upon written notice, subject to the cancellation terms in Section 5.',
    p2: 'Bondy may, at its discretion, use additional sourcing channels. All candidates presented are pre-screened against the DNA scorecard and the AI-first cognitive lens.',
    valid: 'This proposal is valid for ten (10) business days from the date on the cover.',
    accept: 'By signing below, both parties acknowledge and accept the terms of this Agreement.',
    sigBondy: 'Bondy Group LLC',
    sigClient: data.client.legalName,
    name: 'Name & title',
    date: 'Date',
    tagline: 'Bondy · The standard for technical hiring since 2008',
  }

  return (
    <>
      <SectionMark>{t.section}</SectionMark>
      <h2 className="h2">{t.h}</h2>
      <Squiggle width={200}/>

      <p className="p">{t.p1}</p>
      <p className="p">{t.p2}</p>
      <p className="p" style={{ color: '#3A3530' }}><strong>{t.valid}</strong></p>

      <div className="accept-note">
        <Label>{lang === 'es' ? 'Aceptación' : 'Acceptance'}</Label>
        <p className="p">{t.accept}</p>
      </div>

      <div className="sig-grid">
        <div className="sig-cell">
          <Label>{t.sigBondy}</Label>
          <div className="sig-line"></div>
          <div className="sig-name">Mara Schmitman</div>
          <div className="sig-role">{lang === 'es' ? 'Fundadora' : 'Founder'}</div>
          <div className="sig-date">
            <span>{t.date}:</span>
            <span className="sig-date-line"></span>
          </div>
        </div>
        <div className="sig-cell">
          <Label>{t.sigClient}</Label>
          <div className="sig-line"></div>
          <div className="sig-name sig-name--placeholder">{t.name}</div>
          <div className="sig-role">&nbsp;</div>
          <div className="sig-date">
            <span>{t.date}:</span>
            <span className="sig-date-line"></span>
          </div>
        </div>
      </div>

      {data.agreementId && (
        <div className="meta-foot">
          <span>AGREEMENT_ID · {data.agreementId}</span>
          <span>VERSION · 1.0</span>
        </div>
      )}

      <div className="closing">
        <BondyMark size={18}/>
        <span>{t.tagline}</span>
      </div>
    </>
  )
}

// ── ProposalDocument ─────────────────────────────────────
export default function ProposalDocument({ data }) {
  const lang = data.language || 'en'
  const total = data.showTimeline ? 8 : 7
  const variantClass = `variant-${data.variant || 'c'}`

  let n = 0
  return (
    <div className={`proposal-doc-wrapper ${variantClass}`}>
      <Page n={++n} total={total} client={data.client} lang={lang} cover>
        <Cover data={data} lang={lang}/>
      </Page>

      <Page n={++n} total={total} client={data.client} lang={lang}>
        <ExecSummary data={data} lang={lang}/>
      </Page>

      <Page n={++n} total={total} client={data.client} lang={lang}>
        <Roles data={data} lang={lang}/>
      </Page>

      <Page n={++n} total={total} client={data.client} lang={lang}>
        <Method data={data} lang={lang}/>
      </Page>

      <Page n={++n} total={total} client={data.client} lang={lang}>
        <DNASection data={data} lang={lang}/>
      </Page>

      <Page n={++n} total={total} client={data.client} lang={lang}>
        <Fees data={data} lang={lang}/>
      </Page>

      {data.showTimeline && (
        <Page n={++n} total={total} client={data.client} lang={lang}>
          <Timeline data={data} lang={lang}/>
        </Page>
      )}

      <Page n={++n} total={total} client={data.client} lang={lang}>
        <Acceptance data={data} lang={lang}/>
      </Page>
    </div>
  )
}
