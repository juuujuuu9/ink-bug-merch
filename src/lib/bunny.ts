/**
 * Upload a file to Bunny Storage and return its CDN URL.
 * Requires: BUNNY_STORAGE_REGION, BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, BUNNY_CDN_HOST
 */
export async function uploadToBunny(
  buffer: ArrayBuffer,
  path: string,
  fileName: string,
  contentType: string
): Promise<string> {
  const region = import.meta.env.BUNNY_STORAGE_REGION as string;
  const zone = import.meta.env.BUNNY_STORAGE_ZONE as string;
  const password = import.meta.env.BUNNY_STORAGE_PASSWORD as string;
  const cdnHost = import.meta.env.BUNNY_CDN_HOST as string;

  if (!region || !zone || !password || !cdnHost) {
    throw new Error('Bunny Storage env vars missing: BUNNY_STORAGE_REGION, BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD, BUNNY_CDN_HOST');
  }

  const base =
    !region || region === 'de' || region === 'storage'
      ? 'https://storage.bunnycdn.com'
      : `https://${region}.storage.bunnycdn.com`;
  const url = path ? `${base}/${zone}/${path}/${fileName}` : `${base}/${zone}/${fileName}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      AccessKey: password,
      'Content-Type': contentType || 'application/octet-stream',
    },
    body: buffer,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bunny upload failed ${res.status}: ${text}`);
  }

  const cdnPath = path ? `${path}/${fileName}` : fileName;
  return `https://${cdnHost}/${cdnPath}`;
}
