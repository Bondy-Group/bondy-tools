'use client'

import { useState, useRef, useEffect } from 'react'
import { calculateWeightedScore, getScoreLabel } from '@/lib/scorecards'

const BONDY_ORANGE = '#E05C00'
const BONDY_ORANGE_LIGHT = '#F47C20'

const inputBase = {
  width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '10px 14px',
  fontSize: '14px', outline: 'none', fontFamily: 'inherit', backgroundColor: 'white',
  color: '#111', transition: 'border-color 0.15s', boxSizing: 'border-box',
}
const inputStyle = { ...inputBase, resize: 'vertical' }
const noResizeInput = { ...inputBase, resize: 'none' }

const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#555', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
    {children}
  </label>
)
const Muted = ({ children }) => <span style={{ color: '#bbb', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{children}</span>

function RatingStars({ value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {[1,2,3,4,5].map(star => (
        <button key={star} onClick={() => !disabled && onChange(star === value ? 0 : star)} disabled={disabled}
          style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1.5px solid', fontSize: '11px', fontWeight: 700,
            borderColor: value >= star ? BONDY_ORANGE : '#e5e7eb', background: value >= star ? BONDY_ORANGE : 'white',
            color: value >= star ? 'white' : '#ccc', cursor: disabled ? 'default' : 'pointer',
            fontFamily: 'DM Mono, monospace', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }}>
          {star}
        </button>
      ))}
    </div>
  )
}

function ScorecardResult({ scorecardData, manualRatings, onManualRatingChange, mode }) {
  const { scorecard, skillRatings, generalNotes } = scorecardData
  const isAI = mode === 'ai'
  const ratings = isAI
    ? Object.fromEntries(scorecard.skills.map(s => [s.id, skillRatings?.[s.id]?.rating || 0]))
    : manualRatings

  const weightedScore = calculateWeightedScore(ratings, scorecard)
  const scoreLabel = getScoreLabel(weightedScore)

  const techSkills = scorecard.skills.filter(s => s.skill_type === 'technical' || !s.skill_type)
  const softSkills = scorecard.skills.filter(s => s.skill_type === 'soft')

  const SkillRow = ({ skill }) => {
    const rating = ratings[skill.id] || 0
    const aiData = skillRatings?.[skill.id]
    const pct = rating > 0 ? ((rating - 1) / 4) * 100 : 0
    return (
      <div style={{ borderRadius: '10px', border: '1px solid #f0f0f0', padding: '12px 14px', background: '#fafafa' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: rating > 0 ? '8px' : '0', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>{skill.name}</span>
              <span style={{ fontSize: '10px', color: '#bbb', fontFamily: 'DM Mono, monospace' }}>peso {skill.weight}%</span>
            </div>
            {skill.description && <p style={{ fontSize: '11px', color: '#999', margin: '2px 0 0', lineHeight: 1.5 }}>{skill.description}</p>}
          </div>
          <div style={{ flexShrink: 0 }}>
            <RatingStars value={rating} onChange={isAI ? () => {} : (v) => onManualRatingChange(skill.id, v)} disabled={isAI} />
          </div>
        </div>
        {rating > 0 && (
          <div style={{ height: '3px', background: '#e5e7eb', borderRadius: '2px', marginBottom: isAI && aiData?.analysis ? '8px' : '0' }}>
            <div style={{ height: '100%', background: BONDY_ORANGE, borderRadius: '2px', width: pct + '%', transition: 'width 0.3s' }} />
          </div>
        )}
        {isAI && aiData?.analysis && <p style={{ fontSize: '12px', color: '#555', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>"{aiData.analysis}"</p>}
        {isAI && aiData?.evidence && (
          <p style={{ fontSize: '11px', color: '#777', margin: '6px 0 0', padding: '6px 10px', background: '#f5f5f5', borderRadius: '6px', borderLeft: '3px solid ' + BONDY_ORANGE }}>
            {aiData.evidence}
          </p>
        )}
      </div>
    )
  }

  return (
    <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: 'DM Mono, monospace', marginBottom: '4px' }}>
            Scorecard {isAI ? '· Evaluado por IA' : '· Vista previa'}
          </div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#111', fontFamily: 'Playfair Display, serif' }}>{scorecard.name}</div>
        </div>
        {weightedScore !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: scoreLabel.color, fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>{weightedScore}</div>
            <div style={{ fontSize: '11px', color: scoreLabel.color, fontWeight: 700, marginTop: '2px' }}>{scoreLabel.label}</div>
          </div>
        )}
      </div>

      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {techSkills.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: 'DM Mono, monospace', marginBottom: '10px' }}>
              🔧 Skills Técnicos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {techSkills.map(skill => <SkillRow key={skill.id} skill={skill} />)}
            </div>
          </div>
        )}

        {softSkills.length > 0 && (
          <div>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4A90D9', fontFamily: 'DM Mono, monospace', marginBottom: '10px' }}>
              💬 Skills Blandos
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {softSkills.map(skill => <SkillRow key={skill.id} skill={skill} />)}
            </div>
          </div>
        )}

        {isAI && generalNotes && (
          <div style={{ padding: '16px', background: '#f9f8f6', borderRadius: '10px', border: '1px solid #f0ede8' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', fontFamily: 'DM Mono, monospace', marginBottom: '8px' }}>Notas generales</div>
            <p style={{ fontSize: '13px', color: '#444', margin: 0, lineHeight: 1.7 }}>{generalNotes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper to build scorecard object from Supabase format
function buildScorecardFromDb(dbScorecard) {
  if (!dbScorecard) return null
  return {
    id: dbScorecard.client_name === '__DEFAULT__' ? 'default' : dbScorecard.client_name.toLowerCase().replace(/\s+/g, '_'),
    name: dbScorecard.scorecard_name,
    skills: (dbScorecard.scorecard_data?.skills || []).map(s => ({
      id: s.id,
      name: s.name,
      weight: s.weight,
      skill_type: s.skill_type,
      type: s.skill_type, // backwards compat
      description: s.description || '',
      questions: s.questions || [],
    })),
    _dbId: dbScorecard.id,
    _clientName: dbScorecard.client_name,
  }
}

export default function InterviewTab() {
  const [candidateName, setCandidateName] = useState('')
  const [candidateLinkedin, setCandidateLinkedin] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [notes, setNotes] = useState('')
  const [client, setClient] = useState('')
  const [clients, setClients] = useState([])
  const [clientsLoading, setClientsLoading] = useState(true)

  // Scorecard state
  const [activeScorecard, setActiveScorecard] = useState(null)
  const [scorecardLoading, setScorecardLoading] = useState(false)
  const [isDefaultScorecard, setIsDefaultScorecard] = useState(false)
  const [manualRatings, setManualRatings] = useState({})

  // Generation state
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [saveStatus, setSaveStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('screening')

  const resultsRef = useRef(null)

  // Load clients
  useEffect(() => {
    fetch('/api/clients')
      .then(r => r.json())
      .then(d => { setClients(d.clients || []); setClientsLoading(false) })
      .catch(() => setClientsLoading(false))
  }, [])

  // Load scorecard when client changes
  useEffect(() => {
    const loadScorecard = async () => {
      setScorecardLoading(true)
      setActiveScorecard(null)
      try {
        const url = client ? `/api/scorecards?client=${encodeURIComponent(client)}` : '/api/scorecards?client=__DEFAULT__'
        const res = await fetch(url)
        const data = await res.json()
        if (data.scorecard) {
          const sc = buildScorecardFromDb(data.scorecard)
          setActiveScorecard(sc)
          setIsDefaultScorecard(data.isDefault || data.scorecard.client_name === '__DEFAULT__')
          // Reset manual ratings when scorecard changes
          const initialRatings = {}
          sc.skills.forEach(s => { initialRatings[s.id] = 0 })
          setManualRatings(initialRatings)
        }
      } catch (e) {
        console.error('Error loading scorecard:', e)
      } finally {
        setScorecardLoading(false)
      }
    }
    loadScorecard()
  }, [client])

  const handleManualRatingChange = (skillId, value) => {
    setManualRatings(prev => ({ ...prev, [skillId]: value }))
  }

  const manualScore = activeScorecard
    ? calculateWeightedScore(manualRatings, activeScorecard)
    : null

  const handleGenerate = async () => {
    if (!notes.trim()) { setError('Agregá las notas de la entrevista.'); return }
    setLoading(true); setError(null); setResult(null); setSaveStatus(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: candidateName.trim(),
          candidateLinkedin: candidateLinkedin.trim(),
          jobDescription: jobDescription.trim(),
          notes: notes.trim(),
          client: client.trim(),
          scorecardId: activeScorecard?._dbId || null,
          scorecardData: activeScorecard ? { skills: activeScorecard.skills } : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setSaveStatus(data.saved ? 'saved' : 'not_saved')
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch (e) {
      setError(e.message || 'Error al generar el informe.')
    } finally {
      setLoading(false)
    }
  }

  const hasManualRatings = Object.values(manualRatings).some(v => v > 0)

  // Build manual scorecard data for preview
  const manualScorecardData = activeScorecard ? {
    scorecard: activeScorecard,
    skillRatings: null,
    generalNotes: null,
  } : null

  // Build AI scorecard data
  const aiScorecardData = result?.scorecard && activeScorecard ? {
    scorecard: activeScorecard,
    skillRatings: result.scorecard.skillRatings,
    generalNotes: result.scorecard.generalNotes,
  } : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Client + Scorecard selector */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e5e7eb', padding: '24px' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: 'DM Mono, monospace', marginBottom: '16px' }}>
          Cliente & Scorecard
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <Label>Cliente <Muted>(opcional)</Muted></Label>
            {clientsLoading ? (
              <div style={{ ...noResizeInput, color: '#bbb', fontSize: '13px' }}>Cargando clientes...</div>
            ) : (
              <select value={client} onChange={e => setClient(e.target.value)} style={{ ...noResizeInput, cursor: 'pointer' }}>
                <option value="">— Sin cliente asignado —</option>
                {clients.map(c => <option key={c.id || c.name} value={c.name}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div>
            <Label>Scorecard activa</Label>
            <div style={{ ...noResizeInput, display: 'flex', alignItems: 'center', gap: '10px', background: '#FAFAFA', cursor: 'default' }}>
              {scorecardLoading ? (
                <span style={{ color: '#bbb', fontSize: '13px' }}>Cargando scorecard...</span>
              ) : activeScorecard ? (
                <>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#111', fontWeight: 600 }}>{activeScorecard.name}</span>
                  {isDefaultScorecard && !client && (
                    <span style={{ fontSize: '10px', color: BONDY_ORANGE, background: 'rgba(224,92,0,0.08)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'DM Mono, monospace' }}>Default</span>
                  )}
                </>
              ) : (
                <span style={{ color: '#bbb', fontSize: '13px' }}>Sin scorecard</span>
              )}
            </div>
          </div>
        </div>

        {activeScorecard && (
          <div style={{ marginTop: '12px', padding: '10px 14px', background: '#F9F8F6', borderRadius: '8px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#888', fontFamily: 'DM Mono, monospace' }}>
              🔧 {activeScorecard.skills.filter(s => s.skill_type === 'technical').length} técnicos
              &nbsp;·&nbsp;
              💬 {activeScorecard.skills.filter(s => s.skill_type === 'soft').length} blandos
            </span>
            {isDefaultScorecard && client && (
              <span style={{ fontSize: '11px', color: '#d97706' }}>
                ⚠️ {client} no tiene scorecard propia. Usando la default.
              </span>
            )}
            <a href="/internal/scorecard-admin" target="_blank"
              style={{ fontSize: '11px', color: BONDY_ORANGE, textDecoration: 'none', marginLeft: 'auto', fontFamily: 'DM Mono, monospace' }}>
              Administrar scorecards →
            </a>
          </div>
        )}
      </div>

      {/* Manual scorecard preview */}
      {activeScorecard && !result && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#888', fontFamily: 'DM Mono, monospace' }}>
              Pre-rating manual <Muted>(opcional)</Muted>
            </div>
            {hasManualRatings && (
              <div style={{ fontSize: '11px', color: BONDY_ORANGE, fontFamily: 'DM Mono, monospace', fontWeight: 700 }}>
                Score manual: {manualScore}/5
              </div>
            )}
          </div>
          <ScorecardResult
            scorecardData={manualScorecardData}
            manualRatings={manualRatings}
            onManualRatingChange={handleManualRatingChange}
            mode="manual"
          />
        </div>
      )}

      {/* Form */}
      <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e5e7eb', padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <Label>Nombre del candidato <Muted>(opcional)</Muted></Label>
            <input value={candidateName} onChange={e => setCandidateName(e.target.value)}
              placeholder="Nombre Apellido" style={noResizeInput} />
          </div>
          <div>
            <Label>LinkedIn / URL <Muted>(opcional)</Muted></Label>
            <input value={candidateLinkedin} onChange={e => setCandidateLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/..." style={noResizeInput} />
          </div>
        </div>

        <div>
          <Label>Descripción del puesto <Muted>(opcional)</Muted></Label>
          <textarea value={jobDescription} onChange={e => setJobDescription(e.target.value)}
            rows={3} placeholder="Copiá la JD o describí brevemente el rol y stack requerido..." style={inputStyle} />
        </div>

        <div>
          <Label>Notas de la entrevista *</Label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            rows={8} placeholder="Pegá tus notas de la entrevista aquí. Mientras más detalle, mejor será el informe y la evaluación de scorecard..." style={inputStyle} />
        </div>

        {error && (
          <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '13px' }}>
            ⚠️ {error}
          </div>
        )}

        <button onClick={handleGenerate} disabled={loading || !notes.trim()}
          style={{ padding: '14px 32px', border: 'none', background: loading || !notes.trim() ? '#ccc' : `linear-gradient(135deg, ${BONDY_ORANGE}, ${BONDY_ORANGE_LIGHT})`,
            color: 'white', borderRadius: '10px', cursor: loading || !notes.trim() ? 'not-allowed' : 'pointer',
            fontSize: '14px', fontWeight: 700, transition: 'all 0.2s', alignSelf: 'flex-end', minWidth: '200px' }}>
          {loading ? 'Generando...' : activeScorecard ? '✦ Generar informe + scorecard' : '✦ Generar informe'}
        </button>
      </div>

      {/* Results */}
      {result && (
        <div ref={resultsRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Save status */}
          {saveStatus && (
            <div style={{ padding: '10px 16px', background: saveStatus === 'saved' ? '#f0fdf4' : '#fefce8', border: `1px solid ${saveStatus === 'saved' ? '#86efac' : '#fde68a'}`, borderRadius: '8px', fontSize: '12px', color: saveStatus === 'saved' ? '#16a34a' : '#d97706', fontFamily: 'DM Mono, monospace' }}>
              {saveStatus === 'saved' ? '✓ Guardado en Supabase' : '⚠ No se pudo guardar'}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '2px solid #f0f0f0', gap: '4px' }}>
            {[
              { id: 'screening', label: 'Informe de Screening' },
              ...(aiScorecardData ? [{ id: 'scorecard', label: 'Scorecard IA' }] : []),
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ padding: '10px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab.id ? 700 : 500,
                  color: activeTab === tab.id ? BONDY_ORANGE : '#888', borderBottom: `2px solid ${activeTab === tab.id ? BONDY_ORANGE : 'transparent'}`, marginBottom: '-2px', transition: 'all 0.15s' }}>
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'screening' && result.screening && (
            <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e5e7eb', padding: '32px' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: 'DM Mono, monospace', marginBottom: '20px' }}>
                Informe de Screening {result.candidateName && `· ${result.candidateName}`}
              </div>
              <div style={{ fontSize: '14px', lineHeight: 1.8, color: '#222', whiteSpace: 'pre-wrap', fontFamily: 'DM Sans, sans-serif' }}>
                {result.screening}
              </div>
            </div>
          )}

          {activeTab === 'scorecard' && aiScorecardData && (
            <ScorecardResult
              scorecardData={aiScorecardData}
              manualRatings={{}}
              onManualRatingChange={() => {}}
              mode="ai"
            />
          )}
        </div>
      )}
    </div>
  )
}
