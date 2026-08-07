import { describe, expect, it, vi } from 'vitest';
import { createCaptureController } from '../src/content/capture-controller';

describe('capture controller', () => {
  it('stays inert until enabled and starts only once', () => {
    const stop = vi.fn();
    const start = vi.fn(() => stop);
    const controller = createCaptureController(start);

    expect(start).not.toHaveBeenCalled();
    controller.update(false);
    expect(start).not.toHaveBeenCalled();
    controller.update(true);
    controller.update(true);
    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).not.toHaveBeenCalled();
  });

  it('stops once when disabled or disposed', () => {
    const firstStop = vi.fn();
    const secondStop = vi.fn();
    const start = vi.fn()
      .mockReturnValueOnce(firstStop)
      .mockReturnValueOnce(secondStop);
    const controller = createCaptureController(start);

    controller.update(true);
    controller.update(false);
    controller.update(false);
    expect(firstStop).toHaveBeenCalledTimes(1);

    controller.update(true);
    controller.dispose();
    controller.dispose();
    expect(secondStop).toHaveBeenCalledTimes(1);
  });
});
