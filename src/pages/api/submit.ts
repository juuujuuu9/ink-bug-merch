import type { APIRoute } from 'astro';
import { sql } from '../../lib/db';
import { uploadToBunny } from '../../lib/bunny';
import { sendEmail } from '../../lib/email';

const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/vnd.adobe.photoshop',
  'application/postscript',
]);
const ACCEPTED_EXTS = /\.(ai|jpg|jpeg|pdf|psd|png)$/i;
const MAX_FILE_BYTES = 104_857_600; // 100 MB

function safeFileName(name: string): string {
  const base = name.replace(/[/\\:*?"<>|]/g, '_').slice(0, 200);
  return base || `file-${Date.now()}`;
}

function getString(fd: FormData, name: string): string {
  const v = fd.get(name);
  return v instanceof File ? '' : (v as string | null) ?? '';
}

export const POST: APIRoute = async ({ request }): Promise<Response> => {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('multipart/form-data')) {
    return new Response(
      JSON.stringify({ error: 'Content-Type must be multipart/form-data' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let fd: FormData;
  try {
    fd = await request.formData();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid form data' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const required = [
    'firstName',
    'lastName',
    'phone',
    'email',
    'shipping',
    'projectName',
    'rush',
    'apparelType',
    'blanks',
    'totalItems',
    'printLocations',
  ] as const;
  for (const key of required) {
    const v = getString(fd, key);
    if (!v.trim()) {
      return new Response(
        JSON.stringify({ error: `Missing or empty: ${key}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  const totalItems = Number(getString(fd, 'totalItems'));
  if (!Number.isInteger(totalItems) || totalItems < 1) {
    return new Response(
      JSON.stringify({ error: 'totalItems must be an integer >= 1' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const dueDateRaw = getString(fd, 'dueDate');
  const dueDate = dueDateRaw.trim() || null;

  const inkColorsRaw = getString(fd, 'inkColors');
  const inkColors =
    inkColorsRaw.trim() !== ''
      ? Number(inkColorsRaw)
      : null;

  const inkColorsAdditionalRaw = getString(fd, 'inkColorsAdditional');
  const inkColorsAdditional =
    inkColorsAdditionalRaw.trim() !== ''
      ? Number(inkColorsAdditionalRaw)
      : null;

  const artworkFiles = (fd.getAll('artwork') as File[]).filter(
    (f): f is File => f instanceof File && f.size > 0
  );

  for (const file of artworkFiles) {
    if (file.size > MAX_FILE_BYTES) {
      return new Response(
        JSON.stringify({ error: `File too large: ${file.name} (max 100 MB)` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : '';
    if (!ACCEPTED_EXTS.test(`.${ext}`) && !ACCEPTED_TYPES.has(file.type)) {
      return new Response(
        JSON.stringify({
          error: `Invalid file type: ${file.name} (accepted: ai, jpg, jpeg, pdf, psd, png)`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  let entryId: string;
  try {
    const rows = await sql`
      INSERT INTO entries (
        first_name, last_name, phone, email, shipping, project_name, rush,
        due_date, apparel_type, blanks, total_items, size_breakdown, brand_style,
        garment_color, ink_type, print_locations, location_1, ink_colors, ink_colors_additional
      ) VALUES (
        ${getString(fd, 'firstName').trim()},
        ${getString(fd, 'lastName').trim()},
        ${getString(fd, 'phone').trim()},
        ${getString(fd, 'email').trim()},
        ${getString(fd, 'shipping').trim()},
        ${getString(fd, 'projectName').trim()},
        ${getString(fd, 'rush').trim()},
        ${dueDate},
        ${getString(fd, 'apparelType').trim()},
        ${getString(fd, 'blanks').trim()},
        ${totalItems},
        ${(v => (v.trim() ? v.trim() : null))(getString(fd, 'sizeBreakdown'))},
        ${(v => (v.trim() ? v.trim() : null))(getString(fd, 'brandStyle'))},
        ${(v => (v.trim() ? v.trim() : null))(getString(fd, 'garmentColor'))},
        ${(v => (v.trim() ? v.trim() : null))(getString(fd, 'inkType'))},
        ${getString(fd, 'printLocations').trim()},
        ${(v => (v.trim() ? v.trim() : null))(getString(fd, 'location1'))},
        ${inkColors},
        ${inkColorsAdditional}
      )
      RETURNING id
    `;
    const row = rows[0] as { id: string } | undefined;
    if (!row?.id) {
      throw new Error('Insert did not return id');
    }
    entryId = row.id;
  } catch (err) {
    console.error('DB insert failed:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to save submission. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const artworkUrls: string[] = [];
  if (artworkFiles.length > 0) {
    const path = `artwork/${entryId}`;
    for (let i = 0; i < artworkFiles.length; i++) {
      const file = artworkFiles[i];
      const ext = file.name.includes('.') ? file.name.split('.').pop() ?? 'bin' : 'bin';
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'file';
      const fileName = `${safeFileName(baseName)}-${i}.${ext}`;
      try {
        const buf = await file.arrayBuffer();
        const url = await uploadToBunny(
          buf,
          path,
          fileName,
          file.type || 'application/octet-stream'
        );
        artworkUrls.push(url);
      } catch (err) {
        console.error('Bunny upload failed:', err);
        return new Response(
          JSON.stringify({ error: 'Failed to upload artwork. Please try again.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    if (artworkUrls.length > 0) {
      await sql`
        UPDATE entries SET artwork_urls = ${artworkUrls} WHERE id = ${entryId}
      `;
    }
  }

  const adminEmailRaw = import.meta.env.ADMIN_EMAIL as string | undefined;
  const adminEmails = adminEmailRaw
    ? adminEmailRaw.split(',').map((e) => e.trim()).filter(Boolean)
    : [];
  if (adminEmails.length > 0) {
    const projectName = getString(fd, 'projectName').trim();
    const customerName = `${getString(fd, 'firstName').trim()} ${getString(fd, 'lastName').trim()}`;
    const customerEmail = getString(fd, 'email').trim();
    const artworkLinks = artworkUrls
      .map((u) => `<a href="${u}">${u.split('/').pop()}</a>`)
      .join('<br/>');
    try {
      await sendEmail({
        to: adminEmails,
        subject: `New Quote Request: ${projectName} (${customerName})`,
        html: `
          <p><strong>New quote request submitted</strong></p>
          <p><strong>Project:</strong> ${projectName}</p>
          <p><strong>Customer:</strong> ${customerName}</p>
          <p><strong>Email:</strong> <a href="mailto:${customerEmail}">${customerEmail}</a></p>
          <p><strong>Phone:</strong> ${getString(fd, 'phone').trim()}</p>
          <p><strong>Shipping:</strong> ${getString(fd, 'shipping').trim()}</p>
          <p><strong>Rush:</strong> ${getString(fd, 'rush').trim()}</p>
          <p><strong>Apparel:</strong> ${getString(fd, 'apparelType').trim()} | Blanks: ${getString(fd, 'blanks').trim()}</p>
          <p><strong>Total items:</strong> ${totalItems}</p>
          ${artworkUrls.length > 0 ? `<p><strong>Artwork:</strong><br/>${artworkLinks}</p>` : ''}
        `,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Admin email failed:', msg, err);
      // Do not fail the request; submission was saved
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
