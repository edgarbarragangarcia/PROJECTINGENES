
import type {NextConfig} from 'next';

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  // TEMPORARY FIX for Cloud Workstation CORS issue.
  // This disables PWA features. Remember to revert this for production.
  disable: true,
  // disable: process.env.NODE_ENV === 'development',
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'ytljrvcjstbuhrdothhf.supabase.co',
      }
    ],
  },
};

export default withPWA(nextConfig);
