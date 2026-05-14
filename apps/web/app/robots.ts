import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/rooms', '/reserve', '/amenities', '/contact', '/manage-booking'],
        disallow: ['/admin/', '/login', '/register', '/qr/'],
      },
    ],
    sitemap: 'https://royalsuitesnp.com/sitemap.xml',
  };
}
