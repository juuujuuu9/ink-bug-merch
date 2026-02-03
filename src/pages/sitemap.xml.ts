import type { APIRoute } from 'astro';

/** Sitemap for crawlers. Add more URLs here when you add pages. */
export const GET: APIRoute = async ({ request }): Promise<Response> => {
  const origin = new URL(request.url).origin;
  const pages = ['/'];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((path) => `  <url><loc>${origin}${path}</loc></url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  });
};
