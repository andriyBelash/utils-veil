import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import {
  bytesToHex as nobleBytesToHex,
  hexToBytes as nobleHexToBytes,
  utf8ToBytes as nobleUtf8ToBytes,
} from '@noble/hashes/utils.js';

export function hmacSha256(key: Uint8Array, message: Uint8Array): Uint8Array {
  return hmac(sha256, key, message);
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function bytesToHex(bytes: Uint8Array): string {
  return nobleBytesToHex(bytes);
}

export function hexToBytes(hex: string): Uint8Array {
  return nobleHexToBytes(hex);
}

export function utf8ToBytes(s: string): Uint8Array {
  return nobleUtf8ToBytes(s);
}

export function bytesToUtf8(bytes: Uint8Array): string {
  let s = '';
  let i = 0;
  while (i < bytes.length) {
    const b1 = bytes[i++];
    if (b1 < 0x80) {
      s += String.fromCharCode(b1);
    } else if (b1 < 0xc0) {
      throw new Error('invalid utf-8');
    } else if (b1 < 0xe0) {
      const b2 = bytes[i++] & 0x3f;
      s += String.fromCharCode(((b1 & 0x1f) << 6) | b2);
    } else if (b1 < 0xf0) {
      const b2 = bytes[i++] & 0x3f;
      const b3 = bytes[i++] & 0x3f;
      s += String.fromCharCode(((b1 & 0x0f) << 12) | (b2 << 6) | b3);
    } else {
      const b2 = bytes[i++] & 0x3f;
      const b3 = bytes[i++] & 0x3f;
      const b4 = bytes[i++] & 0x3f;
      const cp = ((b1 & 0x07) << 18) | (b2 << 12) | (b3 << 6) | b4;
      const high = 0xd800 + ((cp - 0x10000) >> 10);
      const low = 0xdc00 + ((cp - 0x10000) & 0x3ff);
      s += String.fromCharCode(high, low);
    }
  }
  return s;
}

export function zeroize(bytes: Uint8Array): void {
  for (let i = 0; i < bytes.length; i++) bytes[i] = 0;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Standard base64 of raw bytes — used to build in-memory data: URIs. */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return out;
}
