// Reference to vite/client removed to fix "Cannot find type definition file" error
// /// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_KEY: string;
  readonly VITE_AUTH_DOMAIN: string;
  readonly VITE_PROJECT_ID: string;
  readonly VITE_STORAGE_BUCKET: string;
  readonly VITE_MESSAGING_SENDER_ID: string;
  readonly VITE_APP_ID: string;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}