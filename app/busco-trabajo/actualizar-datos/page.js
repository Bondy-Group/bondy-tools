import ActualizarDatosClient from './Client'
import { findCandidate, recordToPrefill, signToken } from '@/lib/actualizar-datos-store'

export const dynamic = 'force-dynamic'

export const metadata = {
  metadataBase: new URL('https://tools.wearebondy.com'),
  title: 'Actualizá tus datos · Bondy',
  description:
    'Actualizá tu perfil en la base de Bondy para que las búsquedas correctas te encuentren. Dos minutos, sin login.',
  alternates: {
    canonical: 'https://tools.wearebondy.com/busco-trabajo/actualizar-datos',
  },
  openGraph: {
    title: 'Actualizá tus datos · Bondy',
    description:
      'Actualizá tu perfil en la base de Bondy para que las búsquedas correctas te encuentren.',
    url: 'https://tools.wearebondy.com/busco-trabajo/actualizar-datos',
    siteName: 'Bondy',
    locale: 'es_AR',
    type: 'website',
  },
  robots: { index: false, follow: true },
}

export default async function ActualizarDatosPage({ searchParams }) {
  const t = typeof searchParams?.t === 'string' ? searchParams.t : ''
  const e = typeof searchParams?.e === 'string' ? searchParams.e : ''

  let prefill = null
  let token = ''
  if (t || e) {
    try {
      const record = await findCandidate({ token: t, emailToken: e })
      if (record) {
        prefill = recordToPrefill(record)
        token = signToken(record.id) // token válido para el submit (re-verificado en el server)
      }
    } catch {
      // Si falla la resolución, cae al form abierto sin romper la página.
    }
  }

  return <ActualizarDatosClient prefill={prefill} token={token} />
}
