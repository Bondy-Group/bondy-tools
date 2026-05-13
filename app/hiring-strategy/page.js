import HiringStrategyClient from './Client'

export const metadata = {
  metadataBase: new URL('https://tools.wearebondy.com'),
  title: 'Hiring Strategy · Bondy',
  description:
    'Herramientas para hiring managers y fondos planeando su estrategia de contratación tech en LATAM. Intel de mercado, benchmarks y playbooks de calibración.',
  alternates: {
    canonical: 'https://tools.wearebondy.com/hiring-strategy',
  },
  openGraph: {
    title: 'Hiring Strategy · Bondy',
    description:
      'Herramientas para hiring managers y fondos planeando su estrategia de contratación tech en LATAM.',
    url: 'https://tools.wearebondy.com/hiring-strategy',
    siteName: 'Bondy',
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Hiring Strategy · Bondy',
    description:
      'Herramientas para hiring managers y fondos planeando su estrategia de contratación tech en LATAM.',
  },
  robots: { index: true, follow: true },
}

export default function HiringStrategyPage() {
  return <HiringStrategyClient />
}
