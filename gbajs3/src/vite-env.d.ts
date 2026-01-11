/// <reference types="vite/client" />

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- extending type
interface ImportMetaEnv {
  readonly VITE_GBA_SERVER_LOCATION: string;
  readonly VITE_GBA_RELEASE_VERSION?: string;
}
