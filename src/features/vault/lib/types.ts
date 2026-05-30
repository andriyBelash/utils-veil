export type VaultItem = {
  id: string; // UUID; also the input for HMAC-derived per-file subkey
  originalName: string;
  encryptedPath: string; // absolute path inside DocumentDir/.vault
  thumbPath: string | null; // separate encrypted thumbnail
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: number; // epoch ms
  albumId: string | null;
  isFavorite: boolean;
};

export type NewVaultItem = Omit<VaultItem, 'createdAt' | 'isFavorite'> & {
  isFavorite?: boolean;
};

export type Album = {
  id: string;
  name: string;
  coverItemId: string | null;
  createdAt: number;
};

// Album plus derived display data: how many photos it holds and the most recent
// one to use as a cover thumbnail.
export type AlbumWithMeta = Album & {
  count: number;
  coverItem: VaultItem | null;
};
