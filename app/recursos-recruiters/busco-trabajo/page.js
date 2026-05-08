import { fetchRecruitingRoles, formatUpdateLabel, formatTodayLabel, RECRUITING_AREAS, MODALITIES, SENIORITIES, SOURCES, LOCATIONS, LANGUAGES } from '@/lib/scraper-jobs'
import BuscoTrabajoClient from '../../busco-trabajo/Client'
import '../../busco-trabajo/styles.css'

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
        url: 'https://wearebondy.com/og-image.png',
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
    images: ['https://wearebondy.com/og-image.png'],
  },
  robots: { index: true, follow: true },
}

export const revalidate = 1800 // 30 min

export default async function BuscoTrabajoRecruitersPage() {
  // Wider window than candidates (90d vs 3d): recruiting roles are scarcer in
  // the scraped pool, so showing the last 90 days keeps the listing alive.
  const { roles, lastUpdate, newToday, activeSources } = await fetchRecruitingRoles({ days: 90, limit: 500 })
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
