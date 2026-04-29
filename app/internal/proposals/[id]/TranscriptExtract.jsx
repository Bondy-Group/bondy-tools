'use client'

import { useState, useRef } from 'react'

const tw = {
  ink: '#1A1A1A', inkMid: '#3A3530', inkSub: '#5A5550',
  inkFaint: '#7A7874', rule: '#E8E4DE', white: '#FFFFFF', green: '#4A8C40',
}
const ui = "'Plus Jakarta Sans', system-ui, sans-serif"
const mono = "'Courier Prime', Courier, monospace"

const FIELD_LABELS = {
  client_name: 'Cliente',
  client_legal_name: 'Razón social',
  client_short_name: 'Nombre corto',
  client_contact: 'Contacto',
  client_contact_role: 'Cargo',
  client_location: 'Ubicación',
  client_work_mode: 'Modalidad',
  roles: 'Roles',
  approach_notes: 'Approach (bullets)',
}

const FIELD_ORDER = [
  'client_name', 'client_legal_name', 'client_short_name',
  'client_contact', 'client_contact_role', 'client_location', 'client_work_mode',
  'roles', 'approach_notes',
]

export default function TranscriptExtract({ row, onApply }) {
  const [tab, setTab] = useState('url') // 'url' | 'file' | 'text'
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [extracted, setExtracted] = useState(null) // { ...fields }
  const [selected, setSelected] = useState({}) // { field: bool }
  const fileInputRef = useRef(null)

  async function extract() {
    setLoading(true)
    setError(null)
    setExtracted(null)
    try {
      let payload
      if (tab === 'url') {
        if (!url.trim()) throw new Error('Pegá una URL')
        payload = { source: 'url', url: url.trim() }
      } else if (tab === 'text') {
        if (text.trim().length < 50) throw new Error('El texto es muy corto')
        payload = { source: 'text', text }
      } else if (tab === 'file') {
        if (!file) throw new Error('Subí un archivo')
        if (file.size > 8 * 1024 * 1024) {
          throw new Error('Archivo muy grande (máx 8MB). Pegá el texto en la pestaña Texto.')
        }
        const base64 = await fileToBase64(file)
        payload = {
          source: 'file',
          fileBase64: base64,
          mimeType: file.type,
          fileName: file.name,
        }
      }

      const res = await fetch('/api/proposals/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error en extracción')

      setExtracted(json.extracted)
      // Pre-seleccionar todos los campos que vinieron con valor
      const sel = {}
      for (const k of FIELD_ORDER) {
        const v = json.extracted[k]
        sel[k] = v != null && v !== '' && !(Array.isArray(v) && v.length === 0)
      }
      setSelected(sel)
    } catch (err) {
      setError(String(err.message || err))
    } finally {
      setLoading(false)
    }
  }

  function applySelected() {
    const patch = {}
    for (const k of FIELD_ORDER) {
      if (!selected[k]) continue
      const v = extracted[k]
      if (k === 'roles') {
        // Solo sobreescribir roles si vienen no vacíos
        if (Array.isArray(v) && v.length > 0) {
          patch.roles = v.map((r) => ({
            title: r.title || '',
            qty: Number(r.qty) || 1,
            focus: r.focus || '',
          }))
        }
      } else if (k === 'approach_notes') {
        patch.approach_notes = v || ''
      } else {
        patch[k] = v ?? ''
      }
    }
    onApply(patch)
    // Reset
    setExtracted(null)
    setSelected({})
    setUrl('')
    setText('')
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div style={{ marginBottom: 24, padding: 14, background: '#FAFFF8', border: `1px solid ${tw.green}33`, borderRadius: 2 }}>
      <h3 style={{
        margin: '0 0 10px', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: tw.green, fontWeight: 600,
      }}>
        ✨ Auto-llenar desde transcript
      </h3>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        {[['url', 'URL'], ['file', 'Archivo'], ['text', 'Texto']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              flex: 1, padding: '6px 10px', fontSize: 12, fontFamily: ui,
              border: `1px solid ${tab === k ? tw.green : tw.rule}`,
              background: tab === k ? 'rgba(74,140,64,0.08)' : tw.white,
              color: tab === k ? tw.green : tw.ink,
              fontWeight: tab === k ? 600 : 400,
              cursor: 'pointer', borderRadius: 2,
            }}
          >{label}</button>
        ))}
      </div>

      {/* Inputs */}
      {tab === 'url' && (
        <input
          type="url"
          placeholder="https://fathom.video/share/... o link de Meet"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={inputStyle}
        />
      )}
      {tab === 'file' && (
        <input
          type="file"
          ref={fileInputRef}
          accept=".pdf,.txt,.md,.vtt,.srt,application/pdf,text/plain,text/markdown,text/vtt"
          onChange={(e) => setFile(e.target.files[0] || null)}
          style={{ ...inputStyle, padding: 6 }}
        />
      )}
      {tab === 'text' && (
        <textarea
          placeholder="Pegá el transcript completo acá…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: ui }}
        />
      )}

      {/* Action */}
      <button
        onClick={extract}
        disabled={loading}
        style={{
          width: '100%', marginTop: 8, padding: '10px',
          fontSize: 13, fontFamily: ui, fontWeight: 600,
          background: loading ? '#aaa' : tw.green, color: tw.white,
          border: 'none', borderRadius: 2,
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Analizando transcript…' : 'Extraer datos'}
      </button>

      {error && (
        <div style={{
          marginTop: 8, padding: 10, fontSize: 12,
          background: '#FEE', color: '#900', borderRadius: 2,
        }}>{error}</div>
      )}

      {/* Modal de diff */}
      {extracted && (
        <DiffModal
          row={row}
          extracted={extracted}
          selected={selected}
          setSelected={setSelected}
          onApply={applySelected}
          onClose={() => setExtracted(null)}
        />
      )}
    </div>
  )
}

function DiffModal({ row, extracted, selected, setSelected, onApply, onClose }) {
  const anySelected = Object.values(selected).some(Boolean)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: tw.white, width: '100%', maxWidth: 900, maxHeight: '88vh',
          overflowY: 'auto', borderRadius: 4, padding: 24,
          fontFamily: ui,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Revisá los cambios</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 24, color: tw.inkFaint, cursor: 'pointer', padding: 4 }}
          >×</button>
        </div>
        <p style={{ margin: '0 0 16px', fontSize: 13, color: tw.inkSub }}>
          Marcá los campos que querés aplicar. Los que tengan checkbox sobreescriben el form actual.
        </p>

        <div style={{ borderTop: `1px solid ${tw.rule}` }}>
          {FIELD_ORDER.map((field) => {
            const newVal = extracted[field]
            const oldVal = field === 'roles' ? row.roles : row[field]
            const hasNew = !isEmpty(newVal)
            return (
              <DiffRow
                key={field}
                field={field}
                label={FIELD_LABELS[field]}
                oldVal={oldVal}
                newVal={newVal}
                hasNew={hasNew}
                checked={!!selected[field]}
                onToggle={() => setSelected((s) => ({ ...s, [field]: !s[field] }))}
              />
            )
          })}
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px', fontSize: 13, fontFamily: ui,
              background: tw.white, color: tw.ink,
              border: `1px solid ${tw.rule}`, borderRadius: 2, cursor: 'pointer',
            }}
          >Cancelar</button>
          <button
            onClick={onApply}
            disabled={!anySelected}
            style={{
              padding: '10px 18px', fontSize: 13, fontWeight: 600, fontFamily: ui,
              background: anySelected ? tw.green : '#aaa',
              color: tw.white, border: 'none', borderRadius: 2,
              cursor: anySelected ? 'pointer' : 'not-allowed',
            }}
          >Aplicar seleccionados</button>
        </div>
      </div>
    </div>
  )
}

function DiffRow({ field, label, oldVal, newVal, hasNew, checked, onToggle }) {
  if (!hasNew) {
    return (
      <div style={{ padding: '12px 4px', borderBottom: `1px solid ${tw.rule}`, fontSize: 12, color: tw.inkFaint }}>
        <strong style={{ color: tw.inkFaint }}>{label}:</strong> sin datos en el transcript
      </div>
    )
  }
  return (
    <div style={{ padding: '12px 4px', borderBottom: `1px solid ${tw.rule}`, display: 'flex', gap: 12 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        style={{ marginTop: 4, accentColor: tw.green, cursor: 'pointer' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: tw.green, fontWeight: 600, marginBottom: 6 }}>
          {label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ValueBox title="Actual" value={oldVal} muted />
          <ValueBox title="Nuevo" value={newVal} highlight />
        </div>
      </div>
    </div>
  )
}

function ValueBox({ title, value, muted, highlight }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: tw.inkFaint, marginBottom: 4 }}>{title}</div>
      <div style={{
        padding: 10, fontSize: 12, lineHeight: 1.5,
        background: highlight ? '#FAFFF8' : '#FAFAFA',
        border: `1px solid ${highlight ? tw.green + '55' : tw.rule}`,
        borderRadius: 2, minHeight: 36,
        color: muted ? tw.inkFaint : tw.ink,
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
      }}>
        {renderValue(value)}
      </div>
    </div>
  )
}

function renderValue(v) {
  if (v == null || v === '') return <span style={{ color: tw.inkFaint, fontStyle: 'italic' }}>(vacío)</span>
  if (Array.isArray(v)) {
    if (v.length === 0) return <span style={{ color: tw.inkFaint, fontStyle: 'italic' }}>(vacío)</span>
    return (
      <ul style={{ margin: 0, padding: '0 0 0 16px' }}>
        {v.map((r, i) => (
          <li key={i} style={{ marginBottom: 6 }}>
            <strong>{r.title || '(sin título)'}</strong> · qty {r.qty || 1}
            {r.focus && <div style={{ fontSize: 11, color: tw.inkSub, marginTop: 2 }}>{r.focus}</div>}
          </li>
        ))}
      </ul>
    )
  }
  return String(v)
}

function isEmpty(v) {
  if (v == null || v === '') return true
  if (Array.isArray(v) && v.length === 0) return true
  return false
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const inputStyle = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  fontFamily: mono, color: tw.ink,
  border: `1px solid ${tw.rule}`, background: tw.white,
  borderRadius: 2, outline: 'none',
}
