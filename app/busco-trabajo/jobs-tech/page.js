import { fetchOpenRoles, fetchBondyOpenRoles, formatUpdateLabel, formatTodayLabel, AREAS, MODALITIES, SENIORITIES, SOURCES, LOCATIONS, LANGUAGES } from '@/lib/scraper-jobs'
import BuscoTrabajoClient from './Client'
import './styles.css'

export const metadata = {
  metadataBase: new URL('https://tools.wearebondy.com'),
  title: 'Jobs tech · Busco Trabajo · Bondy',
  description:
    'Roles tech en LATAM, actualizados a diario. Curados con el mismo criterio que aplicamos a nuestras búsquedas embebidas.',
  alternates: {
    canonical: 'https://tools.wearebondy.com/busco-trabajo/jobs-tech',
  },
  openGraph: {
    title: 'Jobs tech · Busco Trabajo · Bondy',
    description:
      'Roles tech en LATAM, actualizados a diario. Curados con el mismo criterio que aplicamos a nuestras búsquedas embebidas.',
    url: 'https://tools.wearebondy.com/busco-trabajo/jobs-tech',
    siteName: 'Bondy',
    locale: 'es_AR',
    type: 'website',
    images: [
      {
        url: 'https://tools.wearebondy.com/og-busco-trabajo.png',
        width: 1200,
        height: 630,
        alt: 'Bondy — Jobs tech',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jobs tech · Busco Trabajo · Bondy',
    description:
      'Roles tech en LATAM, actualizados a diario. Curados con el mismo criterio que aplicamos a nuestras búsquedas embebidas.',
    images: ['https://tools.wearebondy.com/og-busco-trabajo.png'],
  },
  robots: { index: true, follow: true },
}

export const revalidate = 1800 // 30 min

export default async function BuscoTrabajoPage() {
  const [
    { roles, lastUpdate, newToday, activeSources },
    bondyRoles,
  ] = await Promise.all([
    fetchOpenRoles({ days: 7, limit: 500 }),
    fetchBondyOpenRoles({ limit: 12 }),
  ])
  const updateLabel = formatUpdateLabel(lastUpdate)
  const todayLabel = formatTodayLabel()
  // If the catalog gave us an active-sources list, use it; otherwise fall back to
  // the static SOURCES export so the filter never shows up empty.
  const visibleSources = (activeSources && activeSources.length > 0) ? activeSources : SOURCES

  return (
    <BuscoTrabajoClient
      initialRoles={roles}
      bondyRoles={bondyRoles}
      updateLabel={updateLabel}
      todayLabel={todayLabel}
      newToday={newToday}
      areas={AREAS}
      modalities={MODALITIES}
      seniorities={SENIORITIES}
      sources={visibleSources}
      locations={LOCATIONS}
      languages={LANGUAGES}
    />
  )
}
