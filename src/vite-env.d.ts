/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TELEGRAM_TOKEN: string
  readonly VITE_ADMIN_ID: string
  readonly VITE_ADMIN_CODE: string
  readonly VITE_REF_LINK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
