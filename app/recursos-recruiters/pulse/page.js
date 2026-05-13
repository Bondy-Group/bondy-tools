import MarketPulseRecruiterClient from './Client'

export const metadata = {
  metadataBase: new URL('https://tools.wearebondy.com'),
  title: 'Market Pulse · Recursos Recruiters · Bondy',
  description:
    'El pulso del mercado tech para recruiters. Top stacks pedidos, tendencias mes a mes y empresas hiring agresivo en LATAM y US remote. Para calibrar tu próxima búsqueda.',
  alternates: {
    canonical: 'https://tools.wearebondy.com/recursos-recruiters/pulse',
  },
  openGraph: {
    title: 'Market Pulse · Recursos Recruiters · Bondy',
    description:
      'Top stacks pedidos, tendencias mes a mes y empresas hiring agresivo. Para que tu próxima búsqueda salga calibrada.',
    url: 'https://tools.wearebondy.com/recursos-recruiters/pulse',
    siteName: 'Bondy',
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Market Pulse · Recursos Recruiters · Bondy',
    description:
      'Top stacks pedidos, tendencias mes a mes y empresas hiring agresivo.',
  },
  robots: { index: true, follow: true },
}

export default function MarketPulseRecruiterPage() {
  return <MarketPulseRecruiterClient />
}
