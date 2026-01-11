/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/chat',
        destination: '/chat/'
      }
    ]
  }
}

module.exports = nextConfig