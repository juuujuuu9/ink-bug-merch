# InkBugMerch

**Marketing site and quote-request flow for a screen-printing shop** (Hanover County, Virginia). Customers submit contact and project details, optionally upload artwork, and the business receives structured submissions in the database plus email notifications with links to the uploaded files.

**Live site:** [inkbugmerch.com](https://inkbugmerch.com)

---

## Purpose

Ink Bug Merch needed a single place to capture quote requests and artwork instead of scattered emails and forms. This app provides:

- A **landing/marketing page** with clear branding and a single call-to-action: request a quote.
- A **structured quote form** (contact, shipping vs pickup, project details, apparel type, print locations, rush vs normal, due date, etc.) with conditional sections (e.g. address fields only when “Ship to me” is selected).
- **Artwork uploads** (AI, JPG, PDF, PSD, PNG up to 100 MB) stored on a CDN with URLs saved in the database so the shop can access files reliably.
- **Admin notifications** via email on each submission, including links to artwork.
- **Persistent storage** of every submission in Postgres for follow-up and record-keeping.

Built as a small, maintainable full-stack app with no unnecessary complexity—suitable for a single business and as a portfolio piece demonstrating end-to-end delivery (front-end, API, database, file storage, email, SEO).

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | [Astro](https://astro.build) 5 (hybrid/SSR) |
| **UI** | [React](https://react.dev) 19, [Tailwind CSS](https://tailwindcss.com) 4 |
| **Language** | TypeScript (strict, no `any`) |
| **Hosting** | [Vercel](https://vercel.com) (serverless) |
| **Database** | [Neon](https://neon.tech) (serverless Postgres) |
| **Email** | [Resend](https://resend.com) (transactional) |
| **File storage / CDN** | [Bunny CDN](https://bunny.net) (artwork uploads) |
| **Runtime** | Node (Vercel serverless) |

---

## Architecture

- **Rendering:** Astro in `output: 'server'` mode with the Vercel adapter. The main page is server-rendered; the form is progressive (works without JS, enhanced with `fetch` for submit).
- **Data flow:**
  1. User fills the form (contact, shipping, project, print options, optional artwork files).
  2. Form submits via `POST /api/submit` (multipart/form-data).
  3. **API route** (`src/pages/api/submit.ts`):
     - Validates required fields and file types/sizes.
     - Inserts a row into **Neon** `entries` table; gets back `id`.
     - Uploads each artwork file to **Bunny Storage** under `artwork/{entryId}/`, then updates the row’s `artwork_urls` array with CDN URLs.
     - Sends an **admin notification email** via Resend (if `ADMIN_EMAIL` is set), including links to artwork. Email failure does not fail the request.
  4. Response: `{ ok: true }` or `{ error: "..." }`. The client shows success state or an error message.
- **SEO:** Layout provides meta description, canonical URL, Open Graph and Twitter Card tags, theme-color. Home page includes Schema.org `LocalBusiness` JSON-LD. `sitemap.xml` is generated at `/sitemap.xml` for crawlers.
- **No separate backend repo:** one Astro app contains the site and the API route; all secrets live in environment variables (Vercel, `.env` locally).

---

## Problems Solved

| Problem | Approach |
|---------|----------|
| **Lead capture** | Single form with validation; all submissions stored in Postgres with UUID and `created_at`. |
| **Large file uploads** | Files sent to API, then uploaded to Bunny Storage; only CDN URLs stored in DB. Accepts AI, JPG, PDF, PSD, PNG; 100 MB max per file. |
| **Reliable access to artwork** | Artwork stored on Bunny CDN; admin email includes direct links so the shop can open files without logging into a dashboard. |
| **Admin awareness** | Resend sends a summary email to `ADMIN_EMAIL` on each submission (project name, customer, contact, shipping, rush, apparel, total items, artwork links). |
| **Conditional form UX** | Address block shown only when “Ship to me” is selected; “Describe additional print locations” shown only when “Multiple locations” is selected. Implemented with minimal inline script and `aria-hidden` for accessibility. |
| **Duplicate submissions / UX** | Form hidden after success; submit button disabled and shows “Sending…” during request. |
| **Discoverability** | Schema.org LocalBusiness, sitemap, favicons, and social meta tags so the site is usable in search and when shared. |
| **Strict typing** | TypeScript throughout; no `any`; explicit return types on exports (per project rules). |

---

## Project Structure

```
src/
├── layouts/
│   └── Layout.astro       # HTML shell, meta tags, OG/Twitter, global CSS
├── lib/
│   ├── db.ts              # Neon SQL client (serverless driver)
│   ├── email.ts           # Resend client & sendEmail()
│   └── bunny.ts           # uploadToBunny() → CDN URL
├── pages/
│   ├── index.astro        # Home: hero, quote form, footer, inline form script
│   ├── api/
│   │   └── submit.ts      # POST handler: validate → DB → Bunny → email → JSON
│   └── sitemap.xml.ts     # Dynamic sitemap (GET)
└── styles/
    └── global.css         # Tailwind entry
scripts/
├── schema.sql             # Create entries table (Neon)
├── migration-artwork-urls.sql   # Add artwork_urls column if needed
└── generate-favicons.mjs  # Favicon set from source image
public/                    # Static assets, favicons, robots.txt
```

---

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env` and set:

   - **Resend:** `RESEND_API_KEY`, optional `RESEND_FROM` — [resend.com](https://resend.com)
   - **Neon:** `DATABASE_URL` (Postgres connection string) — [neon.tech](https://neon.tech)
   - **Bunny:** `BUNNY_STORAGE_REGION`, `BUNNY_STORAGE_ZONE`, `BUNNY_STORAGE_PASSWORD`, `BUNNY_CDN_HOST` — [bunny.net](https://bunny.net)
   - **Admin:** `ADMIN_EMAIL` (comma-separated for multiple) — receives notification on each submission

3. **Database**

   In the [Neon SQL Editor](https://neon.tech/docs/connect/sql-editor), run:

   - New project: `scripts/schema.sql` to create the `entries` table.
   - Existing table without `artwork_urls`: `scripts/migration-artwork-urls.sql`.

4. **Run dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:4321](http://localhost:4321).

---

## Commands

| Command | Action |
|--------|--------|
| `npm run dev` | Dev server (localhost:4321) |
| `npm run build` | Production build (Vercel-ready) |
| `npm run preview` | Preview production build locally |
| `npm run favicons` | Regenerate favicons from source image |

---

## Using Resend (server-side)

```ts
import { sendEmail } from '../lib/email';

await sendEmail({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hello from InkBugMerch</p>',
});
```

## Using Neon (server-side)

```ts
import { sql } from '../lib/db';

const rows = await sql`SELECT * FROM entries ORDER BY created_at DESC`;
```

## Using Bunny (server-side)

```ts
import { uploadToBunny } from '../lib/bunny';

const url = await uploadToBunny(
  buffer,           // ArrayBuffer
  'artwork/entry-id',
  'filename.pdf',
  'application/pdf'
);
// url = full CDN URL
```

API routes live under `src/pages/api/`. Add `export const prerender = false` so the route runs on the server (Vercel serverless). The existing `submit.ts` route is already server-rendered.

---

## Credits

- **Client:** Ink Bug Merch (Hanover County, VA)
- **Website:** [Thoughtform Worldwide](https://www.thoughtform.world)
