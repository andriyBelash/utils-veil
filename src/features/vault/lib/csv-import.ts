import type { VaultEntry } from './types';

export type CsvSource = 'chrome' | 'firefox' | 'edge' | 'generic';

export type ParsedCsvEntry = {
  service: string;
  login: string;
  password: string;
};

export type ImportPreview = {
  total: number;
  toAdd: ParsedCsvEntry[];
  duplicates: number;
};

// --- Column maps ---

const COLUMN_MAP: Record<CsvSource, { url: string[]; username: string[]; password: string[] }> = {
  chrome: {
    url: ['url', 'site'],
    username: ['username', 'login', 'email'],
    password: ['password'],
  },
  firefox: {
    url: ['url', 'formactionorigin'],
    username: ['username', 'login'],
    password: ['password'],
  },
  edge: {
    url: ['url', 'site'],
    username: ['username', 'login', 'email'],
    password: ['password'],
  },
  generic: {
    url: ['url', 'site', 'website', 'domain', 'name', 'service'],
    username: ['username', 'login', 'email', 'user', 'account'],
    password: ['password', 'pass', 'pwd', 'secret'],
  },
};

// --- CSV parser ---

function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  const lower = headers.map((h) => h.toLowerCase().trim().replace(/[^a-z]/g, ''));
  for (const c of candidates) {
    const idx = lower.indexOf(c.replace(/[^a-z]/g, ''));
    if (idx !== -1) return idx;
  }
  return -1;
}

// --- Domain normalization ---

// Country-code second-level domains where the real domain is 3 parts (e.g. somesite.com.ua)
const CC_SLDS = new Set([
  'com.ua', 'org.ua', 'net.ua', 'gov.ua', 'edu.ua',
  'co.uk', 'org.uk', 'me.uk', 'net.uk', 'gov.uk',
  'com.au', 'org.au', 'net.au', 'edu.au', 'gov.au',
  'com.br', 'org.br', 'net.br', 'gov.br',
  'co.nz', 'org.nz', 'net.nz', 'govt.nz',
  'com.pl', 'org.pl', 'net.pl',
  'co.in', 'org.in', 'net.in', 'gov.in',
  'com.ar', 'org.ar', 'net.ar', 'gov.ar',
  'com.mx', 'org.mx', 'net.mx', 'gob.mx',
  'co.jp', 'or.jp', 'ne.jp', 'ac.jp',
  'co.za', 'org.za', 'net.za', 'gov.za',
  'com.tr', 'org.tr', 'net.tr', 'gov.tr',
  'co.kr', 'or.kr', 'ne.kr', 'go.kr',
  'com.cn', 'org.cn', 'net.cn', 'gov.cn', 'edu.cn',
  'com.sg', 'org.sg', 'net.sg', 'gov.sg',
  'com.hk', 'org.hk', 'net.hk', 'gov.hk',
  'com.my', 'org.my', 'net.my', 'gov.my',
]);

function stripToRegistrable(host: string): string {
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  const lastTwo = parts.slice(-2).join('.');
  if (CC_SLDS.has(lastTwo)) {
    // e.g. somesite.com.ua (3 parts) → keep as-is; sub.somesite.com.ua (4+) → somesite.com.ua
    return parts.length > 3 ? parts.slice(-3).join('.') : host;
  }
  // Regular TLD: accounts.google.com → google.com
  return parts.slice(-2).join('.');
}

export function normalizeDomain(raw: string): string {
  let url = raw.trim().toLowerCase();

  try {
    if (!url.startsWith('http')) url = 'https://' + url;
    const parsed = new URL(url);
    let host = parsed.hostname;
    host = host.replace(/^www\./, '').replace(/^m\./, '');
    return stripToRegistrable(host);
  } catch {
    const stripped = url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/^m\./, '')
      .split('/')[0];
    return stripToRegistrable(stripped);
  }
}

function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

// --- Main parse function ---

export function parseCsv(content: string, source: CsvSource): ParsedCsvEntry[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = parseCSVRow(lines[0]);
  const map = COLUMN_MAP[source];

  const urlIdx = findColumnIndex(headers, map.url);
  const userIdx = findColumnIndex(headers, map.username);
  const passIdx = findColumnIndex(headers, map.password);

  if (userIdx === -1 || passIdx === -1) return [];

  const entries: ParsedCsvEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVRow(lines[i]);
    const rawUrl = urlIdx !== -1 ? (cols[urlIdx] ?? '') : '';
    const rawUser = cols[userIdx] ?? '';
    const rawPass = cols[passIdx] ?? '';

    if (!rawUser.trim() || !rawPass.trim()) continue;

    const service = rawUrl.trim() ? normalizeDomain(rawUrl) : 'unknown';
    const login = normalizeUsername(rawUser);
    const password = rawPass.trim();

    entries.push({ service, login, password });
  }

  return entries;
}

// --- Duplicate detection ---

export function buildImportPreview(
  parsed: ParsedCsvEntry[],
  existing: VaultEntry[],
): ImportPreview {
  const existingKeys = new Set(
    existing.map((e) => `${normalizeDomain(e.service)}::${normalizeUsername(e.login)}`),
  );

  const toAdd: ParsedCsvEntry[] = [];
  let duplicates = 0;

  for (const entry of parsed) {
    const key = `${entry.service}::${entry.login}`;
    if (existingKeys.has(key)) {
      duplicates++;
    } else {
      toAdd.push(entry);
      existingKeys.add(key);
    }
  }

  return { total: parsed.length, toAdd, duplicates };
}
