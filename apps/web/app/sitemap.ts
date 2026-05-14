import type { MetadataRoute } from 'next';

const BASE = 'https://royalsuitesnp.com';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE,                      lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE}/rooms`,           lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
    { url: `${BASE}/reserve`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${BASE}/amenities`,       lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/contact`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/manage-booking`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];
}
