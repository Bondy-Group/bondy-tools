'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const BondyLogo = () => (
  <svg width="28" height="28" viewBox="0 0 80 80" fill="none">
    <path d="M40 6 A34 34 0 0 1 69.4 23" stroke="#1A1A1A" strokeWidth="9" strokeLinecap="round" fill="none"/>
    <path d="M69.4 57 A34 34 0 0 1 10.6 57" stroke="#1A1A1A" strokeWidth="5.5" strokeLinecap="round" fill="none"/>
    <path d="M10.6 23 A34 34 0 0 1 40 6" stroke="#C06A2D" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    <circle cx="40" cy="40" r="6" fill="#C06A2D"/>
  </svg>
)

const CATEGORY_LABELS = {
  'engineering': 'Engineering',
  'technology': 'Technology',
  'cybersecurity': 'Cybersecurity',
  'mobile-developer': 'Mobile',
  'data-science-analytics': 'Data & Analytics',
  'machine-learning-ai': 'ML / AI',
  'sysadmin-devops-qa': 'DevOps & QA',
  'programming': 'Programming',
}

const SENIORITIES = ['Junior', 'Mid', 'Senior', 'Lead / Staff', 'Manager']
const MODALITIES = ['remote', 'hybrid', 'on-site']
const CATEGORIES = Object.keys(CATEGORY_LABELS)
const COLUMNS = ['company', 'category', 'seniority', 'modality', 'location', 'tech_stack', 'source', 'date']

const EMPTY_ROW = {
  company: '', category: 'engineering', seniority: 'Senior',
  modality: 'remote', location: '', tech_stack: [], source: 'manual', date: new Date().toISOString().split('T')[0]
}

export default function MarketSignalsPage() {
  const [rows, setRows] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({ category: '', seniority: '', modality: '', tech: '' })
  const [editingCell, setEditingCell] = useState(null) // { id, col }
  const [editValue, setEditValue] = useState('')
  const [addingRow, setAddingRow] = useState(false)
  const [newRow, setNewRow] = useState(EMPTY_ROW)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = new URLSearchParams({ page })
    if (filters.category) params.set('category', filters.category)
    if (filters.seniority) params.set('seniority', filters.seniority)
    if (filters.modality) params.set('modality', filters.modality)
    if (filters.tech) params.set('tech', filters.tech)
    try {
      const res = await fetch('/api/market-signals?' + params)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setRows(json.data || [])
      setTotal(json.count || 0)
      setTotalPages(json.totalPages || 1)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [page, filters])

  useEffect(() => { fetchData() }, [fetchData])

  const handleFilterChange = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }))
    setPage(1)
  }

  const startEdit = (id, col, val) => {
    setEditingCell({ id, col })
    setEditValue(Array.isArray(val) ? val.join(', ') : (val || ''))
  }

  const cancelEdit = () => setEditingCell(null)

  const saveEdit = async (id, col) => {
    setSaving(id + col)
    const parsed = col === 'tech_stack'
      ? editValue.split(',').map(s => s.trim()).filter(Boolean)
      : editValue
    try {
      const res = await fetch('/api/market-signals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [col]: parsed })
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setRows(rows => rows.map(r => r.id === id ? { ...r, [col]: parsed } : r))
      showToast('Guardado')
    } catch (e) {
      showToast(e.message, 'err')
    } finally {
      setSaving(null)
      setEditingCell(null)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta fila?')) return
    setDeleting(id)
    try {
      const res = await fetch('/api/market-signals?id=' + id, { method: 'DELETE' })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setRows(rows => rows.filter(r => r.id !== id))
      setTotal(t => t - 1)
      showToast('Eliminado')
    } catch (e) {
      showToast(e.message, 'err')
    } finally {
      setDeleting(null)
    }
  }

  const handleAddRow = async () => {
    setSaving('new')
    try {
      const res = await fetch('/api/market-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRow)
      })
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setAddingRow(false)
      setNewRow(EMPTY_ROW)
      showToast('Fila agregada')
      fetchData()
    } catch (e) {
      showToast(e.message, 'err')
    } finally {
      setSaving(null)
    }
  }

  const renderCell = (row, col) => {
    const val = row[col]
    const isEditing = editingCell?.id === row.id && editingCell?.col === col
    const isSavingThis = saving === row.id + col

    const cellStyle = {
      padding: '10px 12px',
      borderRight: '1px solid #EBEBEB',
      fontSize: '12px',
      color: '#333',
      minWidth: col === 'tech_stack' ? 180 : col === 'company' ? 160 : col === 'location' ? 100 : 80,
      maxWidth: col === 'tech_stack' ? 220 : 200,
      position: 'relative',
      background: isEditing ? '#FFF9F5' : 'transparent',
      cursor: 'pointer',
      whiteSpace: col === 'tech_stack' ? 'normal' : 'nowrap',
      overflow: 'hidden',
      textOverflow: col === 'tech_stack' ? undefined : 'ellipsis',
    }

    if (isEditing) {
      if (col === 'category') {
        return (
          <td key={col} style={cellStyle}>
            <select value={editValue} onChange={e => setEditValue(e.target.value)}
              onBlur={() => saveEdit(row.id, col)}
              autoFocus
              style={{ fontSize: '12px', border: 'none', background: 'transparent', width: '100%', outline: 'none', color: '#C06A2D', fontFamily: 'inherit' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </td>
        )
      }
      if (col === 'seniority') {
        return (
          <td key={col} style={cellStyle}>
            <select value={editValue} onChange={e => setEditValue(e.target.value)}
              onBlur={() => saveEdit(row.id, col)}
              autoFocus
              style={{ fontSize: '12px', border: 'none', background: 'transparent', width: '100%', outline: 'none', fontFamily: 'inherit' }}>
              {SENIORITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </td>
        )
      }
      if (col === 'modality') {
        return (
          <td key={col} style={cellStyle}>
            <select value={editValue} onChange={e => setEditValue(e.target.value)}
              onBlur={() => saveEdit(row.id, col)}
              autoFocus
              style={{ fontSize: '12px', border: 'none', background: 'transparent', width: '100%', outline: 'none', fontFamily: 'inherit' }}>
              {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </td>
        )
      }
      return (
        <td key={col} style={cellStyle}>
          <input
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={() => saveEdit(row.id, col)}
            onKeyDown={e => {
              if (e.key === 'Enter') saveEdit(row.id, col)
              if (e.key === 'Escape') cancelEdit()
            }}
            autoFocus
            style={{ fontSize: '12px', border: 'none', background: 'transparent', width: '100%', outline: 'none', fontFamily: 'inherit' }}
          />
          {isSavingThis && <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: '#C06A2D' }}>...</span>}
        </td>
      )
    }

    let display = val
    if (col === 'tech_stack' && Array.isArray(val)) {
      display = (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {val.map(t => (
            <span key={t} style={{ background: '#F4EDE6', color: '#C06A2D', fontSize: 10, padding: '1px 6px', borderRadius: 3, fontFamily: 'DM Mono, monospace' }}>{t}</span>
          ))}
        </div>
      )
    } else if (col === 'category') {
      display = CATEGORY_LABELS[val] || val
    } else if (col === 'date') {
      display = val ? val.slice(0, 10) : ''
    }

    return (
      <td key={col} style={cellStyle}
        onClick={() => startEdit(row.id, col, val)}
        title="Click para editar">
        {display}
      </td>
    )
  }

  const thStyle = {
    padding: '10px 12px',
    textAlign: 'left',
    fontSize: '9px',
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: '#888885',
    fontFamily: 'DM Mono, monospace',
    fontWeight: 400,
    borderRight: '1px solid #EBEBEB',
    borderBottom: '2px solid #EBEBEB',
    background: '#F9F8F6',
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  }

  const selStyle = {
    fontSize: '11px', padding: '6px 10px',
    border: '1px solid #EBEBEB', background: '#fff',
    color: '#333', fontFamily: 'DM Mono, monospace',
    cursor: 'pointer', outline: 'none', borderRadius: 4,
  }

  return (
    <main style={{ background: '#F9F8F6', minHeight: '100vh' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 999,
          background: toast.type === 'err' ? '#fee2e2' : '#F4EDE6',
          border: `1px solid ${toast.type === 'err' ? '#fca5a5' : '#C06A2D'}`,
          color: toast.type === 'err' ? '#b91c1c' : '#C06A2D',
          padding: '10px 18px', fontSize: 12, fontFamily: 'DM Mono, monospace',
          letterSpacing: '0.08em', borderRadius: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Nav */}
      <nav style={{
        borderBottom: '1px solid #EBEBEB', padding: '16px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(249,248,246,0.97)', position: 'sticky', top: 0, zIndex: 50,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BondyLogo />
          <span className="font-display" style={{ fontSize: 18, fontWeight: 900, color: '#111', letterSpacing: '-0.02em' }}>
            Bond<em style={{ color: '#C06A2D', fontStyle: 'italic' }}>y</em>.
          </span>
          <span className="font-mono-bondy" style={{
            fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase',
            color: '#C06A2D', background: 'rgba(192,106,45,0.08)',
            padding: '3px 8px', border: '1px solid rgba(192,106,45,0.2)'
          }}>
            Market Signals
          </span>
        </div>
        <Link href="/internal" className="font-mono-bondy" style={{
          fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
          color: '#888885', textDecoration: 'none'
        }}>
          ← Equipo Bondy
        </Link>
      </nav>

      {/* Header */}
      <div style={{ padding: '36px 40px 24px', borderBottom: '1px solid #EBEBEB' }}>
        <div className="font-mono-bondy" style={{
          fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase',
          color: '#C06A2D', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10
        }}>
          <span style={{ display: 'block', width: 20, height: 1, background: '#C06A2D' }} />
          Inteligencia de mercado
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <h1 className="font-display" style={{ fontSize: 36, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em', color: '#111', marginBottom: 8 }}>
              Market <em style={{ color: '#C06A2D', fontStyle: 'italic' }}>Signals</em>
            </h1>
            <p style={{ fontSize: 13, color: '#888885', fontWeight: 300 }}>
              {total.toLocaleString()} señales — hacé click en cualquier celda para editar
            </p>
          </div>
          <button onClick={() => setAddingRow(true)}
            className="font-mono-bondy"
            style={{
              fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              background: '#C06A2D', color: '#fff', border: 'none',
              padding: '10px 20px', cursor: 'pointer',
            }}>
            + Nueva señal
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        padding: '14px 40px', borderBottom: '1px solid #EBEBEB',
        display: 'flex', gap: 10, alignItems: 'center', background: '#fff', flexWrap: 'wrap'
      }}>
        <span className="font-mono-bondy" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#D8D6D2', marginRight: 4 }}>Filtrar:</span>
        <select value={filters.category} onChange={e => handleFilterChange('category', e.target.value)} style={selStyle}>
          <option value="">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <select value={filters.seniority} onChange={e => handleFilterChange('seniority', e.target.value)} style={selStyle}>
          <option value="">Todo seniority</option>
          {SENIORITIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.modality} onChange={e => handleFilterChange('modality', e.target.value)} style={selStyle}>
          <option value="">Toda modalidad</option>
          {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input
          value={filters.tech}
          onChange={e => handleFilterChange('tech', e.target.value)}
          placeholder="Tecnología exacta..."
          style={{ ...selStyle, minWidth: 160 }}
        />
        {(filters.category || filters.seniority || filters.modality || filters.tech) && (
          <button onClick={() => { setFilters({ category: '', seniority: '', modality: '', tech: '' }); setPage(1) }}
            style={{ ...selStyle, color: '#C06A2D', border: '1px solid rgba(192,106,45,0.3)' }}>
            Limpiar ×
          </button>
        )}
      </div>

      {/* Add row form */}
      {addingRow && (
        <div style={{ padding: '16px 40px', borderBottom: '1px solid #EBEBEB', background: '#FFF9F5' }}>
          <p className="font-mono-bondy" style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#C06A2D', marginBottom: 12 }}>Nueva señal</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {[
              { key: 'company', label: 'Empresa', type: 'text', w: 160 },
              { key: 'location', label: 'Ubicación', type: 'text', w: 120 },
              { key: 'date', label: 'Fecha', type: 'date', w: 130 },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 9, color: '#bbb', fontFamily: 'DM Mono,monospace', letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>{f.label}</div>
                <input type={f.type} value={newRow[f.key]}
                  onChange={e => setNewRow(r => ({ ...r, [f.key]: e.target.value }))}
                  style={{ ...selStyle, width: f.w }} />
              </div>
            ))}
            {[
              { key: 'category', label: 'Categoría', opts: CATEGORIES.map(c => ({ val: c, label: CATEGORY_LABELS[c] })) },
              { key: 'seniority', label: 'Seniority', opts: SENIORITIES.map(s => ({ val: s, label: s })) },
              { key: 'modality', label: 'Modalidad', opts: MODALITIES.map(m => ({ val: m, label: m })) },
            ].map(f => (
              <div key={f.key}>
                <div style={{ fontSize: 9, color: '#bbb', fontFamily: 'DM Mono,monospace', letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>{f.label}</div>
                <select value={newRow[f.key]}
                  onChange={e => setNewRow(r => ({ ...r, [f.key]: e.target.value }))}
                  style={selStyle}>
                  {f.opts.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
                </select>
              </div>
            ))}
            <div>
              <div style={{ fontSize: 9, color: '#bbb', fontFamily: 'DM Mono,monospace', letterSpacing: '0.1em', marginBottom: 4, textTransform: 'uppercase' }}>Tech Stack (separado por comas)</div>
              <input
                value={newRow.tech_stack.join(', ')}
                onChange={e => setNewRow(r => ({ ...r, tech_stack: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                style={{ ...selStyle, width: 220 }}
                placeholder="Python, AWS, Docker..."
              />
            </div>
            <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-end' }}>
              <button onClick={handleAddRow} disabled={saving === 'new'}
                style={{ ...selStyle, background: '#C06A2D', color: '#fff', border: 'none', cursor: 'pointer' }}>
                {saving === 'new' ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={() => { setAddingRow(false); setNewRow(EMPTY_ROW) }}
                style={{ ...selStyle, cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: '60px 40px', textAlign: 'center', color: '#bbb', fontFamily: 'DM Mono,monospace', fontSize: 12, letterSpacing: '0.1em' }}>
            Cargando...
          </div>
        ) : error ? (
          <div style={{ padding: '40px', color: '#b91c1c', fontFamily: 'DM Mono,monospace', fontSize: 12 }}>
            Error: {error}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {COLUMNS.map(col => <th key={col} style={thStyle}>{col.replace('_', ' ')}</th>)}
                <th style={{ ...thStyle, minWidth: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} style={{ borderBottom: '1px solid #EBEBEB', background: i % 2 === 0 ? '#fff' : '#FAFAF9' }}>
                  {COLUMNS.map(col => renderCell(row, col))}
                  <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <button onClick={() => handleDelete(row.id)} disabled={deleting === row.id}
                      title="Eliminar"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D8D6D2', fontSize: 14, lineHeight: 1 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#D8D6D2'}>
                      {deleting === row.id ? '...' : '×'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div style={{ padding: '20px 40px', display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid #EBEBEB' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ ...selStyle, cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
            ← Anterior
          </button>
          <span className="font-mono-bondy" style={{ fontSize: 10, color: '#888885', letterSpacing: '0.1em' }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ ...selStyle, cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
            Siguiente →
          </button>
          <span className="font-mono-bondy" style={{ fontSize: 10, color: '#D8D6D2', letterSpacing: '0.08em', marginLeft: 8 }}>
            {total.toLocaleString()} señales totales
          </span>
        </div>
      )}

      {/* Footer */}
      <div style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="font-mono-bondy" style={{ fontSize: 10, letterSpacing: '0.1em', color: '#D8D6D2', textTransform: 'uppercase' }}>
          Uso exclusivo equipo Bondy
        </span>
      </div>
    </main>
  )
}
