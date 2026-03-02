/** @type {import('next').NextConfig} */
const parseAllowed = () => {
  const env = process.env.NEXT_DEV_ALLOWED_ORIGINS || '';
  const extra = env.split(',').map(s => s.trim()).filter(Boolean);
  // Always include localhost for dev
  return ['http://localhost:3000', ...extra];
};
const nextConfig = {
  devIndicators: { buildActivity: false },
  allowedDevOrigins: parseAllowed(),
  async rewrites() {
    const apiTarget = process.env.NEXT_PUBLIC_API_TARGET || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
