/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['192.168.18.156', '192.168.18.4', '192.168.101.137'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },
};

module.exports = nextConfig;
