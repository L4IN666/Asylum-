import { describe, expect, it } from 'vitest';
import { buildShuffledOrder, clampIndex, getNextIndex, getPreviousIndex, shouldAutoSkipAfterError } from './playerState';

describe('playerState', () => {
  it('clamps indexes safely', () => {
    expect(clampIndex(-5, 4)).toBe(0);
    expect(clampIndex(10, 4)).toBe(3);
    expect(clampIndex(1, 0)).toBe(-1);
  });

  it('manual next ignores repeat one while automatic ended repeats current', () => {
    expect(getNextIndex(3, 1, 'one', false, [], true)).toBe(2);
    expect(getNextIndex(3, 1, 'one', false, [], false)).toBe(1);
  });

  it('repeat-one automatic behavior is consistent when shuffle is enabled', () => {
    expect(getNextIndex(3, 1, 'one', true, [1, 2, 0], false)).toBe(1);
    expect(getNextIndex(3, 1, 'one', true, [1, 2, 0], true)).toBe(2);
  });

  it('ends playback at last track when repeat is off', () => {
    expect(getNextIndex(3, 2, 'off', false)).toBe(-1);
  });

  it('loops to the start when repeat all is enabled', () => {
    expect(getNextIndex(3, 2, 'all', false)).toBe(0);
  });

  it('keeps repeat-all on a single queue and stops when repeat is off', () => {
    expect(getNextIndex(1, 0, 'all', false)).toBe(0);
    expect(getNextIndex(1, 0, 'one', false)).toBe(0);
    expect(getNextIndex(1, 0, 'off', false)).toBe(-1);
  });

  it('uses a deterministic shuffled order instead of random probability', () => {
    const randomValues = [0.9, 0.2, 0.8];
    const order = buildShuffledOrder(4, () => randomValues.shift() ?? 0.5);
    expect(order).toEqual([2, 1, 0, 3]);
  });

  it('previous and next use a consistent history stack A → B → C → previous → next sequence', () => {
    expect(getNextIndex(3, 0, 'off', false, [], true)).toBe(1);
    expect(getNextIndex(3, 1, 'off', false, [], true)).toBe(2);
    expect(getPreviousIndex(3, 2, [0, 1], 'off')).toBe(1);
    expect(getPreviousIndex(3, 1, [0], 'off')).toBe(0);
    expect(getNextIndex(3, 0, 'off', false, [], true)).toBe(1);
    expect(getNextIndex(3, 1, 'off', false, [], true)).toBe(2);
  });

  it('shuffle tracks a stable play order and respects repeat-all boundaries', () => {
    const order = [2, 0, 1, 3];
    expect(getNextIndex(4, 2, 'off', true, order, true)).toBe(0);
    expect(getNextIndex(4, 3, 'off', true, order, true)).toBe(-1);
    expect(getNextIndex(4, 3, 'all', true, order, true)).toBe(2);
    expect(getPreviousIndex(4, 0, [], 'all', true, order)).toBe(2);
  });

  it('stops auto-skip after a repeated failed track and a small retry budget', () => {
    expect(shouldAutoSkipAfterError(0, 'track-1', null)).toBe(true);
    expect(shouldAutoSkipAfterError(1, 'track-1', 'track-2')).toBe(true);
    expect(shouldAutoSkipAfterError(2, 'track-1', 'track-2')).toBe(true);
    expect(shouldAutoSkipAfterError(3, 'track-1', 'track-2')).toBe(false);
    expect(shouldAutoSkipAfterError(1, 'track-1', 'track-1')).toBe(false);
  });
});
