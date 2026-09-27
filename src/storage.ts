// localStorage can throw (private mode, blocked storage), so every access is guarded.

export function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Persistence is a nicety; the game works without it.
  }
}

export function readNumber(key: string, fallback = 0): number {
  const raw = readStorage(key);
  const value = raw === null ? NaN : Number(raw);
  return Number.isFinite(value) ? value : fallback;
}
