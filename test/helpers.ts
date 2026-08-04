import type { Visit } from '../src/core/types';

const MIN = 60 * 1000;

/** Build a Visit with sensible defaults for tests. */
export function visit(partial: Partial<Visit> & { id: string; timestamp: number }): Visit {
  return {
    url: `https://example.com/${partial.id}`,
    host: 'example.com',
    title: partial.id,
    transition: 'link',
    tabId: 1,
    ...partial,
  };
}

export const T0 = Date.UTC(2026, 0, 1, 9, 0, 0); // fixed base instant
export { MIN };
