import * as SQLite from 'expo-sqlite';

import type { Album, NewVaultItem, VaultItem } from './types';

let db: SQLite.SQLiteDatabase | null = null;

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS vault_items (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    encrypted_path TEXT NOT NULL UNIQUE,
    thumb_path TEXT,
    mime_type TEXT,
    size_bytes INTEGER,
    created_at INTEGER NOT NULL,
    album_id TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS albums (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    cover_item_id TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_album ON vault_items(album_id);
  CREATE INDEX IF NOT EXISTS idx_favorite ON vault_items(is_favorite);
  CREATE INDEX IF NOT EXISTS idx_created ON vault_items(created_at);
`;

/**
 * Opens the SQLCipher database with a raw 32-byte key (hex). The raw-key form
 * (`x'…'`) tells SQLCipher to skip its own PBKDF2 — the key is already derived.
 * Must be called before any CRUD function.
 */
export async function openVaultDb(rawKeyHex: string): Promise<void> {
  if (db) return;
  const database = await SQLite.openDatabaseAsync('veil.db');
  // PRAGMA key must be the very first statement after opening.
  await database.execAsync(`PRAGMA key = "x'${rawKeyHex}'"`);
  // Forces SQLCipher to read the header; a wrong key throws here.
  await database.getFirstAsync('SELECT count(*) FROM sqlite_master');
  await database.execAsync(SCHEMA);
  db = database;
}

export function closeVaultDb(): void {
  if (db) {
    db.closeSync();
    db = null;
  }
}

function getDb(): SQLite.SQLiteDatabase {
  if (!db) throw new Error('Vault DB is not open');
  return db;
}

type ItemRow = {
  id: string;
  original_name: string;
  encrypted_path: string;
  thumb_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: number;
  album_id: string | null;
  is_favorite: number;
};

function rowToItem(row: ItemRow): VaultItem {
  return {
    id: row.id,
    originalName: row.original_name,
    encryptedPath: row.encrypted_path,
    thumbPath: row.thumb_path,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    albumId: row.album_id,
    isFavorite: row.is_favorite === 1,
  };
}

// ===== vault_items =====

export async function insertItem(item: NewVaultItem): Promise<VaultItem> {
  const database = getDb();
  const createdAt = Date.now();
  const isFavorite = item.isFavorite ? 1 : 0;
  await database.runAsync(
    `INSERT INTO vault_items
       (id, original_name, encrypted_path, thumb_path, mime_type, size_bytes, created_at, album_id, is_favorite)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      item.id,
      item.originalName,
      item.encryptedPath,
      item.thumbPath,
      item.mimeType,
      item.sizeBytes,
      createdAt,
      item.albumId,
      isFavorite,
    ],
  );
  return { ...item, createdAt, isFavorite: item.isFavorite ?? false };
}

export async function getAllItems(albumId?: string): Promise<VaultItem[]> {
  const database = getDb();
  const rows = albumId
    ? await database.getAllAsync<ItemRow>(
        'SELECT * FROM vault_items WHERE album_id = ? ORDER BY created_at DESC',
        [albumId],
      )
    : await database.getAllAsync<ItemRow>('SELECT * FROM vault_items ORDER BY created_at DESC');
  return rows.map(rowToItem);
}

export async function getItem(id: string): Promise<VaultItem | null> {
  const database = getDb();
  const row = await database.getFirstAsync<ItemRow>('SELECT * FROM vault_items WHERE id = ?', [id]);
  return row ? rowToItem(row) : null;
}

export async function deleteItem(id: string): Promise<void> {
  const database = getDb();
  await database.runAsync('DELETE FROM vault_items WHERE id = ?', [id]);
}

export async function setFavorite(id: string, isFavorite: boolean): Promise<void> {
  const database = getDb();
  await database.runAsync('UPDATE vault_items SET is_favorite = ? WHERE id = ?', [
    isFavorite ? 1 : 0,
    id,
  ]);
}

// ===== albums =====

type AlbumRow = { id: string; name: string; cover_item_id: string | null; created_at: number };

export async function createAlbum(id: string, name: string): Promise<Album> {
  const database = getDb();
  const createdAt = Date.now();
  await database.runAsync(
    'INSERT INTO albums (id, name, cover_item_id, created_at) VALUES (?, ?, ?, ?)',
    [id, name, null, createdAt],
  );
  return { id, name, coverItemId: null, createdAt };
}

export async function getAlbums(): Promise<Album[]> {
  const database = getDb();
  const rows = await database.getAllAsync<AlbumRow>('SELECT * FROM albums ORDER BY created_at DESC');
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    coverItemId: r.cover_item_id,
    createdAt: r.created_at,
  }));
}

export async function deleteAlbum(id: string): Promise<void> {
  const database = getDb();
  await database.runAsync('UPDATE vault_items SET album_id = NULL WHERE album_id = ?', [id]);
  await database.runAsync('DELETE FROM albums WHERE id = ?', [id]);
}
