import MarketPulseHiringManagerClient from './Client'

export const metadata = {
  metadataBase: new URL('https://tools.wearebondy.com'),
  title: 'Market Pulse · Hiring Strategy · Bondy',
  description:
    'El pulso del mercado tech para hiring managers, VPs y fondos. Lo que pide tu industria, tus competidores activos y dónde está la presión salarial. Data real, actualizada cada día.',
  alternates: {
    canonical: 'https://tools.wearebondy.com/hiring-strategy/pulse',
  },
  openGraph: {
    title: 'Market Pulse · Hiring Strategy · Bondy',
    description:
      'Lo que tu industria y tus competidores piden hoy en el mercado tech LATAM. Data real para tu próxima decisión de hiring.',
    url: 'https://tools.wearebondy.com/hiring-strategy/pulse',
    siteName: 'Bondy',
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Market Pulse · Hiring Strategy · Bondy',
    description:
      'Lo que tu industria y tus competidores piden hoy en el mercado tech LATAM.',
  },
  robots: { index: true, follow: true },
}

export default function MarketPulseHiringManagerPage() {
  return <MarketPulseHiringManagerClient />
}
