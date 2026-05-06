/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/candidates',
        destination: '/busco-trabajo',
        permanent: true, // 308 — preserves legacy bookmarks for the public job board
      },
    ]
  },
}

module.exports = nextConfig
