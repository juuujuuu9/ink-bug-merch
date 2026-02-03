# InkBugMerch

Astro site with React, Tailwind CSS, Resend (email), and Neon (Postgres).

## Stack

- **Astro** – static + server (hybrid)
- **React** – UI components
- **Tailwind CSS** – styling
- **Resend** – transactional email
- **Neon** – serverless Postgres

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Environment variables**

   Copy `.env.example` to `.env` and fill in your keys:

   ```bash
   cp .env.example .env
   ```

   - **Resend**: [resend.com](https://resend.com) → API key and (optional) `RESEND_FROM`
   - **Neon**: [neon.tech](https://neon.tech) → connection string as `DATABASE_URL`

3. **Run dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:4321](http://localhost:4321).

## Project structure

```
src/
├── layouts/
│   └── Layout.astro      # Shared layout + Tailwind
├── lib/
│   ├── email.ts          # Resend client & sendEmail()
│   └── db.ts             # Neon SQL client
├── pages/
│   └── index.astro
└── styles/
    └── global.css
```

## Using Resend

In server-side code (e.g. API routes or server-rendered pages):

```ts
import { sendEmail } from '../lib/email';

await sendEmail({
  to: 'user@example.com',
  subject: 'Hello',
  html: '<p>Hello from InkBugMerch</p>',
});
```

## Using Neon

In server-side code:

```ts
import { sql } from '../lib/db';

const rows = await sql`SELECT * FROM your_table`;
```

Add API routes under `src/pages/api/` (e.g. `src/pages/api/contact.ts`) and use `sendEmail` or `sql` there. In each server route file, add `export const prerender = false` so the route runs on the server.

## Commands

| Command           | Action                    |
| ----------------- | ------------------------- |
| `npm run dev`     | Dev server (localhost:4321) |
| `npm run build`   | Production build          |
| `npm run preview` | Preview production build  |
