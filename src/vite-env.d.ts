/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_BYPASS_AUTH?: string;
  readonly VITE_BYPASS_AUTH_EMAIL?: string;
  readonly VITE_BYPASS_AUTH_USER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
