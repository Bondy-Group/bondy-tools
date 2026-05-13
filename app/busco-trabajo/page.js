import BuscoTrabajoLandingClient from './Client'

export const metadata = {
  metadataBase: new URL('https://tools.wearebondy.com'),
  title: 'Busco Trabajo · Bondy',
  description:
    'Caja de herramientas para candidatos tech: jobs nuevos a diario, búsquedas exclusivas Bondy, talent pool y referidos. Sin login, sin fricción.',
  alternates: {
    canonical: 'https://tools.wearebondy.com/busco-trabajo',
  },
  openGraph: {
    title: 'Busco Trabajo · Bondy',
    description:
      'Caja de herramientas para candidatos tech: jobs nuevos a diario, búsquedas exclusivas Bondy, talent pool y referidos.',
    url: 'https://tools.wearebondy.com/busco-trabajo',
    siteName: 'Bondy',
    locale: 'es_AR',
    type: 'website',
    images: [
      {
        url: 'https://tools.wearebondy.com/og-busco-trabajo.png',
        width: 1200,
        height: 630,
        alt: 'Bondy — Busco Trabajo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Busco Trabajo · Bondy',
    description:
      'Caja de herramientas para candidatos tech: jobs nuevos a diario, búsquedas exclusivas Bondy, talent pool y referidos.',
    images: ['https://tools.wearebondy.com/og-busco-trabajo.png'],
  },
  robots: { index: true, follow: true },
}

export default function BuscoTrabajoLandingPage() {
  return <BuscoTrabajoLandingClient />
}
