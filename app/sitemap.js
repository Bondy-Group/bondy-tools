export default function sitemap() {
  const base = 'https://tools.wearebondy.com'
  const now = new Date().toISOString()
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/busco-trabajo`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/busco-trabajo/jobs-tech`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/busco-trabajo/pulse`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/recursos-recruiters`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/recursos-recruiters/busco-trabajo`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/recursos-recruiters/pulse`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/hiring-strategy`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/hiring-strategy/pulse`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
  ]
}
