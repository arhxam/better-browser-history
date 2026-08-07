const FALLBACK_HISTORY_ERROR = 'Unable to load local history. Your stored data was not changed.';

export function historyErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return FALLBACK_HISTORY_ERROR;
}
