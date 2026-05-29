import * as SecureStore from "expo-secure-store";

// Simple persisted rate-limiter for PIN entry. Since the PIN is now just an
// app-level gate, this throttling is the main protection against guessing.
const KEY = "passvault_pin_attempts";
const FREE_ATTEMPTS = 5;

// Lockout duration (ms) once attempts exceed FREE_ATTEMPTS, escalating.
const LOCKOUTS = [30_000, 60_000, 300_000, 900_000];

type AttemptState = {
  count: number;
  lockedUntil: number;
};

async function read(): Promise<AttemptState> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return { count: 0, lockedUntil: 0 };
  try {
    return JSON.parse(raw) as AttemptState;
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

async function write(state: AttemptState): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(state));
}

/** ms-epoch until which entry is locked (0 = not locked). */
export async function getLockedUntil(): Promise<number> {
  const { lockedUntil } = await read();
  return lockedUntil > Date.now() ? lockedUntil : 0;
}

/** Record a failed attempt; returns the new lockedUntil (0 = not locked). */
export async function recordFailure(): Promise<number> {
  const state = await read();
  const count = state.count + 1;
  let lockedUntil = 0;
  if (count > FREE_ATTEMPTS) {
    const idx = Math.min(count - FREE_ATTEMPTS - 1, LOCKOUTS.length - 1);
    lockedUntil = Date.now() + LOCKOUTS[idx];
  }
  await write({ count, lockedUntil });
  return lockedUntil;
}

export async function resetAttempts(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}
