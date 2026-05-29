import aesjs from 'aes-js';
import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';

import { encryptEntry, isUnlocked } from './crypto';

const LEGACY_KEY_STORE = 'passvault_aes_key';
const LEGACY_PIN_STORE = 'passvault_pin';

type LegacyRow = {
  id: number;
  service: string;
  login: string;
  encrypted_password: string;
  iv: string;
  created_at: number;
  updated_at: number;
};

function legacyDecrypt(encryptedHex: string, ivHex: string, key: number[]): string {
  const iv = aesjs.utils.hex.toBytes(ivHex);
  const ciphertext = aesjs.utils.hex.toBytes(encryptedHex);
  const aes = new aesjs.ModeOfOperation.cbc(key, iv);
  const padded = aes.decrypt(ciphertext);
  const unpadded = aesjs.padding.pkcs7.strip(padded);
  return aesjs.utils.utf8.fromBytes(Array.from(unpadded));
}

export async function hasLegacyVault(): Promise<boolean> {
  const [key, pin] = await Promise.all([
    SecureStore.getItemAsync(LEGACY_KEY_STORE),
    SecureStore.getItemAsync(LEGACY_PIN_STORE),
  ]);
  return key !== null && pin !== null;
}

export async function verifyLegacyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(LEGACY_PIN_STORE);
  return stored !== null && stored === pin;
}

/**
 * Re-encrypts the legacy table contents using the new DEK, then clears legacy
 * SecureStore items. Vault must be unlocked (cachedDek set) before calling.
 */
export async function migrateLegacyData(db: SQLite.SQLiteDatabase): Promise<void> {
  if (!isUnlocked()) throw new Error('Vault must be unlocked before migration');

  const keyRaw = await SecureStore.getItemAsync(LEGACY_KEY_STORE);
  if (!keyRaw) return;
  const legacyKey = JSON.parse(keyRaw) as number[];

  const rows = await db.getAllAsync<LegacyRow>(
    'SELECT id, service, login, encrypted_password, iv, created_at, updated_at FROM vault_entries',
  );

  await db.execAsync('BEGIN');
  try {
    await db.execAsync(`
      CREATE TABLE vault_entries_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);

    for (const row of rows) {
      const password = legacyDecrypt(row.encrypted_password, row.iv, legacyKey);
      const encrypted = await encryptEntry({
        service: row.service,
        login: row.login,
        password,
      });
      await db.runAsync(
        'INSERT INTO vault_entries_new (id, data, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        [row.id, encrypted, 1, row.created_at, row.updated_at],
      );
    }

    await db.execAsync('DROP TABLE vault_entries');
    await db.execAsync('ALTER TABLE vault_entries_new RENAME TO vault_entries');
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(LEGACY_KEY_STORE),
    SecureStore.deleteItemAsync(LEGACY_PIN_STORE),
  ]);
}
