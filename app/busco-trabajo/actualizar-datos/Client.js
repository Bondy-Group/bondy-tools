'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════════
   Actualizá tus datos — v8. Form de autoactualización de perfil.
   - Identifica a la persona por token (?t=) / email firmado (?e=) → prefill.
   - Con match, el submit ACTUALIZA la ficha existente en la Base General.
   - Área principal incluye no-tech; especialización solo para Eng / Data & AI.
   - Sistema Typewriter (crema + verde). Estilos prefijados au-*.
   ═══════════════════════════════════════════════════════════════════ */

const BondyLogo = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A" />
    <rect x="22" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
    <rect x="4" y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
  </svg>
)

const AREAS = [
  { k: 'eng', label: 'Ingeniería / Software', spec: true },
  { k: 'data', label: 'Data & AI', spec: true },
  { k: 'prod', label: 'Producto' },
  { k: 'design', label: 'Diseño (UX/UI)' },
  { k: 'mkt', label: 'Marketing' },
  { k: 'hr', label: 'RRHH / Recruiting / Talent' },
  { k: 'sales', label: 'Ventas / Comercial' },
  { k: 'ops', label: 'Operaciones / PM' },
  { k: 'otro', label: 'Otro' },
]
const AREA_LABELS = AREAS.reduce((a, x) => ((a[x.k] = x.label), a), {})

const SPEC = ['Backend', 'Frontend', 'Full Stack', 'Mobile', 'Data & Analytics', 'ML / AI', 'DevOps / SRE', 'QA / Testing']

const SKILLS_TECH = ['Python', 'Node.js', 'TypeScript', 'React', 'Next.js', 'Java', 'Go', 'C#', '.NET', 'PHP', 'Ruby on Rails', 'Kotlin', 'Swift', 'PostgreSQL', 'SQL', 'MongoDB', 'GraphQL', 'AWS', 'GCP', 'Azure', 'Docker', 'Kubernetes', 'Terraform', 'Spark', 'Airflow', 'dbt', 'Snowflake', 'Databricks', 'PyTorch', 'TensorFlow', 'Selenium', 'Cypress', 'Playwright']
const SKILLS_OTHER = ['HubSpot', 'Salesforce', 'Figma', 'Greenhouse', 'Lever', 'Notion', 'Asana', 'Jira', 'Excel avanzado', 'SQL', 'Power BI', 'Tableau', 'Looker', 'Google Analytics', 'Meta Ads', 'Google Ads', 'LinkedIn Recruiter', 'Workday']

const AI_TOOLS = ['Copilot / Cursor', 'ChatGPT / Claude', 'APIs de LLM (OpenAI, Azure, etc.)', 'RAG / agentes', 'Fine-tuning / entrenamiento', 'No la uso']
const AI_LEVELS = ['No la uso', 'La uso para productividad', 'Construyo productos con IA']
const SENIORITY = ['Jr', 'SemiSr', 'Sr', 'Lead', 'Manager', 'Director']
const INGLES = ['Básico', 'Intermedio', 'Avanzado', 'Bilingüe / Nativo']
const MODALIDAD = ['Remoto', 'Híbrido', 'Onsite']
const BUSQUEDA = ['Buscando activamente', 'Abierto a escuchar', 'No busco ahora']
const DISPONIBILIDAD = ['Inmediata', 'En 2-4 semanas', '+1 mes']
const CONTRATACION = ['Relación de dependencia', 'Contractor']
const CANALES = ['Email', 'WhatsApp', 'LinkedIn']
const IDIOMAS_COMM = ['Español', 'Inglés']

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = reject
    r.readAsDataURL(file)
  })
}

// Match por límite de palabra (mismo criterio que el backend): evita que
// 'html' dispare 'ml', o 'django' dispare 'go'.
function techHit(blob, tech) {
  const esc = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp('(?:^|[^a-z0-9])' + esc + '(?![a-z0-9])').test(blob)
}

function Chip({ on, onClick, children, dashed }) {
  return (
    <span className={`au-chip${on ? ' on' : ''}${dashed ? ' dashed' : ''}`} onClick={onClick} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}>
      {children}
    </span>
  )
}

function Seg({ opts, value, onChange }) {
  return (
    <div className="au-seg">
      {opts.map((o) => (
        <span key={o} className={value === o ? 'on' : ''} onClick={() => onChange(o)} role="button" tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(o) } }}>{o}</span>
      ))}
    </div>
  )
}

const REQ = <span className="au-req">*</span>

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

// Widget de Cloudflare Turnstile. Solo se renderiza si hay site key configurada;
// sin key, el form cae al honeypot + rate-limit y no se rompe.
function Turnstile({ onToken }) {
  const ref = useRef(null)
  const widgetId = useRef(null)
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return
    let cancelled = false
    const render = () => {
      if (cancelled || !ref.current || !window.turnstile || widgetId.current !== null) return
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: TURNSTILE_SITE_KEY,
        callback: (t) => onToken(t),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      })
    }
    if (window.turnstile) { render(); return () => { cancelled = true } }
    const id = 'cf-turnstile-script'
    let poll
    if (!document.getElementById(id)) {
      const s = document.createElement('script')
      s.id = id
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      s.async = true; s.defer = true
      s.onload = render
      document.head.appendChild(s)
    } else {
      poll = setInterval(() => { if (window.turnstile) { clearInterval(poll); render() } }, 200)
    }
    return () => { cancelled = true; if (poll) clearInterval(poll) }
  }, [onToken])
  if (!TURNSTILE_SITE_KEY) return null
  return <div className="au-turn"><div ref={ref} /></div>
}

export default function ActualizarDatosClient({ prefill = null, token = '' }) {
  const p = prefill || {}
  const [f, setF] = useState({
    nombre: p.nombre || '', apellido: p.apellido || '', email: p.email || '', telefono: p.telefono || '',
    linkedin: p.linkedin || '', portfolio: p.portfolio || '',
    ciudad: p.ciudad || '', provincia: p.provincia || '', pais: p.pais || '',
    relocacion: typeof p.relocacion === 'boolean' ? p.relocacion : null,
    area: p.area ? (Object.keys(AREA_LABELS).find((k) => AREA_LABELS[k] === p.area) || 'otro') : '',
    areaOtro: '',
    especializacion: p.especializacion || [],
    seniority: p.seniority || '', aniosExp: p.aniosExp || '',
    skills: p.skills || [],
    aiTools: [], aiLevel: '',
    ingles: p.ingles || '', otrosIdiomas: p.otrosIdiomas || '',
    modalidad: p.modalidad || '', enBusqueda: p.enBusqueda || '', disponibilidad: p.disponibilidad || '',
    salaryCurrency: p.salaryCurrency || 'USD', salarioUsd: p.salarioUsd || '', salarioArs: p.salarioArs || '',
    tipoContratacion: p.tipoContratacion || [],
    canal: p.canal || '', idiomaComm: p.idiomaComm || '',
    consentimiento: typeof p.consentimiento === 'boolean' ? p.consentimiento : false,
    comentarios: '',
  })
  const [step, setStep] = useState(1)
  const [skillInput, setSkillInput] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [hp, setHp] = useState('')
  const [tsToken, setTsToken] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [searches, setSearches] = useState([])
  const [screening, setScreening] = useState({})

  useEffect(() => {
    let alive = true
    fetch('/api/actualizar-datos')
      .then((r) => r.json())
      .then((d) => { if (alive && d && Array.isArray(d.searches)) setSearches(d.searches) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const toggle = (k, val) => setF((s) => ({ ...s, [k]: s[k].includes(val) ? s[k].filter((x) => x !== val) : [...s[k], val] }))

  const areaDef = AREAS.find((a) => a.k === f.area)
  const isTech = f.area === 'eng' || f.area === 'data'
  const skillSuggest = isTech ? SKILLS_TECH : SKILLS_OTHER

  const pickArea = (k) => setF((s) => ({ ...s, area: k, especializacion: [] }))

  // Búsqueda abierta que mejor pega con el stack/área elegido (por overlap de techs).
  const matchBlob = [
    f.area === 'otro' ? f.areaOtro : (AREA_LABELS[f.area] || ''),
    ...(f.especializacion || []),
    ...(f.skills || []),
    f.seniority || '',
  ].join(' ').toLowerCase()
  let matchedSearch = null
  for (const sr of searches) {
    const n = (sr.techs || []).filter((t) => techHit(matchBlob, t)).length
    if (n > 0 && (!matchedSearch || n > matchedSearch._n)) matchedSearch = { ...sr, _n: n }
  }
  const setScreen = (k, v) => setScreening((s) => ({ ...s, [k]: v }))

  const addSkill = (raw) => {
    const v = (raw ?? skillInput).trim()
    if (!v) return
    setF((s) => (s.skills.includes(v) ? s : { ...s, skills: [...s.skills, v] }))
    setSkillInput('')
  }

  const onCv = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setError('El archivo tiene que ser un PDF.'); return }
    if (file.size > 3 * 1024 * 1024) { setError('El PDF es muy grande (máximo 3MB).'); return }
    setError('')
    setCvFile(file)
  }

  const goTo = (n) => { setStep(n); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }

  const validateStep = (n) => {
    if (n === 1) {
      if (!f.nombre.trim() || !f.apellido.trim() || !f.email.trim() || !f.linkedin.trim() || !f.ciudad.trim() || !f.pais.trim())
        return 'Completá nombre, apellido, email, LinkedIn, ciudad y país.'
      if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) return 'Revisá el email, no parece válido.'
      if (!/linkedin\.com/i.test(f.linkedin.trim())) return 'El LinkedIn tiene que ser una URL de linkedin.com.'
    }
    if (n === 2) {
      if (!f.area) return 'Elegí tu área principal.'
      if (f.area === 'otro' && !f.areaOtro.trim()) return 'Contanos cuál es tu área.'
      if (!f.seniority) return 'Elegí tu seniority.'
      if (!f.ingles) return 'Elegí tu nivel de inglés.'
    }
    return ''
  }

  const next = () => {
    const err = validateStep(step)
    if (err) { setError(err); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    goTo(step + 1)
  }

  const submit = async (e) => {
    e.preventDefault()
    for (const n of [1, 2]) {
      const err = validateStep(n)
      if (err) { setStep(n); setError(err); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    }
    if (!f.enBusqueda) { setError('Contanos tu estado de búsqueda.'); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
    if (TURNSTILE_SITE_KEY && !tsToken) { setError('Completá la verificación anti-spam para continuar.'); return }
    setError('')
    setSending(true)
    try {
      let cvBase64, cvName
      if (cvFile) { try { cvBase64 = await fileToBase64(cvFile); cvName = cvFile.name } catch {} }
      const areaOut = f.area === 'otro' ? (f.areaOtro.trim() || 'Otro') : AREA_LABELS[f.area]
      // Screening: solo las respuestas de la búsqueda con la que matcheó ahora.
      const screeningOut = {}
      let screeningText = ''
      if (matchedSearch && matchedSearch.questions && matchedSearch.questions.length) {
        const lines = []
        for (const q of matchedSearch.questions) {
          const val = String(screening[q.key] || '').trim()
          if (val) { screeningOut[q.key] = val; lines.push(`- ${q.label} → ${val}`) }
        }
        if (lines.length) screeningText = `Búsqueda: ${matchedSearch.rol}${matchedSearch.cliente ? ` (${matchedSearch.cliente})` : ''}\n${lines.join('\n')}`
      }
      const res = await fetch('/api/actualizar-datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, area: f.area, areaLabel: areaOut, especializacion: isTech ? f.especializacion : [], token, cvBase64, cvName, hp_field: hp, turnstileToken: tsToken, screening: screeningOut, screeningText, screeningSearchId: (matchedSearch && matchedSearch.id) || '', screeningRol: (matchedSearch && matchedSearch.rol) || '' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.error || 'error')
      setSent(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch {
      setError('Hubo un problema al guardar. Probá de nuevo en un momento.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <main className="au-root">
        <Nav />
        <div className="au-wrap">
          <div className="au-card" style={{ marginTop: 48, textAlign: 'center' }}>
            <span className="au-step">Listo</span>
            <h1 className="au-h1" style={{ fontSize: '2.2rem' }}>¡Listo, {f.nombre || 'gracias'}!</h1>
            <p className="au-lead" style={{ margin: '0 auto' }}>Actualizamos tu perfil. Si encajás con una búsqueda abierta, te escribimos. Podés cerrar esta página.</p>
            <Link href="/busco-trabajo" className="au-back" style={{ display: 'inline-block', marginTop: 20 }}>← Volver a Busco Trabajo</Link>
          </div>
        </div>
        <Styles />
      </main>
    )
  }

  const pct = step * 33.34

  return (
    <main className="au-root">
      <Nav />
      <form className="au-wrap" onSubmit={submit}>
        <div className="au-eyebrow">Perfil de talento</div>
        <h1 className="au-h1">Actualizá tu perfil</h1>
        <p className="au-lead">
          Formás parte de la base de <b>Bondy</b>. Contanos en qué estás hoy para tenerte presente cuando surja una posición que encaje con tu perfil. Toma dos minutos.
        </p>

        {prefill && (
          <div className="au-prefill">
            <span className="dot" />
            <div>Ya cargamos lo que teníamos de vos{f.nombre ? `, ${f.nombre}` : ''}. Revisá que esté bien y completá lo que falte.</div>
          </div>
        )}

        <div className="au-prog">
          <div className="au-prog-bar"><div className="au-prog-fill" style={{ width: `${pct}%` }} /></div>
          <div className="au-prog-steps">
            <span className={step >= 1 ? 'on' : ''}>1 · Vos</span>
            <span className={step >= 2 ? 'on' : ''}>2 · Perfil</span>
            <span className={step >= 3 ? 'on' : ''}>3 · Preferencias</span>
          </div>
          <div className="au-prog-time">Paso {step} de 3 · ~2 min</div>
        </div>

        {error && <div className="au-error">{error}</div>}

        {/* ───── PASO 1 ───── */}
        {step === 1 && (
          <>
            <div className="au-card">
              <span className="au-step">01 — Identidad</span>
              <div className="au-row">
                <div><label className="au-label">Nombre {REQ}</label><input className="au-in" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Tu nombre" /></div>
                <div><label className="au-label">Apellido {REQ}</label><input className="au-in" value={f.apellido} onChange={(e) => set('apellido', e.target.value)} placeholder="Tu apellido" /></div>
              </div>
              <label className="au-label">Email {REQ} <span className="au-hint">(para avisarte si hay match)</span></label>
              <input className="au-in" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@email.com" />
              <div className="au-row">
                <div><label className="au-label">Teléfono / celular <span className="au-hint">(con código de país)</span></label><input className="au-in" value={f.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="+54 11 5555 5555" /></div>
                <div><label className="au-label">LinkedIn {REQ}</label><input className="au-in" type="url" value={f.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/tu-perfil" /></div>
              </div>
              <div className="au-row">
                <div><label className="au-label">GitHub / Repo / Portfolio <span className="au-hint">(opcional)</span></label><input className="au-in" type="url" value={f.portfolio} onChange={(e) => set('portfolio', e.target.value)} placeholder="https://github.com/..." /></div>
                <div><label className="au-label">CV en PDF <span className="au-hint">(opcional)</span></label>
                  <label className="au-drop">
                    <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={onCv} />
                    {cvFile ? <><b>{cvFile.name}</b> (cambiar)</> : <>Subí tu CV <b>(PDF)</b></>}
                  </label>
                </div>
              </div>
            </div>

            <div className="au-card">
              <span className="au-step">02 — Ubicación</span>
              <div className="au-row3">
                <div><label className="au-label">Ciudad {REQ}</label><input className="au-in" value={f.ciudad} onChange={(e) => set('ciudad', e.target.value)} placeholder="Ej: CABA" /></div>
                <div><label className="au-label">Provincia / Estado</label><input className="au-in" value={f.provincia} onChange={(e) => set('provincia', e.target.value)} placeholder="Ej: Buenos Aires" /></div>
                <div><label className="au-label">País {REQ}</label><input className="au-in" value={f.pais} onChange={(e) => set('pais', e.target.value)} placeholder="Ej: Argentina" /></div>
              </div>
              <label className="au-label">¿Disponible para relocación?</label>
              <Seg opts={['Sí', 'No']} value={f.relocacion === true ? 'Sí' : f.relocacion === false ? 'No' : ''} onChange={(v) => set('relocacion', v === 'Sí')} />
            </div>

            <div className="au-nav-btns"><span /><button type="button" className="au-cta" onClick={next}>Siguiente →</button></div>
          </>
        )}

        {/* ───── PASO 2 ───── */}
        {step === 2 && (
          <>
            <div className="au-card">
              <span className="au-step">03 — Área &amp; Perfil</span>
              <label className="au-label">Área principal {REQ} <span className="au-hint">(elegí una)</span></label>
              <div className="au-areas">
                {AREAS.map((a) => (
                  <span key={a.k} className={`au-area${f.area === a.k ? ' on' : ''}`} onClick={() => pickArea(a.k)} role="button" tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickArea(a.k) } }}>{a.label}</span>
                ))}
              </div>
              {f.area === 'otro' && (
                <>
                  <label className="au-label">¿Cuál? {REQ}</label>
                  <input className="au-in" value={f.areaOtro} onChange={(e) => set('areaOtro', e.target.value)} placeholder="Contanos tu área" />
                </>
              )}
              {areaDef?.spec && (
                <div className="au-cond">
                  <label className="au-label">Especialización <span className="au-hint">(marcá todo lo que aplique)</span></label>
                  <div className="au-chips">
                    {SPEC.map((s) => <Chip key={s} on={f.especializacion.includes(s)} onClick={() => toggle('especializacion', s)}>{s}</Chip>)}
                  </div>
                </div>
              )}
              <div className="au-row" style={{ marginTop: 16 }}>
                <div><label className="au-label">Seniority {REQ}</label>
                  <select className="au-in" value={f.seniority} onChange={(e) => set('seniority', e.target.value)}>
                    <option value="">Elegí</option>{SENIORITY.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="au-label">Años de experiencia</label><input className="au-in" type="number" value={f.aniosExp} onChange={(e) => set('aniosExp', e.target.value)} placeholder="Ej: 6" /></div>
              </div>
            </div>

            <div className="au-card">
              <span className="au-step">04 — {isTech ? 'Stack & skills' : 'Herramientas & especialidades'}</span>
              <label className="au-label">{isTech ? 'Lenguajes, frameworks y herramientas' : 'Herramientas y especialidades'} <span className="au-hint">(escribí y Enter, o elegí de la lista)</span></label>
              <div className="au-add">
                <input className="au-in" list="au-skills" value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                  placeholder={isTech ? 'Ej: Python, React, PostgreSQL...' : 'Ej: HubSpot, Figma, Greenhouse, SQL...'} />
                <button type="button" className="au-addbtn" onClick={() => addSkill()}>Agregar</button>
              </div>
              <datalist id="au-skills">{skillSuggest.map((s) => <option key={s} value={s} />)}</datalist>
              {!!f.skills.length && (
                <div className="au-chips" style={{ marginTop: 12 }}>
                  {f.skills.map((s) => <Chip key={s} on dashed onClick={() => set('skills', f.skills.filter((x) => x !== s))}>{s} ✕</Chip>)}
                </div>
              )}
              {!f.skills.length && (
                <div className="au-chips" style={{ marginTop: 12 }}>
                  {skillSuggest.slice(0, 8).map((s) => <Chip key={s} on={false} onClick={() => addSkill(s)}>{s}</Chip>)}
                </div>
              )}
              <label className="au-label">Uso de IA en el trabajo</label>
              <Seg opts={AI_LEVELS} value={f.aiLevel} onChange={(v) => set('aiLevel', v)} />
              <div className="au-chips" style={{ marginTop: 10 }}>
                {AI_TOOLS.map((t) => <Chip key={t} on={f.aiTools.includes(t)} onClick={() => toggle('aiTools', t)}>{t}</Chip>)}
              </div>
            </div>

            {matchedSearch && matchedSearch.questions && matchedSearch.questions.length > 0 && (
              <div className="au-card au-match">
                <span className="au-step">★ Encaja con una búsqueda abierta</span>
                <p className="au-lead" style={{ fontSize: 14, margin: '2px 0 6px' }}>
                  Tu perfil pega con <b>{matchedSearch.rol}</b>{matchedSearch.cliente ? ` · ${matchedSearch.cliente}` : ''}. Contanos un poco más para pasarte al equipo <span className="au-hint">(opcional)</span>:
                </p>
                {matchedSearch.questions.map((q) => (
                  <div key={q.key}>
                    <label className="au-label">{q.label}</label>
                    {q.type === 'select'
                      ? <Seg opts={q.options} value={screening[q.key] || ''} onChange={(v) => setScreen(q.key, v)} />
                      : <textarea className="au-in" rows={2} value={screening[q.key] || ''} onChange={(e) => setScreen(q.key, e.target.value)} placeholder="Tu respuesta" />}
                  </div>
                ))}
              </div>
            )}

            <div className="au-card">
              <span className="au-step">05 — Idiomas</span>
              <label className="au-label">Nivel de inglés {REQ}</label>
              <Seg opts={INGLES} value={f.ingles} onChange={(v) => set('ingles', v)} />
              <label className="au-label">Otros idiomas <span className="au-hint">(opcional)</span></label>
              <input className="au-in" value={f.otrosIdiomas} onChange={(e) => set('otrosIdiomas', e.target.value)} placeholder="Ej: Portugués intermedio" />
            </div>

            <div className="au-nav-btns"><button type="button" className="au-ghost" onClick={() => goTo(1)}>← Atrás</button><button type="button" className="au-cta" onClick={next}>Siguiente →</button></div>
          </>
        )}

        {/* ───── PASO 3 ───── */}
        {step === 3 && (
          <>
            <div className="au-card">
              <span className="au-step">06 — Preferencias laborales</span>
              <label className="au-label">Modalidad preferida</label>
              <Seg opts={MODALIDAD} value={f.modalidad} onChange={(v) => set('modalidad', v)} />
              <label className="au-label">Estado de búsqueda {REQ}</label>
              <Seg opts={BUSQUEDA} value={f.enBusqueda} onChange={(v) => set('enBusqueda', v)} />
              <label className="au-label">Disponibilidad</label>
              <Seg opts={DISPONIBILIDAD} value={f.disponibilidad} onChange={(v) => set('disponibilidad', v)} />
              <label className="au-label">Expectativa salarial mensual <span className="au-hint">(opcional — completá una, la otra, o las dos)</span></label>
              <div className="au-row">
                <div><label className="au-label" style={{ marginTop: 0 }}>En USD <span className="au-hint">(ej. contractor)</span></label>
                  <input className="au-in" type="number" value={f.salarioUsd} onChange={(e) => set('salarioUsd', e.target.value)} placeholder="Ej: 4000" /></div>
                <div><label className="au-label" style={{ marginTop: 0 }}>En ARS <span className="au-hint">(ej. relación de dependencia)</span></label>
                  <input className="au-in" type="number" value={f.salarioArs} onChange={(e) => set('salarioArs', e.target.value)} placeholder="Ej: 3000000" /></div>
              </div>
              <label className="au-label">Tipo de contratación <span className="au-hint">(marcá las que apliquen)</span></label>
              <div className="au-chips">
                {CONTRATACION.map((s) => <Chip key={s} on={f.tipoContratacion.includes(s)} onClick={() => toggle('tipoContratacion', s)}>{s}</Chip>)}
              </div>
            </div>

            <div className="au-card">
              <span className="au-step">07 — Contacto &amp; consentimiento</span>
              <div className="au-row">
                <div><label className="au-label">Canal de contacto preferido</label>
                  <select className="au-in" value={f.canal} onChange={(e) => set('canal', e.target.value)}>
                    <option value="">Elegí</option>{CANALES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="au-label">Idioma de comunicación</label>
                  <select className="au-in" value={f.idiomaComm} onChange={(e) => set('idiomaComm', e.target.value)}>
                    <option value="">Elegí</option>{IDIOMAS_COMM.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <label className="au-label">Comentarios <span className="au-hint">(opcional)</span></label>
              <textarea className="au-in" rows={3} value={f.comentarios} onChange={(e) => set('comentarios', e.target.value)}
                placeholder="Lo que quieras contarnos: en qué te gustaría crecer, qué equipo buscás, algo que no entra en un campo..." />
              <label className="au-check">
                <input type="checkbox" checked={f.consentimiento} onChange={(e) => set('consentimiento', e.target.checked)} />
                <span>Autorizo a Bondy a compartir mi perfil con sus clientes para oportunidades laborales.</span>
              </label>
              <input type="text" name="hp_field" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
              <Turnstile onToken={setTsToken} />
              <div className="au-nav-btns">
                <button type="button" className="au-ghost" onClick={() => goTo(2)}>← Atrás</button>
                <button type="submit" className="au-cta" disabled={sending}>{sending ? 'Guardando...' : '¡Listo, actualizar mi perfil! →'}</button>
              </div>
              <p className="au-hint" style={{ marginTop: 14 }}>Si preferís que no te contactemos, respondé el correo y te damos de baja de la lista.</p>
            </div>
          </>
        )}

        <p className="au-foot">Bondy · The standard for technical hiring since 2008 · <a href="https://wearebondy.com">wearebondy.com</a></p>
      </form>
      <Styles />
    </main>
  )
}

function Nav() {
  return (
    <header className="au-nav">
      <Link href="/busco-trabajo" className="au-brand">
        <BondyLogo size={22} />
        <span className="au-wordmark">BONDY</span>
      </Link>
      <Link href="/busco-trabajo" className="au-back">← Busco Trabajo</Link>
    </header>
  )
}

function Styles() {
  return (
    <style>{`
      .au-root{--bg:#FEFCF9;--ink:#1A1A1A;--mid:#3A3530;--sub:#5A5550;--faint:#7A7874;--green:#4A8C40;--rule:#E8E4DE;--white:#fff;
        min-height:100vh;color:var(--sub);font-family:'Plus Jakarta Sans',system-ui,sans-serif;line-height:1.6;
        background-color:var(--bg);
        background-image:linear-gradient(rgba(210,100,80,.10) 1px,transparent 1px),linear-gradient(rgba(100,140,200,.09) 1px,transparent 1px);
        background-size:100% 32px;padding:0 20px 80px}
      .au-nav{height:60px;display:flex;align-items:center;justify-content:space-between;max-width:720px;margin:0 auto;border-bottom:1px solid var(--rule)}
      .au-brand{display:flex;align-items:center;gap:10px;text-decoration:none}
      .au-wordmark{font-family:'Special Elite',Georgia,serif;font-size:17px;color:var(--ink);letter-spacing:.04em}
      .au-back{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);text-decoration:none}
      .au-back:hover{color:var(--green)}
      .au-wrap{max-width:720px;margin:0 auto}
      .au-eyebrow{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--green);font-weight:500;margin:44px 0 12px}
      .au-h1{font-family:'Special Elite',Georgia,serif;font-size:clamp(2rem,6vw,3rem);color:var(--mid);line-height:1.05;margin:0 0 14px;font-weight:400}
      .au-lead{font-size:15px;color:var(--sub);max-width:60ch;margin:0}
      .au-lead b{color:var(--mid);font-weight:600}
      .au-prefill{display:flex;gap:12px;align-items:flex-start;background:rgba(74,140,64,.06);border:1px solid rgba(74,140,64,.3);padding:14px 16px;margin-top:24px;font-size:13px;color:var(--mid)}
      .au-prefill .dot{width:8px;height:8px;border-radius:50%;background:var(--green);margin-top:6px;flex:none}
      .au-prog{position:sticky;top:0;background:rgba(254,252,249,.97);backdrop-filter:blur(12px);z-index:5;padding:14px 0 12px;margin-top:26px;border-bottom:1px solid var(--rule)}
      .au-prog-bar{height:3px;background:var(--rule);border-radius:2px;overflow:hidden}
      .au-prog-fill{height:100%;background:var(--green);transition:width .35s ease}
      .au-prog-steps{display:flex;justify-content:space-between;margin-top:8px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);font-weight:500}
      .au-prog-steps span.on{color:var(--green)}
      .au-prog-time{font-size:10px;color:var(--faint);letter-spacing:.08em;text-transform:uppercase;margin-top:2px}
      .au-error{background:#fff;border:1px solid #d97a6c;color:#b4432f;padding:12px 16px;margin-top:20px;font-size:14px}
      .au-card{background:var(--white);border:1px solid var(--rule);padding:26px;margin-top:24px}
      .au-step{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--green);font-weight:500;display:block;margin-bottom:8px}
      .au-label{display:block;font-size:13px;font-weight:500;color:var(--mid);margin:16px 0 6px}
      .au-req{color:var(--green)}
      .au-hint{font-size:12px;color:var(--faint);font-weight:400}
      .au-in{width:100%;font-family:inherit;font-size:14px;color:var(--ink);padding:11px 12px;border:1px solid var(--rule);background:var(--bg);outline:none;resize:vertical}
      .au-in:focus{border-color:var(--green)}
      .au-row{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .au-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px}
      .au-drop{display:block;border:1px dashed var(--rule);background:var(--bg);padding:11px;text-align:center;font-size:13px;color:var(--faint);cursor:pointer}
      .au-drop b{color:var(--green);font-weight:600}
      .au-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
      .au-chip{font-size:12px;padding:7px 12px;border:1px solid var(--rule);background:var(--bg);color:var(--sub);cursor:pointer;user-select:none}
      .au-chip.on{border-color:var(--green);color:var(--green);background:rgba(74,140,64,.06)}
      .au-chip.dashed{border-style:dashed}
      .au-add{display:flex;gap:8px;margin-top:6px}
      .au-add .au-in{flex:1}
      .au-addbtn{white-space:nowrap;font-size:12px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;background:var(--bg);color:var(--green);border:1px solid rgba(74,140,64,.4);padding:0 16px;cursor:pointer}
      .au-areas{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
      .au-area{font-size:13px;padding:9px 14px;border:1px solid var(--rule);background:var(--bg);color:var(--sub);cursor:pointer;user-select:none}
      .au-area.on{border-color:var(--green);color:var(--green);background:rgba(74,140,64,.08);font-weight:600}
      .au-seg{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap}
      .au-seg span{flex:1 1 auto;min-width:104px;text-align:center;font-size:13px;line-height:1.3;padding:9px 10px;border:1px solid var(--rule);background:var(--bg);color:var(--sub);cursor:pointer;word-break:break-word}
      .au-seg span.on{border-color:var(--green);color:var(--green);background:rgba(74,140,64,.06)}
      .au-cond{border-left:2px solid rgba(74,140,64,.35);padding-left:16px;margin-top:12px}
      .au-match{border-color:rgba(74,140,64,.5);background:rgba(74,140,64,.05)}
      .au-match .au-step{color:var(--green)}
      .au-check{display:flex;gap:10px;align-items:flex-start;margin-top:16px;font-size:13px;color:var(--sub);cursor:pointer}
      .au-check input{margin-top:3px}
      .au-turn{margin-top:18px;min-height:0}
      .au-nav-btns{display:flex;justify-content:space-between;align-items:center;margin-top:24px;gap:12px}
      .au-cta{display:inline-flex;align-items:center;gap:8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;background:var(--green);color:#fff;padding:13px 26px;border:none;cursor:pointer}
      .au-cta:disabled{opacity:.6;cursor:default}
      .au-ghost{display:inline-flex;align-items:center;gap:8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;background:transparent;color:var(--sub);padding:13px 20px;border:1px solid var(--rule);cursor:pointer}
      .au-foot{font-size:12px;color:var(--faint);margin-top:26px;text-align:center}
      .au-foot a{color:var(--green);text-decoration:none}
      @media(max-width:560px){
        .au-root{padding:0 14px 60px}
        .au-row,.au-row3{grid-template-columns:1fr}
        .au-card{padding:20px}
        .au-add{flex-direction:column}
        .au-addbtn{padding:11px}
        .au-seg span{flex:1 1 100%;min-width:100%}
        .au-nav-btns{flex-direction:column-reverse;align-items:stretch;gap:10px}
        .au-nav-btns>span{display:none}
        .au-cta,.au-ghost{width:100%;justify-content:center}
        .au-prog{padding:12px 0 10px}
        .au-areas{gap:6px}
        .au-area{font-size:12px;padding:8px 12px}
      }
      @media(max-width:380px){
        .au-h1{font-size:1.7rem}
        .au-prog-steps{font-size:9px}
        .au-card{padding:16px}
        .au-step{font-size:9px}
      }
    `}</style>
  )
}
