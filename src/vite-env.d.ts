/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_RECAPTCHA_SITE_KEY: string
  readonly VITE_RECAPTCHA_SECRET_KEY: string
  readonly VITE_RECAPTCHA_VERSION: 'v2' | 'v3'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
