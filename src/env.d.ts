/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly RESEND_API_KEY: string;
  readonly RESEND_FROM?: string;
  readonly DATABASE_URL: string;
  readonly BUNNY_STORAGE_REGION?: string;
  readonly BUNNY_STORAGE_ZONE?: string;
  readonly BUNNY_STORAGE_PASSWORD?: string;
  readonly BUNNY_CDN_HOST?: string;
  readonly ADMIN_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
