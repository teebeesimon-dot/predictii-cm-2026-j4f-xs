/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep Firebase Admin and its auth dependencies out of Next.js/Turbopack bundling.
  serverExternalPackages: ['firebase-admin'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
