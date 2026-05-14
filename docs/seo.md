# Royal Suites — SEO Implementation

**Session date:** 2026-05-14  
**Live URL:** https://royalsuitesnp.com

---

## What Was Done

### 1. Root Layout Metadata (`apps/web/app/layout.tsx`)
Full Next.js 14 `Metadata` object added with:
- `metadataBase` set to `https://royalsuitesnp.com`
- `title.template` — pages auto-get `"Page Title | Royal Suites Kathmandu"`
- `description` — mentions 27 rooms, Cleopatra's Spa, restaurant & bar, QR guest portal
- `keywords` — includes "boutique hotel Kathmandu", "smart hotel Nepal", "hotel QR room service Kathmandu", etc.
- **Open Graph** — type, locale, siteName, image (`/hero-bg.jpg` 1200×630)
- **Twitter card** — `summary_large_image`
- `alternates.canonical` — `https://royalsuitesnp.com`
- `robots` — `index: true, follow: true`

### 2. Per-Page Metadata

| Page | File | Type |
|------|------|------|
| Homepage | `app/(public)/page.tsx` | Server component — `export const metadata` |
| Rooms | `app/(public)/rooms/layout.tsx` *(new)* | Layout wrapper (rooms page is client component) |
| Amenities | `app/(public)/amenities/page.tsx` | Server component — `export const metadata` |
| Reserve | `app/(public)/reserve/layout.tsx` *(new)* | Layout wrapper (reserve page is client component) |
| Contact | `app/(public)/contact/layout.tsx` *(new)* | Layout wrapper (contact page is client component) |

**Note:** Client components (`'use client'`) cannot export `metadata` directly. A thin `layout.tsx` wrapper in the same route segment is used instead.

### 3. Sitemap (`apps/web/app/sitemap.ts`) *(new)*
Auto-generates `/sitemap.xml` via Next.js `MetadataRoute.Sitemap`.

Routes included:

| URL | Priority | Change Frequency |
|-----|----------|-----------------|
| `/` | 1.0 | weekly |
| `/rooms` | 0.9 | weekly |
| `/reserve` | 0.9 | monthly |
| `/amenities` | 0.8 | monthly |
| `/contact` | 0.7 | monthly |
| `/manage-booking` | 0.5 | monthly |

### 4. Robots (`apps/web/app/robots.ts`) *(new)*
Auto-generates `/robots.txt`. Blocks crawlers from:
- `/admin/`
- `/login`
- `/register`
- `/qr/`

Points crawlers to `https://royalsuitesnp.com/sitemap.xml`.

### 5. noindex on Auth Pages (`apps/web/app/(auth)/layout.tsx`) *(new)*
Login and register pages are marked `robots: { index: false, follow: false }` so they never appear in Google search results.

### 6. Hotel JSON-LD Structured Data (Homepage)
Injected via `<script type="application/ld+json">` in `app/(public)/page.tsx`.

Schema types used:
- `Hotel` — name, URL, logo, image, description, phone, email, address, geo-coordinates, check-in/out times, star rating, price range, number of rooms, amenity features, map link
- `WebSite` — linked to the Hotel entity via `@id`

**Amenity features declared in JSON-LD:**
- Cleopatra's Spa
- Rooftop Infinity Pool
- Restaurant & Bar
- Free Wi-Fi
- 24/7 Butler Service
- Steam Room & Sauna
- Fitness Centre
- 24-Hour Front Desk
- QR Guest Portal
- In-Room Digital Dining Order
- Live Billing via QR
- In-Room Spa Booking
- Digital Quick Services

### 7. Landing Page Copy Fix
The hero tagline was updated to accurately reflect that Royal Suites is an **Egyptian-themed hotel in Kathmandu**, not a hotel in Egypt.

**Before:**
> "Experience the grandeur of ancient Egypt reimagined for the modern traveler. Where timeless luxury meets pharaonic splendor."

**After:**
> "Experience the grandeur of an Egyptian-inspired sanctuary in the heart of Kathmandu. Scan your room QR to order food, book the spa, track your bill, and request services — all from your phone."

CTA section also updated:
- Before: *"Your pharaoh's sanctuary awaits."*
- After: *"Your royal sanctuary in Kathmandu awaits."*

---

## Files Changed / Created

### Modified
- `apps/web/app/layout.tsx` — root metadata
- `apps/web/app/(public)/page.tsx` — homepage metadata + JSON-LD + copy fix
- `apps/web/app/(public)/amenities/page.tsx` — amenities metadata
- `apps/web/app/(public)/rooms/page.tsx` — comment noting client component pattern

### Created
- `apps/web/app/sitemap.ts`
- `apps/web/app/robots.ts`
- `apps/web/app/(auth)/layout.tsx`
- `apps/web/app/(public)/rooms/layout.tsx`
- `apps/web/app/(public)/reserve/layout.tsx`
- `apps/web/app/(public)/contact/layout.tsx`
- `docs/seo.md` ← this file

---

## Session 2 Updates (2026-05-14) — Thamel & Guest Types

### Problem fixed
Original SEO never mentioned **Thamel** (the hotel's actual neighbourhood) or the guest types it serves. Searches like "couple friendly hotel Thamel" or "family hotel Kathmandu" would not match.

### Changes made
- Sitewide title changed to: *"Luxury Hotel & Spa in Thamel, Kathmandu"*
- Keywords expanded to include:
  - `luxury hotel Thamel`, `boutique hotel Thamel Kathmandu`, `hotel in Thamel`
  - `couple friendly hotel Thamel`, `romantic hotel Thamel`, `honeymoon hotel Kathmandu`
  - `family friendly hotel Kathmandu`
  - `business hotel Thamel`
  - `comfortable hotel Kathmandu`, `smart hotel Thamel`
- JSON-LD `Hotel` schema updated:
  - `streetAddress` changed from `"Kathmandu"` to `"Thamel"`
  - `addressRegion` added: `"Bagmati Province"`
  - `audience` array added: Couples, Families, Business Travellers, Solo Travellers
  - `tourBookingPage` added: `https://royalsuitesnp.com/reserve`
- All per-page metadata (rooms, reserve, contact, amenities) updated with Thamel + guest-type language

### Target searches now covered
| Search | Covered by |
|--------|-----------|
| "luxury hotel Thamel" | Title, keywords, JSON-LD |
| "smart hotel Kathmandu" | Keywords, description |
| "comfortable hotel Thamel" | Keywords |
| "couple friendly hotel Thamel" | Keywords, JSON-LD audience |
| "family friendly hotel Kathmandu" | Keywords, JSON-LD audience |
| "honeymoon hotel Kathmandu" | Keywords |
| "business hotel Thamel" | Keywords, JSON-LD audience |
| "hotel with spa Thamel" | Keywords, amenities metadata |

---

## What To Do Next (if needed)

- **Submit sitemap to Google Search Console** — go to [search.google.com/search-console](https://search.google.com/search-console), add property `royalsuitesnp.com`, and submit `https://royalsuitesnp.com/sitemap.xml`
- **Test structured data** — use [Google's Rich Results Test](https://search.google.com/test/rich-results) with `https://royalsuitesnp.com`
- **Test Open Graph** — use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) or [opengraph.xyz](https://www.opengraph.xyz/) with the live URL
- **Google Business Profile** — register on Google Business to appear in Google Maps and the hotel panel — this is the single biggest thing you can do right now for local searches
- **Add individual room-level metadata** — `app/(public)/rooms/[slug]/page.tsx` could use `generateMetadata()` to produce per-room titles/descriptions dynamically from the API
- **Core Web Vitals** — run Lighthouse on the live site; images already use Next.js `<Image>` (auto-optimised). Check LCP on mobile.

---

## Hotel Details Used in SEO

| Field | Value |
|-------|-------|
| Name | Royal Suites Boutique Hotel & Spa |
| URL | https://royalsuitesnp.com |
| Neighbourhood | Thamel |
| Location | Kathmandu 44600, Nepal |
| Region | Bagmati Province |
| Phone | +977 982 865 1525 |
| Email | royalsuitesboutiquehotel2025@gmail.com |
| Check-in | 3:00 PM |
| Check-out | 12:00 PM |
| Rooms | 27 across 5 floors |
| Guest types | Couples, Families, Business Travellers, Solo Travellers |
| Categories | Superior King, Superior Twin, Executive Suite Twin, Deluxe King Suite, Junior Suite, Suite with City View, Presidential Suite |
| Price range | $230–$1,200/night |
