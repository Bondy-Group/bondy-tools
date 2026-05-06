'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'

const tw = {
  bg: '#FEFCF9',
  white: '#FFFFFF',
  ink: '#1A1A1A',
  inkMid: '#3A3530',
  inkSub: '#5A5550',
  inkFaint: '#7A7874',
  rule: '#E8E4DE',
  ruleSoft: '#F0EDE6',
  green: '#4A8C40',
  greenTint: 'rgba(74,140,64,0.08)',
  amber: '#A87A2A',
}
const serif = "'Special Elite', Georgia, serif"
const mono = "'Courier Prime', Courier, monospace"
const ui = "'Plus Jakarta Sans', system-ui, sans-serif"

const BondyLogo = () => (
  <svg width="22" height="22" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="4" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A" />
    <rect x="22" y="5" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".18" />
    <rect x="4" y="22" width="14" height="12" rx="2.5" fill="#1A1A1A" opacity=".42" />
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill="#4A8C40" />
  </svg>
)

const FILTER_OPS = [
  { val: 'eq', label: '=' },
  { val: 'neq', label: '≠' },
  { val: 'ilike', label: 'contiene' },
  { val: 'gt', label: '>' },
  { val: 'gte', label: '≥' },
  { val: 'lt', label: '<' },
  { val: 'lte', label: '≤' },
  { val: 'is', label: 'es (null/true/false)' },
]

function formatCell(v, col) {
  if (v === null || v === undefined) return null
  if (typeof v === 'boolean') return v ? '✓' : '✗'
  if (Array.isArray(v)) return v.length === 0 ? '[]' : `[${v.length}] ${v.slice(0, 3).map(String).join(', ')}${v.length > 3 ? '…' : ''}`
  if (typeof v === 'object') {
    try {
      const s = JSON.stringify(v)
      return s.length > 60 ? s.slice(0, 60) + '…' : s
    } catch {
      return String(v)
    }
  }
  const s = String(v)
  if (col?.type?.includes('timestamp') || col?.name?.endsWith('_at') || col?.name === 'created_at' || col?.name === 'updated_at') {
    try {
      const d = new Date(s)
      if (!isNaN(d)) return d.toISOString().slice(0, 16).replace('T', ' ')
    } catch {}
  }
  return s.length > 80 ? s.slice(0, 80) + '…' : s
}

function detectPK(columns) {
  const pk = columns.find((c) => c.isPrimaryKey)
  if (pk) return pk.name
  const id = columns.find((c) => c.name === 'id')
  if (id) return id.name
  return columns[0]?.name
}

export default function DataExplorerPage() {
  const [project, setProject] = useState('crm')
  const [tables, setTables] = useState([])
  const [tablesLoading, setTablesLoading] = useState(true)
  const [tablesError, setTablesError] = useState(null)
  const [selectedTable, setSelectedTable] = useState(null)
  const [search, setSearch] = useState('')

  const [rows, setRows] = useState([])
  const [totalCount, setTotalCount] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sort, setSort] = useState({ col: null, dir: 'desc' })
  const [filters, setFilters] = useState([])
  const [draftFilter, setDraftFilter] = useState({ col: '', op: 'ilike', val: '' })
  const [rowsLoading, setRowsLoading] = useState(false)
  const [rowsError, setRowsError] = useState(null)

  const [drawerRow, setDrawerRow] = useState(null)
  const [introWarning, setIntroWarning] = useState(null)
  const [schemaLoading, setSchemaLoading] = useState(false)

  // Fetch tables when project changes
  useEffect(() => {
    let cancel = false
    setTablesLoading(true)
    setTablesError(null)
    setIntroWarning(null)
    fetch(`/api/data-explorer/tables?project=${project}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancel) return
        if (j.error) {
          setTablesError(j.error + (j.detail ? ` — ${j.detail}` : ''))
          setTables([])
        } else {
          setTables(j.tables || [])
          if (j.introspectionWarning) setIntroWarning(j.introspectionWarning)
        }
      })
      .catch((e) => !cancel && setTablesError(String(e)))
      .finally(() => !cancel && setTablesLoading(false))
    return () => {
      cancel = true
    }
  }, [project])

  // Reset state when table changes + hydrate schema if missing
  useEffect(() => {
    setPage(1)
    setSort({ col: null, dir: 'desc' })
    setFilters([])
    setDraftFilter({ col: '', op: 'ilike', val: '' })
    setRows([])
    setTotalCount(null)

    if (selectedTable && (!selectedTable.columns || selectedTable.columns.length === 0)) {
      let cancel = false
      setSchemaLoading(true)
      fetch(`/api/data-explorer/schema?project=${project}&table=${encodeURIComponent(selectedTable.name)}`)
        .then((r) => r.json())
        .then((j) => {
          if (cancel) return
          if (j.columns && j.columns.length > 0) {
            const updated = { ...selectedTable, columns: j.columns }
            setSelectedTable(updated)
            // also update the cached table list so we don't refetch
            setTables((prev) => prev.map((t) => (t.name === updated.name ? updated : t)))
          }
        })
        .catch(() => {})
        .finally(() => !cancel && setSchemaLoading(false))
      return () => {
        cancel = true
      }
    }
  }, [selectedTable, project])

  // Fetch rows
  useEffect(() => {
    if (!selectedTable) return
    let cancel = false
    setRowsLoading(true)
    setRowsError(null)
    const params = new URLSearchParams({
      project,
      table: selectedTable.name,
      page: String(page),
      pageSize: String(pageSize),
    })
    if (sort.col) {
      params.set('sort', sort.col)
      params.set('dir', sort.dir)
    }
    if (filters.length > 0) params.set('filters', JSON.stringify(filters))

    fetch(`/api/data-explorer/query?${params.toString()}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancel) return
        if (j.error) {
          setRowsError(j.error + (j.detail ? ` — ${j.detail}` : ''))
          setRows([])
        } else {
          setRows(j.data || [])
          setTotalCount(j.totalCount)
        }
      })
      .catch((e) => !cancel && setRowsError(String(e)))
      .finally(() => !cancel && setRowsLoading(false))
    return () => {
      cancel = true
    }
  }, [project, selectedTable, page, pageSize, sort, filters])

  // Group tables by category
  const groupedTables = useMemo(() => {
    const filtered = tables.filter(
      (t) => !search || t.name.toLowerCase().includes(search.toLowerCase())
    )
    const out = {}
    for (const t of filtered) {
      const g = t.group || 'Otros'
      if (!out[g]) out[g] = []
      out[g].push(t)
    }
    // Sorted by group order
    const groupOrder = [
      'Bondy Master DB',
      'Airtable mirror',
      'Operacional',
      'Outreach & Leads',
      'Jobs & Market',
      'ATS',
      'Sistema',
      'Tools',
      'Otros',
    ]
    return groupOrder
      .filter((g) => out[g])
      .map((g) => ({ name: g, tables: out[g].sort((a, b) => (b.rowCount || 0) - (a.rowCount || 0)) }))
  }, [tables, search])

  const totalPages = totalCount != null ? Math.ceil(totalCount / pageSize) : null
  const pk = selectedTable ? detectPK(selectedTable.columns) : null

  const toggleSort = (colName) => {
    setSort((prev) => {
      if (prev.col === colName) return { col: colName, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      return { col: colName, dir: 'asc' }
    })
    setPage(1)
  }

  const addFilter = () => {
    if (!draftFilter.col || !draftFilter.op) return
    setFilters((prev) => [...prev, draftFilter])
    setDraftFilter({ col: '', op: 'ilike', val: '' })
    setPage(1)
  }

  const removeFilter = (idx) => {
    setFilters((prev) => prev.filter((_, i) => i !== idx))
    setPage(1)
  }

  const navigateToFK = (col, val) => {
    if (val == null) return
    const target = tables.find((t) => t.name === col.fk.table)
    if (!target) return
    setSelectedTable(target)
    setFilters([{ col: col.fk.column, op: 'eq', val: String(val) }])
    setDrawerRow(null)
  }

  return (
    <div style={{ minHeight: '100vh', background: tw.bg, fontFamily: ui, color: tw.ink }}>
      {/* Header */}
      <header
        style={{
          borderBottom: `1px solid ${tw.rule}`,
          background: tw.white,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <Link href="/internal" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: tw.ink }}>
          <BondyLogo />
          <span style={{ fontFamily: serif, fontSize: 18, letterSpacing: 1 }}>BONDY</span>
        </Link>
        <span style={{ color: tw.inkFaint, fontFamily: mono, fontSize: 12 }}>/ data explorer</span>

        <div style={{ flex: 1 }} />

        <span style={{ fontFamily: mono, fontSize: 11, color: tw.inkSub }}>Proyecto:</span>
        <select
          value={project}
          onChange={(e) => {
            setProject(e.target.value)
            setSelectedTable(null)
          }}
          style={{
            fontFamily: mono,
            fontSize: 12,
            padding: '6px 10px',
            border: `1px solid ${tw.rule}`,
            borderRadius: 4,
            background: tw.white,
            color: tw.ink,
            cursor: 'pointer',
          }}
        >
          <option value="crm">CRM (datos de negocio)</option>
          <option value="tools">Bondy Tools (app)</option>
        </select>
      </header>

      <div style={{ display: 'flex', height: 'calc(100vh - 53px)' }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 280,
            borderRight: `1px solid ${tw.rule}`,
            background: tw.white,
            overflowY: 'auto',
            padding: '14px 0',
            flexShrink: 0,
          }}
        >
          <div style={{ padding: '0 16px 12px' }}>
            <input
              type="text"
              placeholder="Buscar tabla…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                fontFamily: mono,
                fontSize: 12,
                padding: '6px 10px',
                border: `1px solid ${tw.rule}`,
                borderRadius: 4,
                background: tw.bg,
              }}
            />
          </div>

          {tablesLoading && (
            <div style={{ padding: '12px 16px', fontFamily: mono, fontSize: 11, color: tw.inkFaint }}>
              cargando tablas…
            </div>
          )}
          {tablesError && (
            <div style={{ padding: '12px 16px', fontFamily: mono, fontSize: 11, color: '#B14A3C' }}>
              {tablesError}
            </div>
          )}
          {introWarning && (
            <div
              style={{
                margin: '0 12px 12px',
                padding: '8px 10px',
                fontFamily: mono,
                fontSize: 10,
                color: tw.amber,
                background: 'rgba(168,122,42,0.08)',
                border: `1px dashed ${tw.amber}`,
                borderRadius: 3,
                lineHeight: 1.4,
              }}
              title={introWarning}
            >
              modo fallback · sin <code>service_role</code> · schema on-demand
            </div>
          )}

          {groupedTables.map((group) => (
            <div key={group.name} style={{ marginBottom: 12 }}>
              <div
                style={{
                  fontFamily: serif,
                  fontSize: 11,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: tw.inkFaint,
                  padding: '6px 16px',
                  borderBottom: `1px dashed ${tw.ruleSoft}`,
                }}
              >
                {group.name}
              </div>
              {group.tables.map((t) => {
                const active = selectedTable?.name === t.name
                return (
                  <button
                    key={t.name}
                    onClick={() => setSelectedTable(t)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '6px 16px',
                      border: 'none',
                      background: active ? tw.greenTint : 'transparent',
                      color: tw.ink,
                      fontFamily: mono,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderLeft: active ? `2px solid ${tw.green}` : '2px solid transparent',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </span>
                    <span style={{ color: tw.inkFaint, fontSize: 10, marginLeft: 6 }}>
                      {t.rowCount != null ? t.rowCount.toLocaleString('es-AR') : '?'}
                    </span>
                  </button>
                )
              })}
            </div>
          ))}
        </aside>

        {/* Main */}
        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!selectedTable ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 8,
                color: tw.inkFaint,
              }}
            >
              <div style={{ fontFamily: serif, fontSize: 16 }}>Elegí una tabla</div>
              <div style={{ fontFamily: mono, fontSize: 11 }}>
                {tables.length} tablas disponibles · {tables.reduce((a, b) => a + (b.rowCount || 0), 0).toLocaleString('es-AR')} filas totales
              </div>
            </div>
          ) : selectedTable.columns.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: 8,
                color: tw.inkFaint,
                fontFamily: mono,
                fontSize: 12,
              }}
            >
              {schemaLoading ? (
                <span>descubriendo schema de <b style={{ color: tw.ink }}>{selectedTable.name}</b>…</span>
              ) : (
                <>
                  <span>tabla vacía o sin acceso de lectura</span>
                  <span style={{ fontSize: 10 }}>
                    no se puede inferir schema sin <code>service_role</code> ni datos
                  </span>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Table header */}
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: `1px solid ${tw.rule}`,
                  background: tw.white,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                  <h2 style={{ margin: 0, fontFamily: serif, fontSize: 18 }}>{selectedTable.name}</h2>
                  <span style={{ fontFamily: mono, fontSize: 11, color: tw.inkFaint }}>
                    {selectedTable.columns.length} columnas
                    {totalCount != null && ` · ${totalCount.toLocaleString('es-AR')} filas`}
                  </span>
                  <div style={{ flex: 1 }} />
                  <span
                    title="La edición se habilita en una próxima versión"
                    style={{
                      fontFamily: mono,
                      fontSize: 10,
                      color: tw.amber,
                      border: `1px solid ${tw.amber}`,
                      padding: '2px 6px',
                      borderRadius: 3,
                      opacity: 0.7,
                    }}
                  >
                    read-only · v1
                  </span>
                </div>

                {/* Filters bar */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                  {filters.map((f, i) => (
                    <span
                      key={i}
                      style={{
                        fontFamily: mono,
                        fontSize: 11,
                        background: tw.greenTint,
                        border: `1px solid ${tw.green}`,
                        color: tw.ink,
                        padding: '3px 8px',
                        borderRadius: 3,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <span>
                        <b>{f.col}</b> {FILTER_OPS.find((o) => o.val === f.op)?.label || f.op}{' '}
                        <code style={{ background: tw.white, padding: '0 4px' }}>{f.val}</code>
                      </span>
                      <button
                        onClick={() => removeFilter(i)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: tw.inkSub, padding: 0, fontSize: 14 }}
                      >
                        ×
                      </button>
                    </span>
                  ))}

                  <select
                    value={draftFilter.col}
                    onChange={(e) => setDraftFilter({ ...draftFilter, col: e.target.value })}
                    style={{ fontFamily: mono, fontSize: 11, padding: '3px 6px', border: `1px solid ${tw.rule}`, borderRadius: 3 }}
                  >
                    <option value="">+ filtro · columna</option>
                    {selectedTable.columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={draftFilter.op}
                    onChange={(e) => setDraftFilter({ ...draftFilter, op: e.target.value })}
                    style={{ fontFamily: mono, fontSize: 11, padding: '3px 6px', border: `1px solid ${tw.rule}`, borderRadius: 3 }}
                  >
                    {FILTER_OPS.map((o) => (
                      <option key={o.val} value={o.val}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="valor"
                    value={draftFilter.val}
                    onChange={(e) => setDraftFilter({ ...draftFilter, val: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && addFilter()}
                    style={{ fontFamily: mono, fontSize: 11, padding: '3px 6px', border: `1px solid ${tw.rule}`, borderRadius: 3, width: 140 }}
                  />
                  <button
                    onClick={addFilter}
                    disabled={!draftFilter.col}
                    style={{
                      fontFamily: mono,
                      fontSize: 11,
                      padding: '3px 10px',
                      border: `1px solid ${tw.green}`,
                      background: tw.green,
                      color: tw.white,
                      borderRadius: 3,
                      cursor: draftFilter.col ? 'pointer' : 'not-allowed',
                      opacity: draftFilter.col ? 1 : 0.4,
                    }}
                  >
                    add
                  </button>

                  <div style={{ flex: 1 }} />

                  <span style={{ fontFamily: mono, fontSize: 11, color: tw.inkFaint }}>
                    {pageSize} / pág
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(parseInt(e.target.value))
                      setPage(1)
                    }}
                    style={{ fontFamily: mono, fontSize: 11, padding: '3px 6px', border: `1px solid ${tw.rule}`, borderRadius: 3 }}
                  >
                    {[25, 50, 100, 200].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data grid */}
              <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
                {rowsLoading && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 16,
                      fontFamily: mono,
                      fontSize: 11,
                      color: tw.inkFaint,
                      background: tw.white,
                      padding: '4px 10px',
                      borderRadius: 3,
                      border: `1px solid ${tw.rule}`,
                      zIndex: 5,
                    }}
                  >
                    cargando…
                  </div>
                )}
                {rowsError && (
                  <div style={{ padding: 20, fontFamily: mono, fontSize: 12, color: '#B14A3C' }}>
                    Error: {rowsError}
                  </div>
                )}

                <table
                  style={{
                    borderCollapse: 'collapse',
                    fontFamily: mono,
                    fontSize: 11,
                    minWidth: '100%',
                  }}
                >
                  <thead>
                    <tr style={{ background: tw.white, position: 'sticky', top: 0, zIndex: 2 }}>
                      {selectedTable.columns.map((c) => (
                        <th
                          key={c.name}
                          onClick={() => toggleSort(c.name)}
                          style={{
                            padding: '8px 12px',
                            borderBottom: `1px solid ${tw.rule}`,
                            borderRight: `1px solid ${tw.ruleSoft}`,
                            textAlign: 'left',
                            color: tw.inkSub,
                            fontWeight: 'normal',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            userSelect: 'none',
                            background: tw.white,
                          }}
                          title={`${c.type}${c.fk ? ` → ${c.fk.table}.${c.fk.column}` : ''}`}
                        >
                          <span style={{ color: c.isPrimaryKey ? tw.green : tw.inkSub }}>
                            {c.name}
                          </span>
                          <span style={{ color: tw.inkFaint, marginLeft: 4 }}>
                            {sort.col === c.name ? (sort.dir === 'asc' ? '↑' : '↓') : ''}
                          </span>
                          {c.fk && <span style={{ color: tw.green, marginLeft: 4 }}>↗</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={pk ? row[pk] : i}
                        onClick={() => setDrawerRow(row)}
                        style={{
                          cursor: 'pointer',
                          background: i % 2 === 0 ? tw.bg : tw.white,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = tw.greenTint)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = i % 2 === 0 ? tw.bg : tw.white)}
                      >
                        {selectedTable.columns.map((c) => {
                          const v = row[c.name]
                          return (
                            <td
                              key={c.name}
                              style={{
                                padding: '6px 12px',
                                borderBottom: `1px solid ${tw.ruleSoft}`,
                                borderRight: `1px solid ${tw.ruleSoft}`,
                                whiteSpace: 'nowrap',
                                color: v == null ? tw.inkFaint : tw.ink,
                                maxWidth: 320,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {v == null ? <em style={{ fontSize: 10 }}>null</em> : formatCell(v, c)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                    {rows.length === 0 && !rowsLoading && (
                      <tr>
                        <td
                          colSpan={selectedTable.columns.length}
                          style={{ padding: 30, textAlign: 'center', color: tw.inkFaint, fontFamily: mono, fontSize: 11 }}
                        >
                          sin resultados
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div
                style={{
                  padding: '10px 20px',
                  borderTop: `1px solid ${tw.rule}`,
                  background: tw.white,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontFamily: mono,
                  fontSize: 11,
                  color: tw.inkSub,
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || rowsLoading}
                  style={{ fontFamily: mono, fontSize: 11, padding: '4px 10px', border: `1px solid ${tw.rule}`, background: tw.white, borderRadius: 3, cursor: 'pointer', opacity: page <= 1 ? 0.4 : 1 }}
                >
                  ← anterior
                </button>
                <span>
                  página {page}{totalPages != null ? ` de ${totalPages}` : ''}
                </span>
                <button
                  onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1))}
                  disabled={(totalPages != null && page >= totalPages) || rowsLoading}
                  style={{ fontFamily: mono, fontSize: 11, padding: '4px 10px', border: `1px solid ${tw.rule}`, background: tw.white, borderRadius: 3, cursor: 'pointer', opacity: totalPages != null && page >= totalPages ? 0.4 : 1 }}
                >
                  siguiente →
                </button>
                <div style={{ flex: 1 }} />
                {totalCount != null && (
                  <span style={{ color: tw.inkFaint }}>
                    {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} de {totalCount.toLocaleString('es-AR')}
                  </span>
                )}
              </div>
            </>
          )}
        </main>

        {/* Drawer */}
        {drawerRow && selectedTable && (
          <aside
            style={{
              width: 420,
              borderLeft: `1px solid ${tw.rule}`,
              background: tw.white,
              overflowY: 'auto',
              padding: '16px 20px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontFamily: serif, fontSize: 14 }}>
                {selectedTable.name}
                {pk && (
                  <span style={{ color: tw.inkFaint, fontFamily: mono, fontSize: 11, marginLeft: 8 }}>
                    {pk}: {String(drawerRow[pk])}
                  </span>
                )}
              </h3>
              <button
                onClick={() => setDrawerRow(null)}
                style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: tw.inkSub }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedTable.columns.map((c) => {
                const v = drawerRow[c.name]
                const isComplex = v && (typeof v === 'object' || (typeof v === 'string' && v.length > 80))
                return (
                  <div key={c.name} style={{ borderBottom: `1px solid ${tw.ruleSoft}`, paddingBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontFamily: mono, fontSize: 10, color: c.isPrimaryKey ? tw.green : tw.inkFaint, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {c.name}
                      </span>
                      <span style={{ fontFamily: mono, fontSize: 9, color: tw.inkFaint }}>{c.type}</span>
                    </div>
                    <div style={{ fontFamily: mono, fontSize: 12, color: v == null ? tw.inkFaint : tw.ink, marginTop: 3, wordBreak: 'break-word', whiteSpace: isComplex ? 'pre-wrap' : 'normal' }}>
                      {v == null ? (
                        <em style={{ fontSize: 11 }}>null</em>
                      ) : typeof v === 'object' ? (
                        <pre style={{ margin: 0, fontFamily: mono, fontSize: 11, background: tw.bg, padding: 8, borderRadius: 3, overflow: 'auto', maxHeight: 200 }}>
                          {JSON.stringify(v, null, 2)}
                        </pre>
                      ) : (
                        String(v)
                      )}
                    </div>
                    {c.fk && v != null && (
                      <button
                        onClick={() => navigateToFK(c, v)}
                        style={{
                          marginTop: 4,
                          fontFamily: mono,
                          fontSize: 10,
                          padding: '2px 8px',
                          border: `1px solid ${tw.green}`,
                          background: 'transparent',
                          color: tw.green,
                          borderRadius: 3,
                          cursor: 'pointer',
                        }}
                      >
                        ver en {c.fk.table}.{c.fk.column} →
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
