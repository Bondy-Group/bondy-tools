'use client'

import { useState, useEffect, useRef } from 'react'

const SIE = '#C06A2D'
const SIE_LIGHT = 'rgba(192,106,45,0.08)'
const SIE_BORDER = 'rgba(192,106,45,0.2)'
const INK = '#1A1A1A'
const MID = '#7A7874'
const LGT = '#C8C5C0'
const RUL = '#E8E4DE'
const STN = '#F0EBE3'
const WHT = '#FFFFFF'
const OFF = '#F9F8F6'
const MONO = "'DM Mono', monospace"
const SERIF = "'Playfair Display', Georgia, serif"
const SANS = "'DM Sans', system-ui, sans-serif"

const BONDY_DIMS_A = [
  { id: 'claridad_motivacional', label: 'Claridad motivacional', description: '¿Sabe por qué busca cambio?' },
  { id: 'consistencia_discurso', label: 'Consistencia del discurso', description: '¿Lo que dice se sostiene?' },
  { id: 'alineacion_cultural', label: 'Alineación cultural', description: '¿Encaja con el tipo de empresa?' },
  { id: 'motivacion_pertenencia', label: 'Motivación de pertenencia', description: '¿Quiere estar aquí o es un puente?' },
]

const BONDY_POSITIONAL = [
  { id: 'preferencia_entorno', label: 'Preferencia de entorno', leftLabel: 'Estructurado', rightLabel: 'Dinámico' },
]

const SCORE_LABELS = {
  1: { label: 'Bajo', color: '#ef4444' },
  2: { label: 'Con reservas', color: '#f59e0b' },
  3: { label: 'Bueno', color: '#84cc16' },
  4: { label: 'Sólido', color: '#22c55e' },
}

// ─── Primitives ────────────────────────────────────────────

const Field = ({ label, required, hint, children }) => (
  <div style={{ marginBottom: '0' }}>
    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 500, color: MID, marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: MONO }}>
      {label}
      {required && <span style={{ color: '#ef4444', fontSize: '10px' }}>*</span>}
    </label>
    {children}
    {hint && <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#555555', fontFamily: MONO }}>{hint}</p>}
  </div>
)

const inputBase = {
  width: '100%', border: `1px solid ${RUL}`, borderRadius: '8px',
  padding: '11px 14px', fontSize: '14px', outline: 'none',
  fontFamily: SANS, background: WHT, color: INK,
  boxSizing: 'border-box', transition: 'border-color 0.15s',
  lineHeight: '1.5',
}
const selectBase = {
  ...inputBase, cursor: 'pointer', appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23C8C5C0' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px',
}
const textareaBase = { ...inputBase, resize: 'vertical', lineHeight: '1.65' }

// Card container
const Card = ({ children, style = {} }) => (
  <div style={{ background: WHT, border: `1px solid ${RUL}`, borderRadius: '12px', padding: '24px', ...style }}>
    {children}
  </div>
)

const CardLabel = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
    <span style={{ display: 'block', width: '14px', height: '1px', background: SIE, flexShrink: 0 }} />
    <span style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: SIE, fontFamily: MONO, fontWeight: 500 }}>{children}</span>
  </div>
)

function CopyBtn({ text, id, copied, onCopy }) {
  const isActive = copied === id
  return (
    <button onClick={() => onCopy(text, id)} style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '6px 14px', border: `1px solid ${isActive ? '#86efac' : RUL}`,
      background: isActive ? '#f0fdf4' : OFF,
      color: isActive ? '#16a34a' : MID,
      borderRadius: '6px', cursor: 'pointer', fontSize: '11px',
      fontFamily: MONO, transition: 'all 0.2s', letterSpacing: '0.05em',
    }}>
      {isActive ? '✓ Copiado' : 'Copiar'}
    </button>
  )
}

function RatingBar({ rating, max = 5 }) {
  const pct = rating < 1 ? 0 : Math.round(((rating - 1) / (max - 1)) * 100)
  const color = pct >= 75 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ flex: 1, height: '4px', background: '#f0f0f0', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(pct, rating > 0 ? 3 : 0)}%`, height: '100%', background: color, borderRadius: '2px', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 700, color: rating > 0 ? color : LGT, fontFamily: MONO, minWidth: '14px' }}>{rating > 0 ? rating : '—'}</span>
    </div>
  )
}

// ─── Recruiter Evaluation Panel ─────────────────────────────

function EvalPanel({ recruiterScores, recruiterPositional, onChange, onPositionalChange }) {
  const allScored = BONDY_DIMS_A.every(d => recruiterScores[d.id])
  const scoredCount = BONDY_DIMS_A.filter(d => recruiterScores[d.id]).length

  return (
    <Card style={{ position: 'sticky', top: '80px', borderLeft: `3px solid ${SIE}` }}>
      <CardLabel>Tu evaluación</CardLabel>
      <p style={{ fontSize: '13px', color: INK, margin: '-10px 0 18px', lineHeight: 1.6 }}>
        Puntuá antes de generar. El modelo evaluará las mismas dimensiones.
      </p>

      {/* Progress */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: INK, fontFamily: MONO }}>{scoredCount}/{BONDY_DIMS_A.length} dimensiones</span>
          {allScored && <span style={{ fontSize: '11px', color: '#22c55e', fontFamily: MONO }}>✓ Completo</span>}
        </div>
        <div style={{ height: '3px', background: RUL, borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${(scoredCount / BONDY_DIMS_A.length) * 100}%`, height: '100%', background: allScored ? '#22c55e' : SIE, transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Dimensions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '18px' }}>
        {BONDY_DIMS_A.map(dim => {
          const val = recruiterScores[dim.id]
          const info = val ? SCORE_LABELS[val] : null
          return (
            <div key={dim.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: INK }}>{dim.label}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: INK }}>{dim.description}</p>
                </div>
                {info && (
                  <span style={{ fontSize: '10px', fontWeight: 700, color: info.color, background: `${info.color}15`, padding: '2px 7px', borderRadius: '4px', fontFamily: MONO, whiteSpace: 'nowrap', marginLeft: '8px', flexShrink: 0 }}>
                    {val} · {info.label}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: '#555555', fontFamily: MONO }}>1</span>
                <input type="range" min="1" max="4" step="1" value={val || 1}
                  onChange={e => onChange(dim.id, parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: SIE, cursor: 'pointer', height: '3px' }}
                />
                <span style={{ fontSize: '10px', color: '#555555', fontFamily: MONO }}>4</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                {[1,2,3,4].map(n => (
                  <span key={n} style={{ fontSize: '9px', color: val === n ? SCORE_LABELS[n].color : '#999999', fontFamily: MONO, transition: 'color 0.15s' }}>
                    {SCORE_LABELS[n].label}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Positional */}
      <div style={{ borderTop: `1px solid ${RUL}`, paddingTop: '16px' }}>
        {BONDY_POSITIONAL.map(dim => {
          const val = recruiterPositional[dim.id] || 3
          const positions = ['Muy estructurado', 'Estructurado', 'Centro', 'Dinámico', 'Muy dinámico']
          return (
            <div key={dim.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: INK }}>{dim.label}</p>
                <span style={{ fontSize: '10px', color: MID, fontFamily: MONO }}>{positions[val-1]}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '10px', color: LGT, fontFamily: MONO, whiteSpace: 'nowrap' }}>{dim.leftLabel}</span>
                <input type="range" min="1" max="5" step="1" value={val}
                  onChange={e => onPositionalChange(dim.id, parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: SIE, cursor: 'pointer' }}
                />
                <span style={{ fontSize: '10px', color: LGT, fontFamily: MONO, whiteSpace: 'nowrap' }}>{dim.rightLabel}</span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── Scorecard Result ────────────────────────────────────────

function ScorecardResultPanel({ scorecard, scorecardSkills, technicalScore, softScore, overallScore, copied, onCopy }) {
  if (!scorecard?.skillRatings) return null
  const skills = scorecardSkills || []
  const techSkills = skills.filter(s => s.skill_type === 'technical')
  const softSkills = skills.filter(s => s.skill_type === 'soft')

  const getRating = (skillId) => {
    const d = scorecard.skillRatings[skillId]
    return typeof d === 'object' ? (d?.rating || 0) : (d || 0)
  }
  const getAnalysis = (skillId) => {
    const d = scorecard.skillRatings[skillId]
    return typeof d === 'object' ? (d?.analysis || d?.evidence || '') : ''
  }
  const scoreLabel = (score) => {
    if (score === null || score === undefined) return null
    if (score >= 85) return { label: 'Excelente', color: '#22c55e' }
    if (score >= 70) return { label: 'Bueno', color: '#84cc16' }
    if (score >= 55) return { label: 'Con potencial', color: '#f59e0b' }
    return { label: 'No recomendado', color: '#ef4444' }
  }
  const overallLabel = scoreLabel(overallScore)

  const buildCopyText = () => {
    let txt = ''
    if (overallScore !== null) txt += `SCORE OVERALL: ${overallScore}/100${overallLabel ? ` (${overallLabel.label})` : ''}\n`
    if (technicalScore !== null) txt += `Score Técnico: ${technicalScore}/100\n`
    if (softScore !== null) txt += `Score Blando: ${softScore}/100\n`
    txt += '\n'
    if (techSkills.length > 0) {
      txt += 'HABILIDADES TÉCNICAS\n'
      techSkills.forEach(s => { txt += `\n${s.name} (${s.weight}%) — ${getRating(s.id)}/5\n`; const a = getAnalysis(s.id); if (a) txt += `${a}\n` })
    }
    if (softSkills.length > 0) {
      txt += '\nHABILIDADES BLANDAS\n'
      softSkills.forEach(s => { txt += `\n${s.name} (${s.weight}%) — ${getRating(s.id)}/5\n`; const a = getAnalysis(s.id); if (a) txt += `${a}\n` })
    }
    if (scorecard.generalAnalysis) txt += `\nANÁLISIS GENERAL\n${scorecard.generalAnalysis}\n`
    if (scorecard.recommendation) txt += `\nRECOMENDACIÓN\n${scorecard.recommendation}\n`
    return txt
  }

  const renderGroup = (list, label, color) => (
    <div style={{ marginBottom: '20px' }}>
      <p style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color, margin: '0 0 12px', fontFamily: MONO }}>{label}</p>
      {list.map(s => {
        const rating = getRating(s.id)
        const analysis = getAnalysis(s.id)
        return (
          <div key={s.id} style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: `1px solid ${RUL}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: INK }}>{s.name}</span>
              <span style={{ fontSize: '11px', color: '#555555', fontFamily: MONO }}>{s.weight}%</span>
            </div>
            <RatingBar rating={rating} />
            {analysis && <p style={{ margin: '6px 0 0', fontSize: '13px', color: MID, lineHeight: 1.65 }}>{analysis}</p>}
          </div>
        )
      })}
    </div>
  )

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <CardLabel>Evaluación por Scorecard</CardLabel>
        <CopyBtn text={buildCopyText()} id="scorecard" copied={copied} onCopy={onCopy} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {technicalScore !== null && (
          <div style={{ textAlign: 'center', padding: '14px', background: `${SIE_LIGHT}`, borderRadius: '8px', border: `1px solid ${SIE_BORDER}` }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: SIE, fontFamily: MONO }}>{technicalScore}</div>
            <div style={{ fontSize: '10px', color: MID, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px', fontFamily: MONO }}>Técnico</div>
          </div>
        )}
        {softScore !== null && (
          <div style={{ textAlign: 'center', padding: '14px', background: '#EFF6FF', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: '#4A90D9', fontFamily: MONO }}>{softScore}</div>
            <div style={{ fontSize: '10px', color: MID, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px', fontFamily: MONO }}>Blando</div>
          </div>
        )}
        {overallScore !== null && (
          <div style={{ textAlign: 'center', padding: '14px', background: overallLabel ? `${overallLabel.color}12` : OFF, borderRadius: '8px', border: `1px solid ${overallLabel ? overallLabel.color + '35' : RUL}` }}>
            <div style={{ fontSize: '28px', fontWeight: 900, color: overallLabel?.color || INK, fontFamily: MONO }}>{overallScore}</div>
            <div style={{ fontSize: '10px', color: MID, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px', fontFamily: MONO }}>Overall</div>
            {overallLabel && <div style={{ fontSize: '10px', color: overallLabel.color, fontWeight: 700, marginTop: '2px', fontFamily: MONO }}>{overallLabel.label}</div>}
          </div>
        )}
      </div>
      {techSkills.length > 0 && renderGroup(techSkills, 'Habilidades Técnicas', SIE)}
      {softSkills.length > 0 && renderGroup(softSkills, 'Habilidades Blandas', '#4A90D9')}
      {scorecard.generalAnalysis && (
        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: MID, margin: '0 0 8px', fontFamily: MONO }}>Análisis General</p>
          <p style={{ fontSize: '14px', color: INK, lineHeight: 1.7, margin: 0 }}>{scorecard.generalAnalysis}</p>
        </div>
      )}
      {scorecard.recommendation && (
        <div style={{ padding: '14px 16px', background: OFF, borderRadius: '8px', border: `1px solid ${RUL}` }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: MID, margin: '0 0 6px', fontFamily: MONO }}>Recomendación</p>
          <p style={{ fontSize: '14px', color: INK, lineHeight: 1.65, margin: 0, fontWeight: 500 }}>{scorecard.recommendation}</p>
        </div>
      )}
    </Card>
  )
}

// ─── Disonancia Modal ─────────────────────────────────────────

function DisonanciaModal({ modelScores, recruiterScores, onSave, onClose }) {
  const [nota, setNota] = useState('')
  const [visibleCliente, setVisibleCliente] = useState(false)
  const LABELS = {
    claridad_motivacional: 'Claridad motivacional',
    consistencia_discurso: 'Consistencia del discurso',
    alineacion_cultural: 'Alineación cultural',
    motivacion_pertenencia: 'Motivación de pertenencia',
  }
  const disonancia = Object.entries(LABELS).map(([id, label]) => {
    const modelVal = modelScores?.block_a?.[id]?.score
    const recVal = recruiterScores?.[id]
    const diff = modelVal && recVal ? Math.abs(modelVal - recVal) : null
    return { id, label, modelVal, recVal, diff }
  })
  const hasDisonancia = disonancia.some(d => d.diff !== null && d.diff >= 2)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,26,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: WHT, borderRadius: '16px', padding: '36px', maxWidth: '540px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800, color: INK, fontFamily: SERIF }}>Confirmar scorecard</h2>
        <p style={{ margin: '0 0 24px', fontSize: '13px', color: MID }}>Revisá la comparación antes de guardar</p>
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: SIE, margin: '0 0 12px', fontFamily: MONO }}>Recruiter vs. Modelo</p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${RUL}` }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: MID, fontWeight: 500, fontFamily: MONO, fontSize: '10px', letterSpacing: '0.08em' }}>Dimensión</th>
                <th style={{ textAlign: 'center', padding: '6px 8px', color: MID, fontWeight: 500, fontFamily: MONO, fontSize: '10px' }}>Recruiter</th>
                <th style={{ textAlign: 'center', padding: '6px 8px', color: MID, fontWeight: 500, fontFamily: MONO, fontSize: '10px' }}>Modelo</th>
                <th style={{ width: '32px' }}></th>
              </tr>
            </thead>
            <tbody>
              {disonancia.map(({ id, label, modelVal, recVal, diff }) => (
                <tr key={id} style={{ borderBottom: `1px solid ${RUL}`, background: diff >= 2 ? '#fff7ed' : 'transparent' }}>
                  <td style={{ padding: '9px 8px', color: INK }}>{label}</td>
                  <td style={{ padding: '9px 8px', textAlign: 'center', fontWeight: 700, color: recVal ? SCORE_LABELS[recVal]?.color : LGT, fontFamily: MONO }}>{recVal || '—'}</td>
                  <td style={{ padding: '9px 8px', textAlign: 'center', fontWeight: 700, color: modelVal ? SCORE_LABELS[modelVal]?.color : LGT, fontFamily: MONO }}>{modelVal || '—'}</td>
                  <td style={{ padding: '9px 8px', textAlign: 'center', fontSize: '13px' }}>
                    {diff >= 2 ? '⚠️' : diff === 1 ? <span style={{ color: LGT }}>~</span> : <span style={{ color: '#86efac' }}>✓</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasDisonancia && <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#d97706', fontFamily: MONO }}>⚠️ Diferencias de 2+ puntos — ¿algo de la entrevista no quedó en el transcript?</p>}
        </div>
        <Field label="Nota interna (opcional)">
          <textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="¿Algo que observaste en vivo que no quedó en el transcript?" style={{ ...textareaBase, minHeight: '80px' }} />
        </Field>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', margin: '16px 0 28px', padding: '14px 16px', background: OFF, borderRadius: '10px', border: `1px solid ${RUL}` }}>
          <input type="checkbox" id="visible-cliente" checked={visibleCliente} onChange={e => setVisibleCliente(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: SIE, cursor: 'pointer', marginTop: '2px', flexShrink: 0 }} />
          <label htmlFor="visible-cliente" style={{ fontSize: '13px', color: INK, cursor: 'pointer', lineHeight: 1.5 }}>
            <strong>Incluir scorecard en el reporte del cliente</strong>
            <span style={{ display: 'block', fontSize: '12px', color: MID, marginTop: '2px' }}>Si no lo activás, queda solo en la base interna</span>
          </label>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '12px', border: `1px solid ${RUL}`, background: WHT, color: MID, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}>
            Cancelar
          </button>
          <button onClick={() => onSave({ nota, visibleCliente })} style={{ flex: 2, padding: '12px', border: 'none', background: SIE, color: WHT, borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, boxShadow: `0 4px 14px ${SIE_BORDER}` }}>
            Guardar scorecard
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────

export default function InterviewTab() {
  const [candidateName, setCandidateName] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [cvText, setCvText] = useState('')
  const fileRef = useRef()

  const [clients, setClients] = useState([])
  const [hasDefaultScorecard, setHasDefaultScorecard] = useState(false)
  const [clientName, setClientName] = useState('')
  const [positions, setPositions] = useState([])
  const [positionId, setPositionId] = useState('')
  const [positionName, setPositionName] = useState('')

  const [jobDescription, setJobDescription] = useState('')
  const [language, setLanguage] = useState('es')
  const [interviewerNotes, setInterviewerNotes] = useState('')
  const [transcript, setTranscript] = useState('')
  const [originalTranscript, setOriginalTranscript] = useState(null)
  const [optimizing, setOptimizing] = useState(false)
  const [optimizeResult, setOptimizeResult] = useState(null)

  const [scorecard, setScorecard] = useState(null)
  const [scorecardLoading, setScorecardLoading] = useState(false)
  const [isDefaultScorecard, setIsDefaultScorecard] = useState(false)

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(null)
  const [recruiterScores, setRecruiterScores] = useState({})
  const [recruiterPositional, setRecruiterPositional] = useState({ preferencia_entorno: 3 })
  const [bondyScorecard, setBondyScorecard] = useState(null)
  const [showDisonanciaModal, setShowDisonanciaModal] = useState(false)
  const [bondyScorecardSaved, setBondyScorecardSaved] = useState(false)
  const [reportId, setReportId] = useState(null)
  const [bondyScorecardLoading, setBondyScorecardLoading] = useState(false)
  const [docUrl, setDocUrl] = useState(null)
  const [docLoading, setDocLoading] = useState(false)
  const [docError, setDocError] = useState(null)

  useEffect(() => {
    fetch('/api/scorecards?clients=true').then(r => r.json()).then(d => {
      setClients(d.clients || [])
      setHasDefaultScorecard(d.hasDefault || false)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setPositions([]); setPositionId(''); setPositionName(''); setScorecard(null)
    if (!clientName) return
    fetch(`/api/scorecards?positions=${encodeURIComponent(clientName)}`).then(r => r.json()).then(d => {
      const pos = d.positions || []
      setPositions(pos)
      if (pos.length === 1) { setPositionId(pos[0].id); setPositionName(pos[0].scorecard_name) }
    }).catch(() => {})
  }, [clientName])

  useEffect(() => {
    if (!clientName) { setScorecard(null); return }
    setScorecardLoading(true)
    const url = positionName
      ? `/api/scorecards?client=${encodeURIComponent(clientName)}&position=${encodeURIComponent(positionName)}`
      : `/api/scorecards?client=${encodeURIComponent(clientName)}`
    fetch(url).then(r => r.json()).then(d => { setScorecard(d.scorecard); setIsDefaultScorecard(d.isDefault || false) })
      .catch(() => setScorecard(null)).finally(() => setScorecardLoading(false))
  }, [clientName, positionName])

  const handleSaveBondyScorecard = async ({ nota, visibleCliente }) => {
    if (!reportId || !bondyScorecard) { setShowDisonanciaModal(false); return }
    try {
      await fetch('/api/bondy-scorecard', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, bondyScorecard, recruiterScores, recruiterPositional, nota, visibleCliente }),
      })
      setBondyScorecardSaved(true)
    } catch (e) { console.error(e) }
    setShowDisonanciaModal(false)
  }

  const handleTranscriptChange = (val) => {
    setTranscript(val)
    if (optimizeResult) { setOptimizeResult(null); setOriginalTranscript(null) }
  }

  const handleOptimize = async () => {
    if (!transcript.trim() || transcript.length < 200) return
    setOptimizing(true); setError(null)
    try {
      const res = await fetch('/api/optimize-transcript', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, positionName: positionName || null, clientName: clientName || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error optimizando')
      if (data.alreadyShort) { setOptimizeResult({ alreadyShort: true }); return }
      setOriginalTranscript(transcript)
      setTranscript(data.optimized)
      setOptimizeResult({ savings: data.savings, originalLength: data.originalLength, optimizedLength: data.optimizedLength })
    } catch (e) { setError('Error al limpiar: ' + e.message) }
    finally { setOptimizing(false) }
  }

  const handleCvFile = (file) => {
    if (!file) return
    setCvFile(file)
    const reader = new FileReader()
    reader.onload = e => setCvText(e.target.result)
    reader.readAsText(file)
  }

  const techSkills = scorecard?.scorecard_data?.skills?.filter(s => s.skill_type === 'technical') || []
  const softSkills = scorecard?.scorecard_data?.skills?.filter(s => s.skill_type === 'soft') || []
  const canGenerate = candidateName.trim().length > 0 && transcript.trim().length > 50
  const showOptimizeBtn = transcript.length > 1500 && !optimizeResult
  const displayClientName = clientName === '__DEFAULT__' ? 'Bondy (Default)' : clientName
  const charCount = transcript.length
  const charColor = charCount > 4000 ? '#ef4444' : charCount > 2500 ? '#f59e0b' : '#888888'

  const handleGenerate = async () => {
    if (!candidateName.trim()) return setError('Ingresá el nombre del candidato')
    if (!transcript.trim() || transcript.trim().length < 50) return setError('Pegá la transcripción de la entrevista')
    setLoading(true); setError(null); setResults(null); setSaved(false); setReportId(null);
    setBondyScorecard(null); setBondyScorecardSaved(false); setShowDisonanciaModal(false); setDocUrl(null); setDocError(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(), interviewerNotes: interviewerNotes.trim() || null,
          candidateName: candidateName.trim(), linkedinUrl: linkedinUrl.trim() || null,
          cvText: cvText.trim() || null,
          clientName: clientName === '__DEFAULT__' ? null : (clientName.trim() || null),
          positionName: positionName.trim() || null, jobDescription: jobDescription.trim() || null,
          language, scorecardId: scorecard?.id || null, scorecardData: scorecard?.scorecard_data || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error generando informe')
      setResults(data)
      if (data.saved) setSaved(true)
      if (data.reportId) setReportId(data.reportId)
      if (transcript.trim().length > 50) {
        setBondyScorecardLoading(true)
        try {
          const scRes = await fetch('/api/bondy-scorecard', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: transcript.trim(), candidateName: candidateName.trim(), clientName: clientName === '__DEFAULT__' ? null : (clientName.trim() || null), positionName: positionName.trim() || null, recruiterScores, recruiterPositional }),
          })
          const scData = await scRes.json()
          if (scData.bondyScorecard) { setBondyScorecard(scData.bondyScorecard); setShowDisonanciaModal(true) }
        } catch (e) { console.error(e) }
        finally { setBondyScorecardLoading(false) }
      }
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleCreateDoc = async () => {
    if (!results?.screeningReport) return
    setDocLoading(true)
    setDocError(null)
    try {
      const res = await fetch('/api/create-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportText: results.screeningReport,
          candidateName: candidateName.trim() || null,
          positionName: positionName.trim() || null,
          clientName: clientName === '__DEFAULT__' ? null : (clientName.trim() || null),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error creando documento')
      setDocUrl(data.docUrl)
      window.open(data.docUrl, '_blank')
    } catch (e) {
      setDocError(e.message)
    } finally {
      setDocLoading(false)
    }
  }

    const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2200)
  }

  return (
    <div style={{ fontFamily: SANS }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        .ib-input:focus { border-color: ${SIE} !important; box-shadow: 0 0 0 3px ${SIE_LIGHT}; }
        .opt-btn:hover:not(:disabled) { background: ${SIE} !important; color: white !important; }
        .gen-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
      `}</style>

      {/* ── Two-column layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', alignItems: 'start' }}>

        {/* LEFT COLUMN — main form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Card 1: Candidato */}
          <Card>
            <CardLabel>Candidato</CardLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <Field label="Nombre" required>
                <input className="ib-input" value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="Nombre del candidato" style={inputBase} />
              </Field>
              <Field label="LinkedIn">
                <input className="ib-input" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="linkedin.com/in/usuario" style={inputBase} />
              </Field>
            </div>
            <Field label="CV (opcional)">
              <div onClick={() => fileRef.current.click()} style={{ border: `1px dashed ${cvFile ? '#86efac' : RUL}`, borderRadius: '8px', padding: '12px 16px', cursor: 'pointer', background: cvFile ? '#f0fdf4' : OFF, display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s' }}>
                <span style={{ fontSize: '18px' }}>{cvFile ? '📄' : '📎'}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: '13px', color: cvFile ? '#16a34a' : MID, fontWeight: cvFile ? 500 : 400 }}>{cvFile ? cvFile.name : 'Subir CV del candidato'}</p>
                  {!cvFile && <p style={{ margin: 0, fontSize: '11px', color: '#555555', fontFamily: MONO }}>PDF · DOCX · TXT</p>}
                </div>
                {cvFile && <button onClick={e => { e.stopPropagation(); setCvFile(null); setCvText('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: LGT, fontSize: '14px', padding: '2px' }}>✕</button>}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={e => handleCvFile(e.target.files[0])} />
            </Field>
          </Card>

          {/* Card 2: Cliente + Posición */}
          <Card>
            <CardLabel>Cliente y posición</CardLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Cliente">
                <select className="ib-input" value={clientName} onChange={e => setClientName(e.target.value)} style={selectBase}>
                  <option value="">— Selección cliente —</option>
                  {hasDefaultScorecard && <option value="__DEFAULT__">⭐ Bondy (Default)</option>}
                  {clients.length > 0 && hasDefaultScorecard && <option disabled>──────────</option>}
                  {clients.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Posición">
                <select className="ib-input"
                  value={positionId}
                  onChange={e => { const sel = positions.find(p => p.id === e.target.value); setPositionId(e.target.value); setPositionName(sel?.scorecard_name || '') }}
                  disabled={!clientName || positions.length === 0}
                  style={{ ...selectBase, opacity: (!clientName || positions.length === 0) ? 0.5 : 1 }}>
                  <option value="">{!clientName ? '— Elegí cliente primero —' : positions.length === 0 ? '— Sin posiciones —' : '— Seleccioná —'}</option>
                  {positions.map(p => <option key={p.id} value={p.id}>{p.scorecard_name}</option>)}
                </select>
              </Field>
            </div>
            {clientName && (
              <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '8px', background: scorecardLoading ? OFF : (scorecard ? (isDefaultScorecard ? '#fff7ed' : '#f0fdf4') : OFF), border: `1px solid ${scorecardLoading ? RUL : (scorecard ? (isDefaultScorecard ? '#fde68a' : '#86efac') : RUL)}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {scorecardLoading
                  ? <span style={{ fontSize: '12px', color: '#555555', fontFamily: MONO }}>Buscando scorecard...</span>
                  : scorecard
                    ? <>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: INK }}>{scorecard.scorecard_name}</span>
                        {isDefaultScorecard && <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#d97706', background: '#fef9c3', padding: '2px 6px', borderRadius: '4px', fontFamily: MONO }}>Default</span>}
                        <span style={{ fontSize: '12px', color: MID, marginLeft: 'auto', fontFamily: MONO }}>🔧 {techSkills.length} · 💬 {softSkills.length}</span>
                      </>
                    : <span style={{ fontSize: '12px', color: INK }}>Sin scorecard para este cliente</span>}
              </div>
            )}
          </Card>

          {/* Card 3: JD + Idioma */}
          <Card>
            <CardLabel>Job description</CardLabel>
            <textarea className="ib-input" value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Pegá la job description aquí..." style={{ ...textareaBase, minHeight: '120px', marginBottom: '14px' }} />
            {!jobDescription.trim() && (
              <p style={{ margin: '-6px 0 12px', fontSize: '12px', color: '#f59e0b', fontFamily: MONO }}>⚠️ Sin JD el modelo no puede evaluar el match con la posición</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '11px', color: MID, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: MONO, fontWeight: 500 }}>Idioma</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['es', 'en'].map(lang => (
                  <button key={lang} onClick={() => setLanguage(lang)} style={{ padding: '6px 18px', borderRadius: '6px', border: `1px solid ${language === lang ? SIE : RUL}`, background: language === lang ? SIE : WHT, color: language === lang ? WHT : MID, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: MONO, transition: 'all 0.15s', letterSpacing: '0.05em' }}>
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Card 4: Notas + Transcript */}
          <Card>
            <CardLabel>Entrevista</CardLabel>
            <Field label="Notas del entrevistador">
              <textarea className="ib-input" value={interviewerNotes} onChange={e => setInterviewerNotes(e.target.value)} placeholder="Impresiones, señales o contexto que no quedó en la transcripción..." style={{ ...textareaBase, minHeight: '80px', marginBottom: '16px' }} />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '11px', fontWeight: 500, color: MID, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: MONO, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Transcripción <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {showOptimizeBtn && (
                <button className="opt-btn" onClick={handleOptimize} disabled={optimizing} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', border: `1px solid ${SIE}`, background: WHT, color: SIE, borderRadius: '6px', cursor: optimizing ? 'wait' : 'pointer', fontSize: '11px', fontWeight: 600, fontFamily: MONO, transition: 'all 0.18s', opacity: optimizing ? 0.7 : 1 }}>
                  {optimizing
                    ? <><span style={{ display: 'inline-block', width: '10px', height: '10px', border: `2px solid ${SIE}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Limpiando...</>
                    : <>✂️ Limpiar transcript</>}
                </button>
              )}
            </div>

            {optimizeResult && (
              <div style={{ marginBottom: '10px', padding: '10px 14px', borderRadius: '8px', animation: 'fadeIn 0.25s ease', background: optimizeResult.alreadyShort ? '#f0f9ff' : '#f0fdf4', border: `1px solid ${optimizeResult.alreadyShort ? '#bae6fd' : '#86efac'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px' }}>{optimizeResult.alreadyShort ? 'ℹ️' : '✅'}</span>
                <div style={{ flex: 1 }}>
                  {optimizeResult.alreadyShort
                    ? <span style={{ fontSize: '13px', color: '#0369a1' }}>Ya es corto, no necesita limpieza</span>
                    : <><span style={{ fontSize: '13px', fontWeight: 600, color: '#16a34a' }}>Transcript limpiado — {optimizeResult.savings}% más corto</span><span style={{ fontSize: '11px', color: MID, marginLeft: '8px', fontFamily: MONO }}>{(optimizeResult.originalLength/1000).toFixed(1)}k → {(optimizeResult.optimizedLength/1000).toFixed(1)}k</span></>}
                </div>
                {!optimizeResult.alreadyShort && originalTranscript && (
                  <button onClick={() => { setTranscript(originalTranscript); setOriginalTranscript(null); setOptimizeResult(null) }} style={{ fontSize: '11px', color: MID, background: 'none', border: `1px solid ${RUL}`, borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: MONO }}>↩ Restaurar</button>
                )}
              </div>
            )}

            <textarea className="ib-input" value={transcript} onChange={e => handleTranscriptChange(e.target.value)} placeholder="Pegá la transcripción completa de la entrevista..." style={{ ...textareaBase, minHeight: charCount > 2000 ? '260px' : '180px' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '11px', color: charColor, fontFamily: MONO }}>{charCount > 0 ? `${charCount.toLocaleString()} caracteres` : 'Mínimo recomendado: 1.000 caracteres'}</span>
              {charCount > 2500 && !optimizeResult && <span style={{ fontSize: '11px', color: '#f59e0b', fontFamily: MONO }}>⚠️ Largo — recomendamos limpiar primero</span>}
            </div>
          </Card>

          {/* Skills preview (si hay scorecard) */}
          {scorecard && (techSkills.length > 0 || softSkills.length > 0) && (
            <Card style={{ background: OFF }}>
              <CardLabel>Skills a evaluar</CardLabel>
              <div style={{ display: 'grid', gridTemplateColumns: techSkills.length > 0 && softSkills.length > 0 ? '1fr 1fr' : '1fr', gap: '14px' }}>
                {techSkills.length > 0 && (
                  <div>
                    <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: SIE, margin: '0 0 10px', fontFamily: MONO }}>Técnicos</p>
                    {techSkills.map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${RUL}`, fontSize: '13px' }}>
                        <span style={{ color: INK }}>{s.name}</span>
                        <span style={{ color: '#555555', fontFamily: MONO }}>{s.weight}%</span>
                      </div>
                    ))}
                  </div>
                )}
                {softSkills.length > 0 && (
                  <div>
                    <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4A90D9', margin: '0 0 10px', fontFamily: MONO }}>Blandos</p>
                    {softSkills.map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${RUL}`, fontSize: '13px' }}>
                        <span style={{ color: INK }}>{s.name}</span>
                        <span style={{ color: '#555555', fontFamily: MONO }}>{s.weight}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Generate button */}
          <button onClick={handleGenerate} disabled={loading || !canGenerate} className="gen-btn" style={{ width: '100%', padding: '15px', border: 'none', background: (!canGenerate || loading) ? LGT : SIE, color: WHT, borderRadius: '10px', cursor: (!canGenerate || loading) ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 700, letterSpacing: '0.04em', boxShadow: (!canGenerate || loading) ? 'none' : `0 4px 18px ${SIE_BORDER}`, transition: 'all 0.2s', fontFamily: MONO, textTransform: 'uppercase' }}>
            {loading ? '⟳ Generando informe...' : bondyScorecardLoading ? '⟳ Analizando perfil...' : scorecard ? `Generar informe + scorecard` : 'Generar informe de entrevista'}
          </button>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '14px 16px', color: '#dc2626', fontSize: '14px' }}>⚠️ {error}</div>
          )}
        </div>

        {/* RIGHT COLUMN — sticky evaluación */}
        <EvalPanel
          recruiterScores={recruiterScores}
          recruiterPositional={recruiterPositional}
          onChange={(id, val) => setRecruiterScores(prev => ({ ...prev, [id]: val }))}
          onPositionalChange={(id, val) => setRecruiterPositional(prev => ({ ...prev, [id]: val }))}
        />
      </div>

      {/* ── Results — full width below ── */}
      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '28px', animation: 'fadeIn 0.3s ease' }}>
          {saved && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', color: '#16a34a', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✓</span> Guardado en Supabase
            </div>
          )}
          {results.screeningReport && (
            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <CardLabel>Informe de Screening</CardLabel>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <CopyBtn text={results.screeningReport} id="screening" copied={copied} onCopy={copy} />
                  <button
                    onClick={handleCreateDoc}
                    disabled={docLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      padding: '6px 16px',
                      background: docUrl ? '#f0fdf4' : SIE,
                      color: docUrl ? '#16a34a' : WHT,
                      border: docUrl ? '1px solid #86efac' : 'none',
                      borderRadius: '6px', cursor: docLoading ? 'wait' : 'pointer',
                      fontSize: '11px', fontWeight: 700, fontFamily: MONO,
                      letterSpacing: '0.05em', transition: 'all 0.2s',
                      opacity: docLoading ? 0.7 : 1,
                    }}
                  >
                    {docLoading
                      ? <><span style={{ display: 'inline-block', width: '10px', height: '10px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Creando...</>
                      : docUrl
                        ? <>✓ Abierto en Docs</>
                        : <><span>📄</span> Abrir en Google Docs</>
                    }
                  </button>
                </div>
              </div>
              {docError && (
                <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', fontSize: '12px', color: '#dc2626', fontFamily: MONO }}>
                  ⚠️ {docError}
                </div>
              )}
              {docUrl && (
                <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>✓</span>
                  <span>Documento creado en Google Drive.</span>
                  <a href={docUrl} target="_blank" rel="noopener noreferrer" style={{ color: SIE, fontWeight: 700, marginLeft: '4px', textDecoration: 'none', fontFamily: MONO }}>
                    Abrir de nuevo ↗
                  </a>
                </div>
              )}
              <div style={{ fontSize: '14px', lineHeight: '1.85', color: INK, whiteSpace: 'pre-wrap' }}>{results.screeningReport}</div>
            </Card>
          )}
          {results.scorecard && (
            <ScorecardResultPanel scorecard={results.scorecard} scorecardSkills={results.scorecardSkills} technicalScore={results.technicalScore} softScore={results.softScore} overallScore={results.overallScore} copied={copied} onCopy={copy} />
          )}
          {bondyScorecardSaved && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', color: '#16a34a', fontSize: '13px' }}>
              ✓ Scorecard Bondy guardada en base de datos
            </div>
          )}
        </div>
      )}

      {showDisonanciaModal && bondyScorecard && (
        <DisonanciaModal modelScores={bondyScorecard} recruiterScores={recruiterScores} onSave={handleSaveBondyScorecard} onClose={() => setShowDisonanciaModal(false)} />
      )}
    </div>
  )
}
