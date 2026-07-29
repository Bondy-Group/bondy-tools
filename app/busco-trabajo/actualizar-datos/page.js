import ActualizarDatosClient from './Client'

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

export default function ActualizarDatosPage() {
  return <ActualizarDatosClient />
}
