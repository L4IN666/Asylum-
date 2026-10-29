export type RepeatMode = 'off' | 'all' | 'one';

export function clampIndex(index: number, length: number): number {
  if (!Number.isFinite(index) || length <= 0) {
    return -1;
  }

  return Math.min(Math.max(index, 0), length - 1);
}

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.8;
  }

  return Math.min(Math.max(value, 0), 1);
}

export function buildShuffledOrder(length: number, randomFn: () => number = Math.random): number[] {
  if (!Number.isFinite(length) || length <= 0) {
    return [];
  }

  const order = Array.from({ length }, (_, index) => index);

  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomFn() * (index + 1));
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }

  return order;
}

export function getNextIndex(
  queueLength: number,
  currentIndex: number,
  repeat: RepeatMode,
  shuffle: boolean,
  shuffleOrder: number[] = [],
  manual = false
): number {
  if (queueLength <= 0) {
    return -1;
  }

  // Repeat-one applies to automatic end-of-track transitions only.
  if (repeat === 'one' && !manual) {
    return clampIndex(currentIndex, queueLength);
  }

  if (shuffle && shuffleOrder.length === queueLength) {
    const currentPosition = shuffleOrder.indexOf(currentIndex);
    if (currentPosition === -1) {
      return shuffleOrder[0] ?? 0;
    }

    const nextPosition = currentPosition + 1;
    if (nextPosition < shuffleOrder.length) {
      return shuffleOrder[nextPosition];
    }

    if (repeat === 'all') {
      return shuffleOrder[0];
    }

    return -1;
  }

  if (queueLength === 1) {
    if (!manual && (repeat === 'one' || repeat === 'all')) {
      return currentIndex;
    }

    return -1;
  }

  if (currentIndex + 1 < queueLength) {
    return currentIndex + 1;
  }

  if (repeat === 'all') {
    return 0;
  }

  return -1;
}

export function shouldAutoSkipAfterError(
  failedAttempts: number,
  currentTrackId: string | null,
  lastFailedTrackId: string | null
): boolean {
  if (failedAttempts >= 3) {
    return false;
  }

  if (!currentTrackId) {
    return false;
  }

  if (currentTrackId === lastFailedTrackId) {
    return false;
  }

  return true;
}

export function getPreviousIndex(
  queueLength: number,
  currentIndex: number,
  history: number[],
  repeat: RepeatMode,
  shuffle = false,
  shuffleOrder: number[] = []
): number {
  if (queueLength <= 0) {
    return -1;
  }

  if (shuffle && shuffleOrder.length === queueLength) {
    const currentPosition = shuffleOrder.indexOf(currentIndex);
    if (currentPosition <= 0) {
      if (repeat === 'all' && queueLength > 1) {
        return shuffleOrder[shuffleOrder.length - 1];
      }

      return shuffleOrder[0] ?? 0;
    }

    return shuffleOrder[currentPosition - 1];
  }

  if (history.length > 0) {
    const lastVisited = history[history.length - 1];
    if (lastVisited !== currentIndex) {
      return clampIndex(lastVisited, queueLength);
    }

    if (history.length > 1) {
      return clampIndex(history[history.length - 2], queueLength);
    }
  }

  if (currentIndex > 0) {
    return currentIndex - 1;
  }

  if (repeat === 'all' && queueLength > 1) {
    return queueLength - 1;
  }

  return 0;
}
