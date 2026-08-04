// Shared UI bootstrap. In `?demo=1` mode (used for local preview and
// screenshots), seed sample data into IndexedDB so the surfaces render without
// loading the unpacked extension. In the real extension there is no demo param,
// so live captured data is shown untouched.
export async function bootstrap(): Promise<void> {
  const params = new URLSearchParams(location.search);
  if (params.get('demo') === '1') {
    const { seedIfEmpty } = await import('../../db/seed');
    await seedIfEmpty();
  }
}
