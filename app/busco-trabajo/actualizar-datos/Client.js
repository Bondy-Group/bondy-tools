'use client'

import { useState } from 'react'
import Link from 'next/link'

/* ═══════════════════════════════════════════════════════════════════
   Actualizá tus datos — formulario de autoactualización de perfil.
   Puerto React del preview aprobado por Mara (v7). Estilos propios
   prefijados au-* para no chocar con globals.css.

   TODO backend (próximo paso): POST a /api/actualizar-datos que
   (1) enriquezca LinkedIn/CV, (2) escriba en Airtable "Talento —
   Autoactualización", (3) corra el scorecard y avise en Slack.
   Por ahora el submit valida y muestra estado de éxito, sin persistir.
   ═══════════════════════════════════════════════════════════════════ */

const BondyLogo = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A" />
    <rect x="22" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
    <rect x="4" y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
  </svg>
)

const AREAS = [
  { k: 'back', label: 'Backend' },
  { k: 'front', label: 'Frontend' },
  { k: 'full', label: 'Full Stack' },
  { k: 'data', label: 'Data & Analytics' },
  { k: 'ml', label: 'ML / AI' },
  { k: 'devops', label: 'DevOps / SRE' },
  { k: 'mobile', label: 'Mobile' },
  { k: 'qa', label: 'QA' },
]

const STACKS = {
  back: { title: 'Backend', chips: ['Python', 'Node.js', 'Java', 'Go', 'C#', 'SQL', 'PostgreSQL', 'Microservicios', 'AWS', 'Docker', 'Kubernetes'] },
  front: { title: 'Frontend', chips: ['React', 'TypeScript', 'Next.js', 'Vue', 'Angular', 'CSS / Tailwind', 'Testing (Jest/Cypress)', 'Accesibilidad', 'Design systems'] },
  full: { title: 'Full Stack', chips: ['React', 'TypeScript', 'Node.js', 'Next.js', 'Python', 'SQL', 'PostgreSQL', 'AWS', 'Docker'] },
  data: { title: 'Data & Analytics', chips: ['SQL avanzado', 'Python', 'PySpark / Spark', 'Databricks', 'Airflow', 'dbt', 'Kafka', 'Delta Lake', 'AWS / Azure / GCP'], extra: 'databricks' },
  ml: { title: 'ML / AI', chips: ['Python', 'PyTorch', 'TensorFlow', 'LLMs / RAG', 'MLOps', 'Spark', 'SQL', 'Cloud (AWS/Azure/GCP)'], extra: 'mlprod' },
  devops: { title: 'DevOps / SRE', chips: ['Kubernetes', 'Terraform', 'AWS', 'GCP', 'Azure', 'CI/CD', 'Docker', 'Observability', 'Linux'] },
  mobile: { title: 'Mobile', chips: ['Swift', 'Kotlin', 'React Native', 'Flutter', 'iOS', 'Android', 'CI/CD mobile'] },
  qa: { title: 'QA', chips: ['Automation', 'Selenium', 'Cypress', 'Playwright', 'API testing', 'Performance', 'QA manual'] },
}

const EXTRA = {
  databricks: { q: '¿Trabajaste con Databricks en producción?', opts: ['No', 'Menos de 2 años', '2+ años'] },
  mlprod: { q: '¿Pusiste modelos de ML/IA en producción?', opts: ['No', 'Sí, alguno', 'Sí, es mi día a día'] },
}

const SUGGEST = ['GraphQL', 'Rust', 'Scala', 'Snowflake', 'Redshift', 'Elasticsearch', 'MongoDB', 'Redis', 'RabbitMQ', 'gRPC', 'Terraform', 'Ansible', 'Grafana', 'Prometheus', 'Svelte', 'Remix', 'Astro', 'Django', 'FastAPI', 'Spring Boot', '.NET', 'Ruby on Rails', 'Laravel', 'Power BI', 'Tableau', 'Looker']

const AI_TOOLS = ['Copilot / Cursor', 'ChatGPT / Claude', 'APIs de LLM en features (OpenAI, Azure, etc.)', 'RAG / agentes', 'Fine-tuning / entrenamiento', 'No la uso']
const AI_LEVELS = ['La uso para productividad', 'Construyo productos con IA', 'No la uso']
const MODALIDAD = ['Híbrido en Buenos Aires', 'Remoto', 'Presencial', 'Dispuesto a mudarme']
const BUSQUEDA = ['Activamente', 'De forma pasiva, si aparece algo interesante', 'No por ahora']
const SENIORITY = ['Semi Senior', 'Senior', 'Staff / Lead']
const INGLES = ['Básico', 'Intermedio', 'Avanzado', 'Bilingüe']

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = reject
    r.readAsDataURL(file)
  })
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

export default function ActualizarDatosClient() {
  const [f, setF] = useState({
    nombre: '', apellido: '', linkedin: '', email: '', ciudad: '', salario: '',
    seniority: '', ingles: '', observaciones: '',
    area: '', stack: [], custom: [], extra: '', aiTools: [], aiLevel: '',
    modalidad: '', busqueda: '',
  })
  const [addInput, setAddInput] = useState('')
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [hp, setHp] = useState('')
  const [cvFile, setCvFile] = useState(null)

  const onCv = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') { setError('El archivo tiene que ser un PDF.'); return }
    if (file.size > 3 * 1024 * 1024) { setError('El PDF es muy grande (máximo 3MB). Subilo más liviano o dejalo y completá a mano.'); return }
    setError('')
    setCvFile(file)
  }

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }))
  const toggle = (k, val) => setF((p) => ({ ...p, [k]: p[k].includes(val) ? p[k].filter((x) => x !== val) : [...p[k], val] }))

  const pickArea = (k) => setF((p) => ({ ...p, area: k, stack: [], custom: [], extra: '' }))

  const addTech = () => {
    const v = addInput.trim()
    if (!v) return
    setF((p) => (p.custom.includes(v) ? p : { ...p, custom: [...p.custom, v] }))
    setAddInput('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!f.nombre.trim() || !f.apellido.trim() || !f.linkedin.trim()) {
      setError('Completá nombre, apellido y tu LinkedIn para continuar.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setError('')
    setSending(true)
    try {
      let cvBase64
      let cvName
      if (cvFile) {
        try { cvBase64 = await fileToBase64(cvFile); cvName = cvFile.name } catch {}
      }
      const res = await fetch('/api/actualizar-datos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, cvBase64, cvName, hp_field: hp }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) throw new Error(data.error || 'error')
      setSent(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setError('Hubo un problema al guardar. Probá de nuevo en un momento.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSending(false)
    }
  }

  const stackDef = f.area ? STACKS[f.area] : null

  if (sent) {
    return (
      <main className="au-root">
        <Nav />
        <div className="au-wrap">
          <div className="au-card" style={{ marginTop: 48, textAlign: 'center' }}>
            <span className="au-step">Listo</span>
            <h1 className="au-h1" style={{ fontSize: '2.2rem' }}>Gracias, {f.nombre}.</h1>
            <p className="au-lead" style={{ margin: '0 auto' }}>Guardamos tu actualización. Si tu perfil encaja con una búsqueda abierta, te escribimos. Podés cerrar esta página.</p>
            <Link href="/busco-trabajo" className="au-back" style={{ display: 'inline-block', marginTop: 20 }}>← Volver a Busco Trabajo</Link>
          </div>
        </div>
        <Styles />
      </main>
    )
  }

  return (
    <main className="au-root">
      <Nav />
      <form className="au-wrap" onSubmit={submit}>
        <div className="au-eyebrow">Perfil de talento</div>
        <h1 className="au-h1">Actualizá tu perfil</h1>
        <p className="au-lead">
          Formás parte de la base de <b>Bondy</b>. Trabajamos búsquedas tech senior de forma constante y es probable que tu información esté desactualizada. Contanos en qué estás hoy y te tenemos presente cuando surja una posición que encaje con tu perfil. Toma dos minutos.
        </p>

        {error && <div className="au-error">{error}</div>}

        <div className="au-card">
          <span className="au-step">01 — Tus datos</span>
          <div className="au-row">
            <div><label className="au-label">Nombre</label><input className="au-in" value={f.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Tu nombre" /></div>
            <div><label className="au-label">Apellido</label><input className="au-in" value={f.apellido} onChange={(e) => set('apellido', e.target.value)} placeholder="Tu apellido" /></div>
          </div>
          <label className="au-label" style={{ marginTop: 18 }}>Tu perfil de LinkedIn <span className="au-hint">(obligatorio)</span></label>
          <input className="au-in" type="url" value={f.linkedin} onChange={(e) => set('linkedin', e.target.value)} placeholder="https://www.linkedin.com/in/tu-perfil" />
          <label className="au-label" style={{ marginTop: 20 }}>Subí tu CV o tu perfil de LinkedIn en PDF <span className="au-hint">(recomendado)</span></label>
          <label className="au-drop">
            <input type="file" accept="application/pdf" style={{ display: 'none' }} onChange={onCv} />
            {cvFile
              ? <>Archivo: <b>{cvFile.name}</b> (click para cambiar)</>
              : <>Arrastrá el archivo o hacé click para subirlo <b>(PDF)</b></>}
          </label>
          <p className="au-hint" style={{ marginTop: 12, lineHeight: 1.6 }}>Sugerencia: en tu perfil de LinkedIn entrá a <b style={{ color: '#3A3530' }}>Más → Guardar como PDF</b> y subí ese archivo. Con eso completamos los campos por vos y te ahorrás el trabajo. Si preferís, dejalo vacío y completás a mano más abajo.</p>
        </div>

        <div className="au-card">
          <span className="au-step">02 — ¿Cuál es tu especialidad hoy?</span>
          <p className="au-hint" style={{ marginBottom: 4 }}>Elegí una. Según lo que marques, te mostramos el stack que corresponde.</p>
          <div className="au-areas">
            {AREAS.map((a) => (
              <span key={a.k} className={`au-area${f.area === a.k ? ' on' : ''}`} onClick={() => pickArea(a.k)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickArea(a.k) } }}>{a.label}</span>
            ))}
          </div>
        </div>

        {stackDef && (
          <div className="au-card">
            <span className="au-step">03 — Tu stack</span>
            <div className="au-dyn">{stackDef.title}</div>
            <div className="au-cond">
              <label className="au-label">Marcá todo lo que trabajás actualmente</label>
              <div className="au-chips">
                {stackDef.chips.map((c) => (
                  <Chip key={c} on={f.stack.includes(c)} onClick={() => toggle('stack', c)}>{c}</Chip>
                ))}
                {f.custom.map((c) => (
                  <Chip key={c} on dashed onClick={() => set('custom', f.custom.filter((x) => x !== c))}>{c} ✕</Chip>
                ))}
              </div>
              {stackDef.extra && (
                <>
                  <label className="au-label" style={{ marginTop: 18 }}>{EXTRA[stackDef.extra].q}</label>
                  <Seg opts={EXTRA[stackDef.extra].opts} value={f.extra} onChange={(v) => set('extra', v)} />
                </>
              )}
              <label className="au-label" style={{ marginTop: 20 }}>¿Falta algo? Sumalo <span className="au-hint">(escribí y presioná Enter, o buscá en la lista)</span></label>
              <div className="au-add">
                <input className="au-in" list="au-techlist" value={addInput} onChange={(e) => setAddInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTech() } }}
                  placeholder="Ej: Rust, GraphQL, Snowflake, Terraform..." />
                <button type="button" className="au-addbtn" onClick={addTech}>Agregar</button>
              </div>
              <datalist id="au-techlist">{SUGGEST.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
          </div>
        )}

        <div className="au-card">
          <span className="au-step">04 — Manejo de IA <span className="au-tag">Todas las áreas</span></span>
          <label className="au-label">¿Cómo usás IA en tu trabajo hoy? <span className="au-hint">(marcá todo lo que aplique)</span></label>
          <div className="au-chips">
            {AI_TOOLS.map((t) => <Chip key={t} on={f.aiTools.includes(t)} onClick={() => toggle('aiTools', t)}>{t}</Chip>)}
          </div>
          <label className="au-label">Tu nivel con IA</label>
          <Seg opts={AI_LEVELS} value={f.aiLevel} onChange={(v) => set('aiLevel', v)} />
        </div>

        <div className="au-card">
          <span className="au-step">05 — Datos generales</span>
          <div className="au-row">
            <div><label className="au-label">Seniority</label>
              <select className="au-in" value={f.seniority} onChange={(e) => set('seniority', e.target.value)}>
                <option value="">Elegí</option>{SENIORITY.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="au-label">Inglés</label>
              <select className="au-in" value={f.ingles} onChange={(e) => set('ingles', e.target.value)}>
                <option value="">Elegí</option>{INGLES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="au-row">
            <div><label className="au-label">Ciudad</label><input className="au-in" value={f.ciudad} onChange={(e) => set('ciudad', e.target.value)} placeholder="Ej: CABA" /></div>
            <div><label className="au-label">Expectativa salarial (USD/mes)</label><input className="au-in" type="number" value={f.salario} onChange={(e) => set('salario', e.target.value)} placeholder="Ej: 4000" /></div>
          </div>
          <label className="au-label">Modalidad</label>
          <Seg opts={MODALIDAD} value={f.modalidad} onChange={(v) => set('modalidad', v)} />
          <label className="au-label">¿Estás en búsqueda?</label>
          <Seg opts={BUSQUEDA} value={f.busqueda} onChange={(v) => set('busqueda', v)} />
          <label className="au-label">Email <span className="au-hint">(para avisarte si hay match)</span></label>
          <input className="au-in" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="tu@email.com" />
        </div>

        <div className="au-card">
          <span className="au-step">06 — Contanos algo más</span>
          <label className="au-label">¿Qué querés contarnos sobre vos que no te preguntamos?</label>
          <textarea className="au-in" rows={4} value={f.observaciones} onChange={(e) => set('observaciones', e.target.value)}
            placeholder="Lo que quieras: en qué te gustaría crecer, qué tipo de equipo buscás, un proyecto del que estés orgulloso, algo que no entra en un campo..." />
          <input type="text" name="hp_field" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
          <button type="submit" className="au-cta" disabled={sending}>{sending ? 'Guardando...' : 'Guardar mi perfil →'}</button>
          <p className="au-hint" style={{ marginTop: 14 }}>Si preferís que no te contactemos, respondé el correo y te damos de baja de la lista.</p>
        </div>

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
      .au-eyebrow{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--green);font-weight:500;margin:48px 0 12px}
      .au-h1{font-family:'Special Elite',Georgia,serif;font-size:clamp(2.2rem,6vw,3.2rem);color:var(--mid);line-height:1.05;margin-bottom:16px;font-weight:400}
      .au-lead{font-size:16px;color:var(--sub);max-width:62ch}
      .au-lead b{color:var(--mid);font-weight:600}
      .au-error{background:#fff;border:1px solid #d97a6c;color:#b4432f;padding:12px 16px;margin-top:20px;font-size:14px}
      .au-card{background:var(--white);border:1px solid var(--rule);padding:28px;margin-top:28px}
      .au-step{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--green);font-weight:500;display:block;margin-bottom:14px}
      .au-label{display:block;font-size:13px;font-weight:500;color:var(--mid);margin:18px 0 6px}
      .au-hint{font-size:12px;color:var(--faint);font-weight:400}
      .au-in{width:100%;font-family:inherit;font-size:14px;color:var(--ink);padding:11px 12px;border:1px solid var(--rule);background:var(--bg);outline:none;resize:vertical}
      .au-in:focus{border-color:var(--green)}
      .au-drop{display:block;border:1px dashed var(--rule);background:var(--bg);padding:22px;text-align:center;font-size:13px;color:var(--faint);cursor:pointer}
      .au-drop b{color:var(--green);font-weight:600}
      .au-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .au-chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
      .au-chip{font-size:12px;padding:7px 12px;border:1px solid var(--rule);background:var(--bg);color:var(--sub);cursor:pointer;user-select:none}
      .au-chip.on{border-color:var(--green);color:var(--green);background:rgba(74,140,64,.06)}
      .au-chip.dashed{border-style:dashed}
      .au-add{display:flex;gap:8px;margin-top:12px}
      .au-add .au-in{flex:1}
      .au-addbtn{white-space:nowrap;font-size:12px;letter-spacing:.06em;text-transform:uppercase;font-weight:600;background:var(--bg);color:var(--green);border:1px solid rgba(74,140,64,.4);padding:0 16px;cursor:pointer}
      .au-areas{display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
      .au-area{font-size:13px;padding:9px 14px;border:1px solid var(--rule);background:var(--bg);color:var(--sub);cursor:pointer;user-select:none}
      .au-area.on{border-color:var(--green);color:var(--green);background:rgba(74,140,64,.08);font-weight:600}
      .au-seg{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap}
      .au-seg span{flex:1;min-width:90px;text-align:center;font-size:13px;padding:9px;border:1px solid var(--rule);background:var(--bg);color:var(--sub);cursor:pointer}
      .au-seg span.on{border-color:var(--green);color:var(--green);background:rgba(74,140,64,.06)}
      .au-dyn{font-family:'Special Elite',Georgia,serif;font-size:15px;color:var(--mid);margin-top:4px}
      .au-cond{border-left:2px solid rgba(74,140,64,.35);padding-left:16px;margin-top:8px}
      .au-cta{margin-top:28px;display:inline-flex;align-items:center;gap:8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;background:var(--green);color:#fff;padding:14px 28px;border:none;cursor:pointer}
      .au-tag{display:inline-block;font-size:9px;letter-spacing:.12em;text-transform:uppercase;padding:3px 9px;border:1px solid rgba(74,140,64,.3);color:var(--green);margin-left:8px}
      .au-foot{font-size:12px;color:var(--faint);margin-top:24px;text-align:center}
      .au-foot a{color:var(--green);text-decoration:none}
      @media(max-width:560px){
        .au-root{padding:0 14px 60px}
        .au-row{grid-template-columns:1fr}
        .au-card{padding:20px}
        .au-add{flex-direction:column}
        .au-addbtn{padding:11px 16px}
        .au-seg span{min-width:100%}
      }
    `}</style>
  )
}
