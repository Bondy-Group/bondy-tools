import { fetchRecruitingRoles, formatUpdateLabel, formatTodayLabel, RECRUITING_AREAS, MODALITIES, SENIORITIES, SOURCES, LOCATIONS, LANGUAGES } from '@/lib/scraper-jobs'
import BuscoTrabajoClient from '../../busco-trabajo/jobs-tech/Client'
import '../../busco-trabajo/jobs-tech/styles.css'

export const metadata = {
  metadataBase: new URL('https://tools.wearebondy.com'),
  title: 'Roles para recruiters · Bondy',
  description:
    'Roles abiertos de recruiting, sourcing, talent acquisition y people ops en LATAM, actualizados a diario. Curados con el mismo criterio que aplicamos a nuestras búsquedas embebidas.',
  alternates: {
    canonical: 'https://tools.wearebondy.com/recursos-recruiters/busco-trabajo',
  },
  openGraph: {
    title: 'Roles para recruiters · Bondy',
    description:
      'Roles abiertos de recruiting, sourcing, talent acquisition y people ops en LATAM, actualizados a diario.',
    url: 'https://tools.wearebondy.com/recursos-recruiters/busco-trabajo',
    siteName: 'Bondy',
    locale: 'es_AR',
    type: 'website',
    images: [
      {
        url: 'https://tools.wearebondy.com/og-busco-trabajo.png',
        width: 1200,
        height: 630,
        alt: 'Bondy — Roles para recruiters',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roles para recruiters · Bondy',
    description:
      'Roles abiertos de recruiting, sourcing, talent acquisition y people ops en LATAM, actualizados a diario.',
    images: ['https://tools.wearebondy.com/og-busco-trabajo.png'],
  },
  robots: { index: true, follow: true },
}

export const revalidate = 1800 // 30 min

export default async function BuscoTrabajoRecruitersPage() {
  // Ventana de 14 días (collected_at). Más amplia que /busco-trabajo (tech, 3d):
  // el scraper de HR tiene menos volumen, con 3 días el board queda casi vacío.
  const { roles, lastUpdate, newToday, activeSources } = await fetchRecruitingRoles({ days: 14, limit: 500 })
  const updateLabel = formatUpdateLabel(lastUpdate)
  const todayLabel = formatTodayLabel()
  const visibleSources = (activeSources && activeSources.length > 0) ? activeSources : SOURCES

  return (
    <BuscoTrabajoClient
      initialRoles={roles}
      updateLabel={updateLabel}
      todayLabel={todayLabel}
      newToday={newToday}
      areas={RECRUITING_AREAS}
      modalities={MODALITIES}
      seniorities={SENIORITIES}
      sources={visibleSources}
      locations={LOCATIONS}
      languages={LANGUAGES}
      audience="recruiters"
    />
  )
}
