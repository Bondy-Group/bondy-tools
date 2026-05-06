/**
 * GET /api/newsletter/unsubscribe?token=XXX
 *
 * Hit from the footer link of every digest email. Marks the subscriber as
 * unsubscribed and returns a small HTML confirmation page styled in the
 * Bondy v4 typewriter palette.
 */

import { unsubscribeByToken } from '@/lib/subscribers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function htmlPage({ ok, message }) {
  const status = ok ? 'Listo.' : 'Hubo un problema.'
  const subline = ok
    ? 'Cancelaste tu suscripción al digest semanal de Bondy. Si fue un error, podés volver a suscribirte cuando quieras.'
    : message ||
      'No pudimos procesar el link. Puede que ya hayas cancelado, o el link esté vencido. Escribinos a hello@wearebondy.com si necesitás ayuda.'

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Cancelar suscripción · Bondy</title>
<style>
  body { margin:0; padding:48px 24px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; background:#FEFCF9; color:#1A1A1A; min-height:100vh; box-sizing:border-box; }
  .wrap { max-width: 520px; margin: 8vh auto 0; }
  .kicker { font-family: 'Courier New', monospace; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color:#4A8C40; display:flex; align-items:center; gap:12px; margin-bottom:18px; }
  .kicker::before { content:''; width:22px; height:1px; background:#4A8C40; display:inline-block; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 36px; line-height:1.1; margin:0 0 16px; font-weight:700; }
  h1 em { font-style: italic; color:#4A8C40; }
  p { font-size: 15px; line-height: 1.7; color: #4f4f4f; margin: 0 0 24px; }
  a { color: #4A8C40; text-decoration: none; border-bottom: 1px solid #4A8C40; }
  a:hover { color: #3a7030; border-color:#3a7030; }
  .links { font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color:#7A7874; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="kicker">Bondy · Suscripción</div>
    <h1>${status} <em>${ok ? 'Te bajamos.' : ''}</em></h1>
    <p>${subline}</p>
    <p class="links">
      <a href="https://tools.wearebondy.com/busco-trabajo">Volver al job board</a>
    </p>
  </div>
</body>
</html>`
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return new Response(htmlPage({ ok: false, message: 'Link inválido — falta el token.' }), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  const result = await unsubscribeByToken(token)
  return new Response(htmlPage({ ok: result.ok, message: result.error }), {
    status: result.ok ? 200 : 404,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
