/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/projects',
        permanent: false,
      },
      {
        source: '/create',
        destination: '/projects/new',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
