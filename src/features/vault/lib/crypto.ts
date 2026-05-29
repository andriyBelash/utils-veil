import {
  AESEncryptionKey,
  AESSealedData,
  aesDecryptAsync,
  aesEncryptAsync,
  getRandomBytesAsync,
} from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import argon2 from 'react-native-argon2';

import { bytesToHex, hexToBytes, zeroize } from './crypto-primitives';
import { closeVaultDb, openVaultDb } from './db';

// ===== Key model =====
//
// A random 32-byte DEK (data encryption key) is the real root of the vault:
//   • it is the raw SQLCipher key (PRAGMA key = x'<dek-hex>')
//   • it is the HMAC base for per-file subkeys (see file-crypto.ts)
//
// The PIN never touches the DEK directly. Instead:
//   MasterKey = Argon2id(PIN, salt)  →  wraps/unwraps the DEK with AES-256-GCM.
//
// Why a wrapped DEK instead of "MasterKey == DB key" (as the spec literally
// reads): a PIN change must NOT re-encrypt the whole media library. Wrapping
// keeps the DEK stable, so changing the PIN only re-wraps 32 bytes. A wrong
// PIN makes the GCM unwrap fail (auth-tag mismatch) → PIN verification, exactly
// the security property the spec wants ("wrong key = vault won't open").
//
// salt / params / wrapped DEK live in SecureStore (hardware-backed) because
// they are needed BEFORE the encrypted DB can be opened.

const SALT_KEY = 'veil_kdf_salt'; // hex; not secret, needed pre-DB
const PARAMS_KEY = 'veil_kdf_params'; // JSON of KdfParams
const WRAPPED_DEK_KEY = 'veil_wrapped_dek'; // hex(IV‖ciphertext‖tag) of DEK under MasterKey
const BIOMETRIC_DEK_KEY = 'veil_biometric_dek'; // DEK hex, biometric-gated

const SALT_BYTES = 16;
const KEY_BYTES = 32;

export type KdfParams = {
  memory: number; // KiB
  iterations: number;
  parallelism: number;
};

// Defaults for new vaults. Stored alongside the salt so they can change later
// without locking out existing users.
const DEFAULT_KDF: KdfParams = {
  memory: 65536, // 64 MiB
  iterations: 3,
  parallelism: 1,
};

let cachedDek: Uint8Array | null = null;

async function deriveMasterKey(pin: string, saltHex: string, params: KdfParams): Promise<Uint8Array> {
  const { rawHash } = await argon2(pin, saltHex, {
    mode: 'argon2id',
    memory: params.memory,
    iterations: params.iterations,
    parallelism: params.parallelism,
    hashLength: KEY_BYTES,
    saltEncoding: 'hex',
  });
  return hexToBytes(rawHash);
}

async function wrapDek(dek: Uint8Array, masterKey: Uint8Array): Promise<string> {
  const key = await AESEncryptionKey.import(masterKey);
  const sealed = await aesEncryptAsync(dek, key);
  const combined = (await sealed.combined('bytes')) as Uint8Array;
  return bytesToHex(combined);
}

async function unwrapDek(wrappedHex: string, masterKey: Uint8Array): Promise<Uint8Array> {
  const key = await AESEncryptionKey.import(masterKey);
  const sealed = AESSealedData.fromCombined(hexToBytes(wrappedHex));
  // Throws if the auth tag does not verify (i.e. wrong PIN/MasterKey).
  const dek = (await aesDecryptAsync(sealed, key, { output: 'bytes' })) as Uint8Array;
  return dek;
}

async function readParams(): Promise<KdfParams> {
  const raw = await SecureStore.getItemAsync(PARAMS_KEY);
  return raw ? (JSON.parse(raw) as KdfParams) : DEFAULT_KDF;
}

export async function hasVault(): Promise<boolean> {
  return (await SecureStore.getItemAsync(WRAPPED_DEK_KEY)) !== null;
}

export function isUnlocked(): boolean {
  return cachedDek !== null;
}

/** Internal: the DEK for db.ts / file-crypto.ts. Throws if locked. */
export function requireDek(): Uint8Array {
  if (!cachedDek) throw new Error('Vault is locked');
  return cachedDek;
}

export async function initializeVault(pin: string): Promise<void> {
  const saltBytes = new Uint8Array(await getRandomBytesAsync(SALT_BYTES));
  const dek = new Uint8Array(await getRandomBytesAsync(KEY_BYTES));
  const saltHex = bytesToHex(saltBytes);
  const masterKey = await deriveMasterKey(pin, saltHex, DEFAULT_KDF);

  try {
    const wrapped = await wrapDek(dek, masterKey);
    await SecureStore.setItemAsync(SALT_KEY, saltHex);
    await SecureStore.setItemAsync(PARAMS_KEY, JSON.stringify(DEFAULT_KDF));
    await SecureStore.setItemAsync(WRAPPED_DEK_KEY, wrapped);
    // Fresh vault: drop any stale biometric DEK from a previous install.
    await SecureStore.deleteItemAsync(BIOMETRIC_DEK_KEY);

    await openVaultDb(bytesToHex(dek));
    cachedDek = dek;
  } finally {
    zeroize(masterKey);
  }
}

export async function unlockVault(pin: string): Promise<boolean> {
  const saltHex = await SecureStore.getItemAsync(SALT_KEY);
  const wrapped = await SecureStore.getItemAsync(WRAPPED_DEK_KEY);
  if (!saltHex || !wrapped) return false;

  const masterKey = await deriveMasterKey(pin, saltHex, await readParams());
  try {
    const dek = await unwrapDek(wrapped, masterKey); // throws on wrong PIN
    await openVaultDb(bytesToHex(dek));
    cachedDek = dek;
    return true;
  } catch {
    return false;
  } finally {
    zeroize(masterKey);
  }
}

/** Verifies a PIN without changing lock state (used by re-auth sheets). */
export async function verifyPin(pin: string): Promise<boolean> {
  const saltHex = await SecureStore.getItemAsync(SALT_KEY);
  const wrapped = await SecureStore.getItemAsync(WRAPPED_DEK_KEY);
  if (!saltHex || !wrapped) return false;
  const masterKey = await deriveMasterKey(pin, saltHex, await readParams());
  try {
    const dek = await unwrapDek(wrapped, masterKey);
    zeroize(dek);
    return true;
  } catch {
    return false;
  } finally {
    zeroize(masterKey);
  }
}

export async function changePin(currentPin: string, newPin: string): Promise<boolean> {
  const saltHex = await SecureStore.getItemAsync(SALT_KEY);
  const wrapped = await SecureStore.getItemAsync(WRAPPED_DEK_KEY);
  if (!saltHex || !wrapped) return false;

  const params = await readParams();
  const currentMaster = await deriveMasterKey(currentPin, saltHex, params);
  let dek: Uint8Array;
  try {
    dek = await unwrapDek(wrapped, currentMaster); // verifies current PIN
  } catch {
    return false;
  } finally {
    zeroize(currentMaster);
  }

  // Re-wrap the same DEK under a fresh salt + the new PIN. Files/DB untouched.
  const newSaltBytes = new Uint8Array(await getRandomBytesAsync(SALT_BYTES));
  const newSaltHex = bytesToHex(newSaltBytes);
  const newMaster = await deriveMasterKey(newPin, newSaltHex, params);
  try {
    const rewrapped = await wrapDek(dek, newMaster);
    await SecureStore.setItemAsync(SALT_KEY, newSaltHex);
    await SecureStore.setItemAsync(WRAPPED_DEK_KEY, rewrapped);
    return true;
  } finally {
    zeroize(newMaster);
    zeroize(dek);
  }
}

export function lockVault(): void {
  closeVaultDb();
  if (cachedDek) {
    zeroize(cachedDek);
    cachedDek = null;
  }
}

// ===== Biometric unlock =====
//
// Stores the DEK itself behind a biometric-gated SecureStore entry. No PIN
// derivation needed on biometric unlock.

export async function enableBiometricUnlock(prompt: string): Promise<void> {
  const dek = requireDek();
  await SecureStore.setItemAsync(BIOMETRIC_DEK_KEY, bytesToHex(dek), {
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
    const dek = hexToBytes(hex);
    await openVaultDb(hex);
    cachedDek = dek;
    return true;
  } catch {
    return false;
  }
}
