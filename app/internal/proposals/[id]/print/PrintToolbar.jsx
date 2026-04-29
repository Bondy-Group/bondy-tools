'use client'

export default function PrintToolbar() {
  return (
    <>
      <div className="proposal-print-toolbar" style={{
        position: 'fixed', top: 12, right: 12, zIndex: 100,
        display: 'flex', gap: 8,
        background: '#FFFFFF', border: '1px solid #E8E4DE',
        padding: '8px 12px', borderRadius: 4,
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", fontSize: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <button
          onClick={() => window.print()}
          style={{
            padding: '6px 14px', background: '#4A8C40', color: '#fff',
            border: 'none', borderRadius: 2, cursor: 'pointer', fontWeight: 600,
          }}
        >
          Imprimir / Guardar PDF
        </button>
      </div>
      <style jsx global>{`
        @media print {
          .proposal-print-toolbar { display: none !important; }
        }
      `}</style>
    </>
  )
}
