export const PRODUCTION_PERMISSIONS = [
  'webNavigation',
  'unlimitedStorage',
  'idle',
  'alarms',
  'contextMenus',
];

export const PRODUCTION_HOST_PERMISSIONS = ['http://*/*', 'https://*/*'];

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

  if (manifest.web_accessible_resources) {
    errors.push('web_accessible_resources must not be set');
  }

  if (typeof manifest.description !== 'string' || manifest.description.length < 1 || manifest.description.length > 132) {
    errors.push('description must be between 1 and 132 characters');
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

  const actualHosts = Array.isArray(manifest.host_permissions) ? manifest.host_permissions : [];
  const approvedHosts = new Set(PRODUCTION_HOST_PERMISSIONS);
  if (
    actualHosts.length !== PRODUCTION_HOST_PERMISSIONS.length
    || actualHosts.some((permission) => !approvedHosts.has(permission))
    || PRODUCTION_HOST_PERMISSIONS.some((permission) => !actualHosts.includes(permission))
  ) {
    errors.push('host_permissions must be limited to HTTP and HTTPS pages');
  }

  return errors;
}
