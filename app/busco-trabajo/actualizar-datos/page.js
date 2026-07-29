/* app/busco-trabajo/actualizar-datos/page.js
   Placeholder temporal. El formulario real de autoactualización va acá
   en el próximo paso (port del preview aprobado por Mara). */

export const metadata = {
  title: 'Actualizá tus datos · Bondy',
  description: 'Actualizá tu perfil en la base de Bondy para que las búsquedas correctas te encuentren.',
}

export default function ActualizarDatosPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px 20px',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        color: '#5A5550',
      }}
    >
      <h1
        style={{
          fontFamily: "'Special Elite', Georgia, serif",
          fontSize: 'clamp(2rem, 5vw, 3rem)',
          color: '#3A3530',
          marginBottom: '12px',
        }}
      >
        Actualizá tus datos
      </h1>
      <p style={{ maxWidth: '48ch', lineHeight: 1.6 }}>
        Estamos terminando de armar este formulario. Muy pronto vas a poder
        actualizar tu perfil en dos minutos.
      </p>
      <a
        href="/busco-trabajo"
        style={{ marginTop: '24px', color: '#4A8C40', textDecoration: 'none', fontSize: '13px', letterSpacing: '.04em', textTransform: 'uppercase' }}
      >
        ← Volver a Busco Trabajo
      </a>
    </main>
  )
}
