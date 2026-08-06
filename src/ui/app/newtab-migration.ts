export interface RuntimeReloader {
  reload: () => void;
}

/** Drop Brave/Chrome's cached legacy New Tab registration by reloading MV3. */
export function migrateLegacyNewTab(runtime: RuntimeReloader): void {
  runtime.reload();
}
