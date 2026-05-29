import * as SQLite from 'expo-sqlite';

import { decryptEntry, encryptEntry } from './crypto';
import type { CreateEntryInput, VaultEntry } from './types';

let db: SQLite.SQLiteDatabase | null = null;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS vault_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('passvault.db');
    await db.execAsync(SCHEMA);
  }
  return db;
}

type DbRow = {
  id: number;
  data: string;
  version: number;
  created_at: number;
  updated_at: number;
};

function rowToEntry(row: DbRow): VaultEntry {
  const { service, login, password } = decryptEntry(row.data);
  return {
    id: row.id,
    service,
    login,
    password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createEntry(input: CreateEntryInput): Promise<VaultEntry> {
  const database = await getDb();
  const data = await encryptEntry(input);
  const now = Date.now();
  const result = await database.runAsync(
    'INSERT INTO vault_entries (data, version, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [data, 1, now, now],
  );
  return {
    id: result.lastInsertRowId,
    service: input.service,
    login: input.login,
    password: input.password,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getEntryById(id: number): Promise<VaultEntry | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<DbRow>(
    'SELECT id, data, version, created_at, updated_at FROM vault_entries WHERE id = ?',
    [id],
  );
  return row ? rowToEntry(row) : null;
}

export async function updateEntry(id: number, input: CreateEntryInput): Promise<void> {
  const database = await getDb();
  const data = await encryptEntry(input);
  const now = Date.now();
  await database.runAsync(
    'UPDATE vault_entries SET data = ?, version = ?, updated_at = ? WHERE id = ?',
    [data, 1, now, id],
  );
}

export async function getAllEntries(): Promise<VaultEntry[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<DbRow>(
    'SELECT id, data, version, created_at, updated_at FROM vault_entries ORDER BY updated_at DESC',
  );

  const entries: VaultEntry[] = [];
  const orphanIds: number[] = [];
  for (const row of rows) {
    try {
      entries.push(rowToEntry(row));
    } catch {
      // Row was encrypted with a previous DEK (e.g. after a vault reset) and is
      // permanently unrecoverable — drop it instead of breaking the whole list.
      orphanIds.push(row.id);
    }
  }

  if (orphanIds.length > 0) {
    const placeholders = orphanIds.map(() => '?').join(', ');
    await database.runAsync(
      `DELETE FROM vault_entries WHERE id IN (${placeholders})`,
      orphanIds,
    );
  }

  return entries;
}

export async function deleteEntry(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM vault_entries WHERE id = ?', [id]);
}
