/**
 * GET /api/candidatos-match/action
 *
 * Lo disparan los botones-link del mensaje de #candidatos-match (mismo patrón
 * que session-requests, así NO hace falta configurar Interactivity en Slack).
 *
 * Query: ?id=<recordId Airtable>&action=take|sent&recruiter=Lucía|Rodrigo|Mara&secret=<SESSION_ACTION_SECRET>
 *
 *   take  → Recruiter = <recruiter>, Estado intake = 'Tomado'
 *   sent  → Estado intake = 'Contactado'
 *
 * Devuelve una página HTML simple (se abre en el navegador al clickear).
 */

const Airtable = require('airtable')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BASE_ID = 'appOXmQUWbbxpgj0e'
const T_INTAKE = 'Intake de perfiles'
const ACTION_SECRET = process.env.SESSION_ACTION_SECRET || 'bondy-session-action-internal'

const getBase = () => new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(BASE_ID)

function page({ title, body, tone = 'ok' }) {
  const accent = tone === 'error' ? '#C0392B' : '#4A8C40'
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${title}</title>
<style>
body{margin:0;background:#FEFCF9;font-family:'Courier New',monospace;color:#1A1A1A;
  display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
.box{background:#fff;border:1px solid #E8E4DE;border-radius:12px;padding:36px 40px;max-width:440px;
  box-shadow:0 8px 24px -16px rgba(58,53,48,.2);}
.bar{width:22px;height:2px;background:${accent};margin-bottom:18px;}
h1{font-size:19px;margin:0 0 12px;color:#3A3530;}
p{font-size:13px;line-height:1.7;color:#5A5550;margin:0 0 6px;}
.tag{display:inline-block;margin-top:14px;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;
  color:${accent};border:1px solid ${accent};border-radius:999px;padding:3px 10px;}
</style></head><body><div class="box"><div class="bar"></div>
<h1>${title}</h1>${body}</div></body></html>`
}

function html(res, status = 200) {
  return new Response(res, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

export async function GET(req) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') || ''
  const action = searchParams.get('action') || ''
  const recruiter = searchParams.get('recruiter') || ''
  const secret = searchParams.get('secret') || ''

  if (secret !== ACTION_SECRET) {
    return html(page({ title: 'Acceso denegado', tone: 'error', body: '<p>El link no es válido.</p>' }), 401)
  }
  if (!id || !['take', 'sent'].includes(action)) {
    return html(page({ title: 'Link inválido', tone: 'error', body: '<p>Falta el id o la acción.</p>' }), 400)
  }

  try {
    const base = getBase()
    const rec = await base(T_INTAKE).find(id)
    const nombre = rec.get('Nombre y apellido') || 'el candidato'

    if (action === 'take') {
      const yaTomado = rec.get('Recruiter')
      await base(T_INTAKE).update(id, { Recruiter: recruiter || yaTomado || '', 'Estado intake': 'Tomado' })
      return html(page({
        title: `Tomaste a ${nombre}`,
        body: `<p>Quedó asignado a <strong>${recruiter || 'vos'}</strong> y el estado pasó a <strong>Tomado</strong>.</p>
               ${yaTomado && yaTomado !== recruiter ? `<p>Ojo: antes figuraba <strong>${yaTomado}</strong>.</p>` : ''}
               <p>Copiá el mensaje del canal y envialo desde tu casilla. Cuando lo mandes, tocá "Marcar enviado".</p>
               <span class="tag">${nombre}</span>`,
      }))
    }

    // sent
    await base(T_INTAKE).update(id, { 'Estado intake': 'Contactado' })
    return html(page({
      title: 'Marcado como enviado',
      body: `<p>El estado de <strong>${nombre}</strong> pasó a <strong>Contactado</strong>.</p>
             <span class="tag">${nombre}</span>`,
    }))
  } catch (err) {
    return html(page({ title: 'No se pudo actualizar', tone: 'error', body: `<p>${String((err && err.message) || err)}</p>` }), 500)
  }
}
