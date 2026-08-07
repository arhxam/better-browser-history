export const PRODUCTION_PERMISSIONS = [
  'tabs',
  'webNavigation',
  'unlimitedStorage',
  'idle',
  'alarms',
  'contextMenus',
];

export function getManifestSafetyErrors(manifest) {
  const errors = [];
  const overrides = manifest.chrome_url_overrides || {};

  if (overrides.newtab) {
    errors.push('chrome_url_overrides.newtab must not be set');
  }

  if (Object.keys(overrides).some((key) => key !== 'history')) {
    errors.push('chrome_url_overrides may only contain history');
  }

  if (manifest.chrome_settings_overrides) {
    errors.push('chrome_settings_overrides must not be set');
  }

  const actualPermissions = Array.isArray(manifest.permissions) ? manifest.permissions : [];
  const approved = new Set(PRODUCTION_PERMISSIONS);
  if (
    actualPermissions.length !== PRODUCTION_PERMISSIONS.length
    || actualPermissions.some((permission) => !approved.has(permission))
    || PRODUCTION_PERMISSIONS.some((permission) => !actualPermissions.includes(permission))
  ) {
    errors.push('permissions must exactly match the production allowlist');
  }

  return errors;
}
