
import type {NextConfig} from 'next';
import withSerwist from '@serwist/next';

const withPWAConfig = withSerwist({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV === 'development',
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

export default withPWAConfig(nextConfig);
