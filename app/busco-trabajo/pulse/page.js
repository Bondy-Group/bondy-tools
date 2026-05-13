import MarketPulseCandidateClient from './Client'

export const metadata = {
  metadataBase: new URL('https://tools.wearebondy.com'),
  title: 'Market Pulse · Busco Trabajo · Bondy',
  description:
    'Qué skills mandan, qué está subiendo y qué empresas más contratan en el mercado tech LATAM y US remoto. Data real de JDs reales, actualizada cada día.',
  alternates: {
    canonical: 'https://tools.wearebondy.com/busco-trabajo/pulse',
  },
  openGraph: {
    title: 'Market Pulse · Busco Trabajo · Bondy',
    description:
      'El pulso del mercado tech para candidatos. Skills emergentes, top empresas hiring y tendencias mes a mes.',
    url: 'https://tools.wearebondy.com/busco-trabajo/pulse',
    siteName: 'Bondy',
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Market Pulse · Busco Trabajo · Bondy',
    description:
      'El pulso del mercado tech para candidatos. Skills emergentes, top empresas hiring y tendencias mes a mes.',
  },
  robots: { index: true, follow: true },
}

export default function MarketPulseCandidatePage() {
  return <MarketPulseCandidateClient />
}
