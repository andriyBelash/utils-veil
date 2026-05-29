import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import {
  aeadDecrypt,
  aeadEncrypt,
  deserializeBlob,
  serializeBlob,
} from './aead';
import {
  bytesToHex,
  bytesToUtf8,
  constantTimeEqual,
  hexToBytes,
  utf8ToBytes,
  zeroize,
} from './crypto-primitives';

// The DEK (data encryption key) lives directly in the hardware-backed
// SecureStore (Keychain / Keystore) — that store is the real protection.
// The PIN is an app-level gate: we keep only its SHA-256 hash and compare.
const DEK_KEY = 'passvault_dek';
const PIN_HASH_KEY = 'passvault_pin_hash';
const BIOMETRIC_DEK_KEY = 'passvault_biometric_dek';
// Owned by settings/biometric-storage; cleared here so a fresh vault never
// inherits a dangling "biometric enabled" flag without a matching DEK.
const BIOMETRIC_ENABLED_KEY = 'passvault_biometric_enabled';
const KEY_BYTES = 32;

let cachedDek: Uint8Array | null = null;

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

async function readDek(): Promise<Uint8Array | null> {
  const hex = await SecureStore.getItemAsync(DEK_KEY);
  return hex ? hexToBytes(hex) : null;
}

export async function hasVault(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
  return stored !== null;
}

export function isUnlocked(): boolean {
  return cachedDek !== null;
}

export async function initializeVault(pin: string): Promise<void> {
  const dekRaw = await Crypto.getRandomBytesAsync(KEY_BYTES);
  const dek = new Uint8Array(dekRaw);
  await SecureStore.setItemAsync(DEK_KEY, bytesToHex(dek));
  await SecureStore.setItemAsync(PIN_HASH_KEY, await hashPin(pin));
  // Fresh vault: clear any stale biometric state so the flag never dangles.
  await SecureStore.deleteItemAsync(BIOMETRIC_DEK_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  cachedDek = dek;
}

export async function unlockVault(pin: string): Promise<boolean> {
  if (!(await verifyPin(pin))) return false;
  const dek = await readDek();
  if (!dek) return false;
  cachedDek = dek;
  return true;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (!stored) return false;
  const candidate = await hashPin(pin);
  return constantTimeEqual(utf8ToBytes(candidate), utf8ToBytes(stored));
}

export async function changePin(currentPin: string, newPin: string): Promise<boolean> {
  if (!(await verifyPin(currentPin))) return false;
  // DEK is independent of the PIN, so changing the PIN is just a new hash.
  await SecureStore.setItemAsync(PIN_HASH_KEY, await hashPin(newPin));
  return true;
}

export function lockVault(): void {
  if (cachedDek) {
    zeroize(cachedDek);
    cachedDek = null;
  }
}

// ===== Biometric DEK =====

export async function enableBiometricUnlock(prompt: string): Promise<void> {
  if (!cachedDek) throw new Error('Vault must be unlocked to enable biometric');
  await SecureStore.setItemAsync(BIOMETRIC_DEK_KEY, bytesToHex(cachedDek), {
    requireAuthentication: true,
    authenticationPrompt: prompt,
  });
}

export async function disableBiometricUnlock(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_DEK_KEY);
}

export async function unlockVaultWithBiometric(prompt: string): Promise<boolean> {
  try {
    const hex = await SecureStore.getItemAsync(BIOMETRIC_DEK_KEY, {
      requireAuthentication: true,
      authenticationPrompt: prompt,
    });
    if (!hex) return false;
    cachedDek = hexToBytes(hex);
    return true;
  } catch {
    return false;
  }
}

// ===== Entry crypto =====

export type EntryPlaintext = {
  service: string;
  login: string;
  password: string;
};

export async function encryptEntry(entry: EntryPlaintext): Promise<string> {
  if (!cachedDek) throw new Error('Vault locked');
  const json = JSON.stringify(entry);
  const blob = await aeadEncrypt(utf8ToBytes(json), cachedDek);
  return serializeBlob(blob);
}

export function decryptEntry(serialized: string): EntryPlaintext {
  if (!cachedDek) throw new Error('Vault locked');
  const blob = deserializeBlob(serialized);
  const plaintext = aeadDecrypt(blob, cachedDek);
  return JSON.parse(bytesToUtf8(plaintext)) as EntryPlaintext;
}
