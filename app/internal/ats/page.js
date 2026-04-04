
'use client'

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'

/* ─── Design tokens ─────────────────────────────────────────────── */
const C = {
  bg:       '#EDECE9',
  s0:       '#FFFFFF',
  s1:       '#F4F3F0',
  s2:       '#ECEAE6',
  border:   '#E0DDD7',
  border2:  '#C5C2BB',
  text:     '#17160E',
  text2:    '#555249',
  text3:    '#969390',
  green:    '#356830',
  greenBg:  'rgba(53,104,48,0.08)',
  greenBr:  'rgba(53,104,48,0.22)',
  red:      '#C43020',
  redBg:    '#FDF0EE',
  redBr:    '#EDCAC4',
}

/* ─── Logo SVG (canónico desde SKILL.md) ──────────────────────────── */
const Logo = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
    <rect x="4"  y="5"  width="14" height="12" rx="2.5" fill="#17160E"/>
    <rect x="22" y="5"  width="14" height="12" rx="2.5" fill="#17160E" opacity="0.18"/>
    <rect x="4"  y="22" width="14" height="12" rx="2.5" fill="#17160E" opacity="0.42"/>
    <rect x="22" y="22" width="14" height="12" rx="2.5" fill={C.green}/>
  </svg>
)

/* ─── Sidebar item ─────────────────────────────────────────────────── */
function SbItem({ icon, label, count, active, alertDot, warnDot, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '6px 13px', width: '100%', border: 'none', cursor: 'pointer',
      textAlign: 'left', background: active ? C.greenBg : 'transparent',
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.s1 }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
        <span style={{ color: active ? C.green : C.text3, flexShrink: 0 }}>{icon}</span>
        <span style={{
          fontFamily: 'Inter,system-ui,sans-serif', fontSize: 12,
          color: active ? C.green : C.text2, fontWeight: active ? 600 : 400,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{label}</span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {alertDot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.red }} />}
        {warnDot  && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D08000' }} />}
        {count != null && (
          <span style={{
            fontFamily: 'Inter,system-ui,sans-serif', fontSize: 10, fontWeight: 600,
            color: active ? C.green : C.text3,
            background: active ? C.greenBg : C.s2,
            border: `1px solid ${active ? C.greenBr : C.border}`,
            padding: '1px 5px', borderRadius: 10,
          }}>{count}</span>
        )}
      </span>
    </button>
  )
}

/* ─── Status pill ──────────────────────────────────────────────────── */
const STATUS_STYLES = {
  Sourced:     { bg: '#EEF3FC', br: '#C8D8F5', color: '#1750A0' },
  Contactado:  { bg: '#FFF6EC', br: '#F0D8B0', color: '#8A4F00' },
  Screening:   { bg: '#EDF7EC', br: '#BCD9BA', color: '#2A6028' },
  Presentado:  { bg: '#F3EFFE', br: '#D4BFF5', color: '#5228A8' },
  Entrevista:  { bg: '#FEF0F5', br: '#F0C0D8', color: '#A02060' },
  Oferta:      { bg: '#FFFFF0', br: '#D4D4A0', color: '#606000' },
}

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.Sourced
  return (
    <span style={{
      fontFamily: 'Inter,system-ui,sans-serif', fontSize: 9, fontWeight: 600,
      padding: '2px 7px', borderRadius: 10, whiteSpace: 'nowrap',
      background: s.bg, border: `1px solid ${s.br}`, color: s.color,
    }}>{status}</span>
  )
}

/* ─── Chip ─────────────────────────────────────────────────────────── */
function Chip({ label, variant = 'neu' }) {
  const variants = {
    green:  { bg: C.greenBg,  color: C.green,  border: C.greenBr },
    red:    { bg: C.redBg,    color: C.red,     border: C.redBr   },
    amber:  { bg: '#FEF6E4',  color: '#7A5800', border: '#E8D4A0' },
    neu:    { bg: C.s2,       color: C.text3,   border: C.border  },
  }
  const v = variants[variant]
  return (
    <span style={{
      fontFamily: 'Inter,system-ui,sans-serif', fontSize: 9, fontWeight: 600,
      padding: '2px 5px', borderRadius: 3,
      background: v.bg, color: v.color, border: `1px solid ${v.border}`,
    }}>{label}</span>
  )
}

/* ─── Kanban card ──────────────────────────────────────────────────── */
function KCard({ cand, selected, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const flagColor = cand.flag === 'red' ? C.red : cand.flag === 'green' ? C.green : 'transparent'

  return (
    <div
      onClick={() => onSelect(cand)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: C.s0, border: `1px solid ${selected ? C.green : hovered ? C.border2 : C.border}`,
        borderLeft: `2px solid ${flagColor}`,
        boxShadow: selected ? `0 0 0 1px ${C.green}` : 'none',
        borderRadius: 4, padding: '9px 10px', marginBottom: 6,
        cursor: 'pointer', position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <div style={{ fontFamily: 'Inter,system-ui,sans-serif', fontSize: 11, fontWeight: 600, color: C.text, lineHeight: 1.3, paddingRight: 4 }}>{cand.name}</div>
          <div style={{ fontFamily: 'Inter,system-ui,sans-serif', fontSize: 9, color: C.text3, marginTop: 1 }}>{cand.role}</div>
        </div>
        <span style={{
          width: 20, height: 20, borderRadius: '50%', background: C.s2, border: `1px solid ${C.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Inter,system-ui,sans-serif', fontSize: 7, fontWeight: 700, color: C.text2, flexShrink: 0,
        }}>{cand.initials}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
        {cand.salary && <span style={{ fontFamily: 'Inter,system-ui,sans-serif', fontSize: 10, color: C.text3 }}>{cand.salary}</span>}
        {cand.chip && <Chip label={cand.chip} variant={cand.chipVariant} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, paddingTop: 6, borderTop: `1px solid ${C.s2}` }}>
        <span style={{ fontFamily: 'Inter,system-ui,sans-serif', fontSize: 9, color: C.text3 }}>{cand.age}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          {cand.flag === 'red' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.red }} />}
          {cand.flag === 'green' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green }} />}
          <span style={{ fontFamily: 'Inter,system-ui,sans-serif', fontSize: 9, fontWeight: 600, color: cand.flag === 'green' ? C.green : C.text3 }}>{cand.sourcer}</span>
        </div>
      </div>
      {/* Quick action al hover */}
      {hovered && cand.qa && (
        <div style={{
          position: 'absolute', bottom: 7, right: 7, display: 'flex', gap: 3,
        }}>
          <button onClick={e => e.stopPropagation()} style={{
            fontFamily: 'Inter,system-ui,sans-serif', fontSize: 9, fontWeight: 600,
            padding: '2px 6px', borderRadius: 2, cursor: 'pointer',
            background: C.greenBg, color: C.green, border: `1px solid ${C.greenBr}`,
          }}>{cand.qa}</button>
        </div>
      )}
    </div>
  )
}

/* ─── List row ─────────────────────────────────────────────────────── */
function LRow({ cand, onSelect, alt }) {
  const [hovered, setHovered] = useState(false)
  const actColor = cand.actType === 'urgent' ? C.red : cand.actType === 'positive' ? C.green : C.text3

  return (
    <div
      onClick={() => onSelect(cand)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr 1fr 1.4fr 0.5fr',
        padding: '0 13px', borderBottom: `1px solid ${C.border}`, cursor: 'pointer',
        background: hovered ? '#F8FFF7' : alt ? C.s1 : C.s0,
        position: 'relative',
      }}
    >
      {[
        <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: C.s2, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 700, color: C.text2, flexShrink: 0 }}>{cand.initials}</span>
          <span style={{ fontWeight: 600 }}>{cand.name}</span>
        </span>,
        <span style={{ color: C.text3 }}>{cand.role}</span>,
        <StatusPill status={cand.stage} />,
        <span style={{ color: C.text3 }}>{cand.salary || '—'}</span>,
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: actColor, fontWeight: cand.actType !== 'neutral' ? 600 : 400 }}>
          {cand.actType !== 'neutral' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: actColor, flexShrink: 0 }} />}
          {cand.actLabel}
        </span>,
        <span style={{ color: C.text3 }}>{cand.sourcer}</span>,
      ].map((cell, i) => (
        <div key={i} style={{ fontFamily: 'Inter,system-ui,sans-serif', fontSize: 11, color: C.text, padding: '8px 5px', display: 'flex', alignItems: 'center' }}>{cell}</div>
      ))}
      {/* Quick actions */}
      {hovered && cand.qa && (
        <div style={{
          position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
          display: 'flex', gap: 4,
          background: alt ? C.s1 : C.s0, border: `1px solid ${C.border}`, borderRadius: 4, padding: '2px 4px',
        }}>
          {cand.qaActions.map((a, i) => (
            <button key={i} onClick={e => e.stopPropagation()} style={{
              fontFamily: 'Inter,system-ui,sans-serif', fontSize: 9, fontWeight: 600,
              padding: '3px 7px', borderRadius: 2, cursor: 'pointer', border: 'none', background: 'none',
              color: a.primary ? C.green : a.danger ? C.red : C.text2,
            }}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Detail panel ─────────────────────────────────────────────────── */
function DetailPanel({ cand, onClose }) {
  if (!cand) return null
  const scores = [
    { label: 'Comunicación', val: 4, max: 5 },
    { label: 'Motivación',   val: 5, max: 5 },
    { label: 'Técnico',      val: 3, max: 5, warn: true },
    { label: 'Autonomía',    val: 4, max: 5 },
  ]
  return (
    <div style={{ width: 232, background: C.s0, borderLeft: `1px solid ${C.border}`, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
      {/* nav bar */}
      <div style={{ height: 36, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {['←', '→'].map((a, i) => (
            <button key={i} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 3, width: 24, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: 11, color: i === 0 ? '#ccc' : C.text3 }}
              disabled={i === 0}>{a}</button>
          ))}
        </div>
        <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 10, color: C.text3 }}>1 de 5 en screening</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text3, fontSize: 17, lineHeight: 1, fontFamily: 'Inter,sans-serif' }}>×</button>
      </div>
      {/* scroll body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 13px' }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.greenBg, border: `1px solid ${C.greenBr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.green, marginBottom: 9, fontFamily: 'Inter,sans-serif' }}>{cand.initials}</div>
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 14, fontWeight: 700, color: C.text }}>{cand.name}</div>
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: C.text3, marginTop: 2 }}>{cand.role} · Buenos Aires, ARG</div>
        <div style={{ display: 'inline-block', fontFamily: 'Inter,sans-serif', fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 2, background: C.greenBg, border: `1px solid ${C.greenBr}`, color: C.green, marginTop: 7, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{cand.stage}</div>

        <div style={{ height: 1, background: C.border, margin: '10px 0' }} />
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.text3, marginBottom: 7 }}>Perfil</div>
        {[['Seniority','Semi-Senior'],['Salario actual','$3.8K'],['Expectativa',cand.salary || '$4.2K'],['Inglés','B2'],['Stack','Python, Django'],['Fuente','LinkedIn']].map(([k,v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '2px 0' }}>
            <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: C.text3 }}>{k}</span>
            <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, fontWeight: 600, color: C.text }}>{v}</span>
          </div>
        ))}

        <div style={{ height: 1, background: C.border, margin: '10px 0' }} />
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.text3, marginBottom: 7 }}>Scorecard</div>
        {scores.map(s => (
          <div key={s.label} style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'Inter,sans-serif', fontSize: 11, marginBottom: 3 }}>
              <span style={{ color: C.text, fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontWeight: 700, color: s.warn ? '#C08000' : C.green }}>{s.val}/{s.max}</span>
            </div>
            <div style={{ height: 4, background: C.s2, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${(s.val/s.max)*100}%`, background: s.warn ? '#C08000' : C.green, borderRadius: 2 }} />
            </div>
          </div>
        ))}

        <div style={{ height: 1, background: C.border, margin: '10px 0' }} />
        <div style={{ fontFamily: 'Inter,sans-serif', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.text3, marginBottom: 7 }}>Timeline</div>
        {[['Sourced','28 mar'],['Contactado','30 mar'],['Screening','Hoy · LS']].map(([k,v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
            <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, color: C.text3 }}>{k}</span>
            <span style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, fontWeight: 600, color: C.text }}>{v}</span>
          </div>
        ))}
      </div>
      {/* actions */}
      <div style={{ padding: '10px 13px', borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {[
          { label: 'Generar report', bg: C.green, color: '#fff', border: C.green },
          { label: 'Presentar a cliente', bg: 'none', color: C.text2, border: C.border },
          { label: 'Descartar', bg: 'none', color: C.red, border: C.redBr },
        ].map(b => (
          <button key={b.label} style={{ fontFamily: 'Inter,sans-serif', fontSize: 11, fontWeight: 600, padding: 8, borderRadius: 4, cursor: 'pointer', border: `1px solid ${b.border}`, background: b.bg, color: b.color, width: '100%', textAlign: 'center' }}>{b.label}</button>
        ))}
      </div>
    </div>
  )
}

/* ─── Data mock ────────────────────────────────────────────────────── */
const SEARCHES = [
  { id: 'globant-python', label: 'Sr Python — Globant', count: 34, alertDot: true },
  { id: 'toptal-data',    label: 'Data Eng — Toptal',   count: 21 },
  { id: 'remote-backend', label: 'Backend — Remote',    count: 14, warnDot: true },
]
const TEAM_SEARCHES = [
  { id: 'brex-fs',  label: 'Fullstack — Brex',      count: 12 },
  { id: 'luma-da',  label: 'Data Analyst — Luma',   count: 7  },
]

const STAGES = ['Sourced', 'Contactados', 'Screening', 'Presentado', 'Entrevista', 'Oferta']
const PIPELINE_COUNTS = [14, 10, 5, 3, 1, 0]

const CANDIDATES = [
  { id:1, name:'Marcos Suárez',  initials:'MS', role:'Sr Python · ARG', salary:'$5.5K', stage:'Sourced',    flag:'red',   chip:'Sin contacto',  chipVariant:'red',   age:'Hace 1d', sourcer:'LP', qa:'Contactar',   actType:'urgent',   actLabel:'Sin contacto · hace 1d',    qaActions:[{label:'Contactar',primary:true}] },
  { id:2, name:'Diego Ferrán',   initials:'DF', role:'Backend · ARG',   salary:'$4.8K', stage:'Sourced',    flag:null,    chip:null,            chipVariant:'neu',   age:'Hace 2d', sourcer:'XU', qa:null,          actType:'neutral',  actLabel:'Sourced · hace 2d',          qaActions:[{label:'Contactar'}] },
  { id:3, name:'Valeria Ríos',   initials:'VR', role:'Sr Python · COL', salary:'$5K',   stage:'Sourced',    flag:null,    chip:null,            chipVariant:'neu',   age:'Hace 3d', sourcer:'RL', qa:null,          actType:'neutral',  actLabel:'Sourced · hace 3d',          qaActions:[{label:'Contactar'}] },
  { id:4, name:'Ana Rodríguez',  initials:'AR', role:'Data Eng · URU',  salary:'$4.5K', stage:'Contactado', flag:null,    chip:null,            chipVariant:'neu',   age:'Hace 3d', sourcer:'LP', qa:'Follow-up',   actType:'neutral',  actLabel:'Contactada · hace 3d',       qaActions:[{label:'Follow-up'}] },
  { id:5, name:'Luis Pereyra',   initials:'LP', role:'Backend · ARG',   salary:'$5K',   stage:'Contactado', flag:'green', chip:'Respondió',     chipVariant:'green', age:'Hace 1d', sourcer:'XU', qa:'→ Screening', actType:'positive', actLabel:'Respondió positivo',         qaActions:[{label:'→ Screening',primary:true}] },
  { id:6, name:'Tomás Villalba', initials:'TV', role:'Sr Python · ARG', salary:null,    stage:'Contactado', flag:'red',   chip:'Sin resp. 4d',  chipVariant:'red',   age:'Hace 4d', sourcer:'LP', qa:'Follow-up',   actType:'urgent',   actLabel:'Sin respuesta · 4 días',     qaActions:[{label:'Follow-up',primary:true},{label:'Descartar',danger:true}] },
  { id:7, name:'Lucas García',   initials:'LG', role:'Backend · ARG',   salary:'$4.2K', stage:'Screening',  flag:'green', chip:'Report listo',  chipVariant:'green', age:'Hoy',     sourcer:'LS', qa:'Presentar',   actType:'positive', actLabel:'Report listo — presentar',   qaActions:[{label:'Generar report',primary:true},{label:'→ Siguiente'}] },
  { id:8, name:'Camila Reyes',   initials:'CR', role:'Sr Python · CHI', salary:'$5.2K', stage:'Screening',  flag:null,    chip:'Sin report',    chipVariant:'amber', age:'Hace 2d', sourcer:'LP', qa:'Generar',     actType:'urgent',   actLabel:'Sin report · hace 2d',       qaActions:[{label:'Generar report',primary:true}] },
  { id:9, name:'Paula Vega',     initials:'PV', role:'Fullstack · ARG', salary:'$5.8K', stage:'Presentado', flag:'green', chip:'Entrevista →',  chipVariant:'green', age:'Hace 4d', sourcer:'LS', qa:'→ Entrevista',actType:'positive', actLabel:'Entrevista confirmada · jue',qaActions:[{label:'→ Entrevista',primary:true}] },
  { id:10,name:'Fabián Moya',    initials:'FM', role:'Sr Python · ARG', salary:'$4.9K', stage:'Presentado', flag:null,    chip:null,            chipVariant:'neu',   age:'Hace 6d', sourcer:'LS', qa:null,          actType:'neutral',  actLabel:'Presentado · hace 6d',       qaActions:[{label:'Seguimiento'}] },
  { id:11,name:'Rodrigo Paz',    initials:'RP', role:'Sr Python · ARG', salary:'$6K',   stage:'Entrevista', flag:'green', chip:'Jue 10am',      chipVariant:'green', age:'En 2d',   sourcer:'LS', qa:'→ Oferta',    actType:'positive', actLabel:'Jue 10am — 2 días',          qaActions:[{label:'→ Oferta',primary:true}] },
]

/* ─── Icon helpers ─────────────────────────────────────────────────── */
const IcoDoc = () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1.5" y="1.5" width="11" height="11" rx="1" stroke="currentColor" strokeWidth="1.3"/><line x1="4" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><line x1="4" y1="7.5" x2="8" y2="7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
const IcoPerson = () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="5.5" r="2.2" stroke="currentColor" strokeWidth="1.3"/><path d="M2 13c0-2.5 2.2-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
const IcoCard = () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><rect x="1" y="2.5" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.3"/><line x1="1" y1="5.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="1"/></svg>
const IcoChart = () => <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M1 11L4 6l3 3.5 2-2.5 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>

/* ─── MAIN COMPONENT ───────────────────────────────────────────────── */
export default function ATSPage() {
  const { data: session } = useSession()
  const [activeSearch, setActiveSearch] = useState('globant-python')
  const [view, setView] = useState('board') // 'board' | 'list'
  const [selectedCand, setSelectedCand] = useState(null)
  const [activeStage, setActiveStage] = useState(null) // null = all

  const byStage = (stage) => CANDIDATES.filter(c => c.stage === stage)

  const listCands = activeStage
    ? CANDIDATES.filter(c => c.stage === activeStage)
    : CANDIDATES

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, fontFamily: 'Inter,system-ui,sans-serif', overflow: 'hidden' }}>

      {/* ── SIDEBAR ── */}
      <div style={{ width: 214, background: C.s0, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* brand */}
        <div style={{ height: 48, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 13px', gap: 8 }}>
          <Logo />
          <span style={{ fontFamily: "'Special Elite',Georgia,serif", fontSize: 15, color: C.text, letterSpacing: '0.03em' }}>BONDY</span>
          <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.green, border: `1px solid ${C.greenBr}`, background: C.greenBg, padding: '2px 5px', borderRadius: 2 }}>ATS</span>
        </div>

        {/* user */}
        <div style={{ padding: '9px 13px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: C.greenBg, border: `1px solid ${C.greenBr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: C.green, flexShrink: 0 }}>
            {session?.user?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: C.text }}>{session?.user?.name?.split(' ')[0] || 'Usuario'}</div>
            <div style={{ fontSize: 10, color: C.text3 }}>Sourcer</div>
          </div>
        </div>

        {/* nav */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.text3, padding: '10px 13px 3px' }}>Mis búsquedas</div>
          {SEARCHES.map(s => (
            <SbItem key={s.id} icon={<IcoDoc />} label={s.label} count={s.count} active={activeSearch === s.id} alertDot={s.alertDot} warnDot={s.warnDot} onClick={() => setActiveSearch(s.id)} />
          ))}
          <div style={{ height: 1, background: C.border, margin: '5px 13px' }} />
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.text3, padding: '10px 13px 3px' }}>Equipo</div>
          {TEAM_SEARCHES.map(s => (
            <SbItem key={s.id} icon={<IcoDoc />} label={s.label} count={s.count} active={false} onClick={() => {}} />
          ))}
          <div style={{ height: 1, background: C.border, margin: '5px 13px' }} />
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.text3, padding: '10px 13px 3px' }}>Navegación</div>
          <SbItem icon={<IcoPerson />} label="Candidatos" active={false} onClick={() => {}} />
          <SbItem icon={<IcoCard />}   label="Cuentas"    active={false} onClick={() => {}} />
          <SbItem icon={<IcoChart />}  label="Revenue"    active={false} onClick={() => {}} />
        </div>

        {/* footer */}
        <div style={{ padding: '9px 13px', borderTop: `1px solid ${C.border}` }}>
          <Link href="/internal" style={{ display: 'block', fontFamily: 'Inter,sans-serif', fontSize: 11, color: C.text3, padding: '3px 0', textDecoration: 'none' }}>← Panel Bondy</Link>
          <button onClick={() => signOut({ callbackUrl: '/login' })} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: 11, color: C.text3, padding: '3px 0', display: 'block', textAlign: 'left' }}>Cerrar sesión</button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* topbar */}
        <div style={{ height: 48, background: C.s0, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 15px', gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 11, color: C.text3 }}>Búsquedas</span>
          <span style={{ color: C.border2, margin: '0 2px' }}>/</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Senior Python Dev — Globant</span>
          <div style={{ display: 'flex', gap: 4, marginLeft: 4 }}>
            {[['Urgente', C.redBg, C.redBr, C.red], ['Activa', C.greenBg, C.greenBr, C.green], ['Día 12', C.s1, C.border, C.text3]].map(([l,bg,br,cl]) => (
              <span key={l} style={{ fontSize: 9, fontWeight: 600, padding: '2px 6px', borderRadius: 2, border: `1px solid ${br}`, background: bg, color: cl }}>{l}</span>
            ))}
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {['Brief','+ Candidato'].map((l,i) => (
              <button key={l} style={{ fontSize: 11, fontWeight: 600, padding: '5px 11px', borderRadius: 4, cursor: 'pointer', border: `1px solid ${i === 0 ? C.border : C.green}`, background: i === 0 ? 'none' : C.green, color: i === 0 ? C.text2 : '#fff' }}>{l}</button>
            ))}
          </div>
        </div>

        {/* activity bar */}
        <div style={{ height: 28, background: C.s1, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 15px', gap: 6, flexShrink: 0 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: C.text3 }}>
            <strong style={{ color: C.text2, fontWeight: 600 }}>Laura S.</strong> movió a Rodrigo Paz → Entrevista · hace 2h &nbsp;·&nbsp; <strong style={{ color: C.text2, fontWeight: 600 }}>Lucía P.</strong> sourced 3 nuevos · hace 4h
          </span>
        </div>

        {/* pipeline summary */}
        <div style={{ background: C.s0, borderBottom: `1px solid ${C.border}`, display: 'flex', flexShrink: 0 }}>
          {STAGES.map((stage, i) => (
            <button key={stage} onClick={() => setActiveStage(activeStage === stage ? null : stage)} style={{
              flex: 1, padding: '6px 10px', textAlign: 'center',
              borderRight: i < STAGES.length - 1 ? `1px solid ${C.border}` : 'none',
              borderBottom: `2px solid ${activeStage === stage ? C.green : 'transparent'}`,
              background: activeStage === stage ? '#FAFFF9' : 'transparent',
              cursor: 'pointer', border: 'none',
              borderRight: i < STAGES.length - 1 ? `1px solid ${C.border}` : 'none',
              borderBottom: `2px solid ${activeStage === stage ? C.green : 'transparent'}`,
            }}>
              <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: activeStage === stage ? C.green : C.text3 }}>{stage}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{PIPELINE_COUNTS[i]}</div>
            </button>
          ))}
        </div>

        {/* toolbar */}
        <div style={{ height: 38, background: C.s1, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', padding: '0 13px', gap: 6, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: C.s0, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 9px', flex: 1, maxWidth: 200 }}>
            <svg width="11" height="11" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke={C.text3} strokeWidth="1.3"/><path d="M9 9l2.5 2.5" stroke={C.text3} strokeWidth="1.3" strokeLinecap="round"/></svg>
            <span style={{ fontSize: 11, color: C.text3 }}>Buscar candidato...</span>
          </div>
          {['Filtrar','Ordenar'].map(l => (
            <button key={l} style={{ fontSize: 10, fontWeight: 500, color: C.text2, background: C.s0, border: `1px solid ${C.border}`, padding: '3px 8px', borderRadius: 4, cursor: 'pointer' }}>{l}</button>
          ))}
          {/* view toggle */}
          <div style={{ marginLeft: 'auto', display: 'flex', border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>
            {[
              { id: 'list', icon: <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><line x1="1" y1="2.5" x2="12" y2="2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="1" y1="6.5" x2="12" y2="6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="1" y1="10.5" x2="12" y2="10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
              { id: 'board', icon: <svg width="12" height="12" viewBox="0 0 13 13" fill="none"><rect x="1" y="1" width="3" height="11" rx="0.8" fill="currentColor"/><rect x="5" y="1" width="3" height="11" rx="0.8" fill="currentColor" opacity=".6"/><rect x="9" y="1" width="3" height="11" rx="0.8" fill="currentColor" opacity=".35"/></svg> },
            ].map(({ id, icon }) => (
              <button key={id} onClick={() => setView(id)} style={{ width: 28, height: 26, background: view === id ? C.text : C.s0, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: view === id ? '#fff' : C.text3 }}>
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* content area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {view === 'board' ? (
            /* ── KANBAN ── */
            <div style={{ flex: 1, overflowX: 'auto', padding: '9px 13px 12px', display: 'flex', gap: 8 }}>
              {['Sourced','Contactados','Screening','Presentado','Entrevista','Oferta'].map((stage, si) => {
                const tones = [C.s0, C.s1, C.s2]
                const bg = tones[si % 3]
                const cands = byStage(stage === 'Contactados' ? 'Contactado' : stage)
                return (
                  <div key={stage} style={{ width: 176, flexShrink: 0, display: 'flex', flexDirection: 'column', background: bg, borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ padding: '7px 9px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text2 }}>{stage}</span>
                      <span style={{ fontSize: 9, fontWeight: 700, color: C.text3 }}>{PIPELINE_COUNTS[si]}</span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: 6, display: 'flex', flexDirection: 'column' }}>
                      {cands.length > 0 ? cands.map(c => (
                        <KCard key={c.id} cand={c} selected={selectedCand?.id === c.id} onSelect={setSelectedCand} />
                      )) : (
                        /* empty col inteligente */
                        <div style={{ border: `1px dashed ${C.border}`, borderRadius: 4, padding: '12px 8px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: C.text3, marginBottom: 8 }}>Sin candidatos aquí</div>
                          {/* el candidato más cercano */}
                          <div style={{ background: C.s0, border: `1px solid ${C.border}`, borderRadius: 4, padding: '7px 8px', cursor: 'pointer', textAlign: 'left' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = C.green}
                            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                          >
                            <div style={{ fontSize: 10, fontWeight: 600, color: C.text }}>Rodrigo Paz</div>
                            <div style={{ fontSize: 9, color: C.text3, marginTop: 1 }}>Más cercano a esta etapa</div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                              <button style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 2, cursor: 'pointer', border: `1px solid ${C.greenBr}`, background: C.greenBg, color: C.green }}>Promover →</button>
                            </div>
                          </div>
                        </div>
                      )}
                      {cands.length > 0 && stage === 'Sourced' && (
                        <button style={{ background: 'none', border: `1px dashed ${C.border}`, borderRadius: 4, padding: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, cursor: 'pointer', marginTop: 2 }}>
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke={C.text3} strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="6" x2="11" y2="6" stroke={C.text3} strokeWidth="1.5" strokeLinecap="round"/></svg>
                          <span style={{ fontSize: 10, color: C.text3 }}>Agregar</span>
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* ── LIST ── */
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1fr 1fr 1.4fr 0.5fr', padding: '0 13px', background: C.s1, borderBottom: `1px solid ${C.border}` }}>
                {['Candidato','Puesto','Etapa','Salario','Última actividad','Quién'].map(h => (
                  <div key={h} style={{ fontFamily: 'Inter,sans-serif', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: C.text3, padding: '6px 5px' }}>{h}</div>
                ))}
              </div>
              {listCands.map((c, i) => (
                <LRow key={c.id} cand={c} onSelect={setSelectedCand} alt={i % 2 === 1} />
              ))}
            </div>
          )}

          {/* ── DETAIL PANEL ── */}
          {selectedCand && <DetailPanel cand={selectedCand} onClose={() => setSelectedCand(null)} />}
        </div>
      </div>

    </div>
  )
}
