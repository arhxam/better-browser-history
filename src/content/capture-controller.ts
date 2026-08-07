export interface CaptureController {
  update(enabled: boolean): void;
  dispose(): void;
}

export function createCaptureController(start: () => () => void): CaptureController {
  let stop: (() => void) | null = null;

  function update(enabled: boolean) {
    if (enabled && !stop) {
      stop = start();
    } else if (!enabled && stop) {
      const cleanup = stop;
      stop = null;
      cleanup();
    }
  }

  return {
    update,
    dispose: () => update(false),
  };
}
