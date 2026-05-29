import * as FileSystem from 'expo-file-system/legacy';

import { getAllEntries } from './db';

const EXPORT_FILENAME = 'passvault_export.csv';

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export async function exportToCsv(): Promise<string> {
  const entries = await getAllEntries();

  const rows = entries.map(
    (e) => `${escapeCsv(e.service)},${escapeCsv(e.login)},${escapeCsv(e.password)}`,
  );

  const csv = ['url,username,password', ...rows].join('\n');
  const uri = (FileSystem.cacheDirectory ?? '') + EXPORT_FILENAME;

  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return uri;
}

export async function cleanupCsvExport(): Promise<void> {
  const uri = (FileSystem.cacheDirectory ?? '') + EXPORT_FILENAME;
  await FileSystem.deleteAsync(uri, { idempotent: true });
}
