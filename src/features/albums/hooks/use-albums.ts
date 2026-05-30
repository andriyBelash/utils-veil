import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { getAlbumsWithMeta, type AlbumWithMeta } from '@/features/vault';

/**
 * Loads albums with cover + count. Reloads on focus and whenever `reloadKey`
 * changes (so a parent can refresh after creating/deleting an album).
 */
export function useAlbums(reloadKey?: number) {
  const [albums, setAlbums] = useState<AlbumWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const list = await getAlbumsWithMeta();
      setAlbums(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  return { albums, loading, reload: load };
}
