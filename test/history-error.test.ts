import { describe, expect, it } from 'vitest';
import { historyErrorMessage } from '../src/ui/app/history-error';

describe('history load errors', () => {
  it('preserves a useful Error message', () => {
    expect(historyErrorMessage(new Error('IndexedDB is unavailable'))).toBe('IndexedDB is unavailable');
  });

  it('returns a stable message for unknown failures', () => {
    expect(historyErrorMessage({ reason: 'unknown' })).toBe(
      'Unable to load local history. Your stored data was not changed.',
    );
  });
});
