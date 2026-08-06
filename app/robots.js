export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/internal/', '/login', '/api/', '/gmail', '/busco-trabajo/actualizar-datos'],
    },
    sitemap: 'https://tools.wearebondy.com/sitemap.xml',
    host: 'https://tools.wearebondy.com',
  }
}
