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

  return errors;
}
