import type { ParsedCsvEntry } from './csv-import';

type PendingImport = {
  entries: ParsedCsvEntry[];
  source: 'backup' | 'csv';
};

let pending: PendingImport | null = null;

export function setPendingImport(data: PendingImport): void {
  pending = data;
}

export function getPendingImport(): PendingImport | null {
  return pending;
}

export function clearPendingImport(): void {
  pending = null;
}
