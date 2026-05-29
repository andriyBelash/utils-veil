import aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';

import {
  bytesToHex,
  constantTimeEqual,
  hexToBytes,
  hmacSha256,
  utf8ToBytes,
} from './crypto-primitives';

const IV_BYTES = 16;
const SUBKEY_LABEL_ENC = utf8ToBytes('passvault-enc-v1');
const SUBKEY_LABEL_MAC = utf8ToBytes('passvault-mac-v1');

export type AeadBlob = {
  iv: string;
  ciphertext: string;
  mac: string;
};

function deriveSubkeys(masterKey: Uint8Array): { enc: number[]; mac: Uint8Array } {
  const encBytes = hmacSha256(masterKey, SUBKEY_LABEL_ENC);
  const macBytes = hmacSha256(masterKey, SUBKEY_LABEL_MAC);
  return { enc: Array.from(encBytes), mac: macBytes };
}

export async function aeadEncrypt(plaintext: Uint8Array, key: Uint8Array): Promise<AeadBlob> {
  const ivRaw = await Crypto.getRandomBytesAsync(IV_BYTES);
  const iv = Array.from(ivRaw);
  const { enc, mac } = deriveSubkeys(key);

  const padded = aesjs.padding.pkcs7.pad(plaintext);
  const aes = new aesjs.ModeOfOperation.cbc(enc, iv);
  const ciphertext = aes.encrypt(padded);

  const macInput = new Uint8Array(IV_BYTES + ciphertext.length);
  macInput.set(iv, 0);
  macInput.set(ciphertext, IV_BYTES);
  const macTag = hmacSha256(mac, macInput);

  return {
    iv: bytesToHex(new Uint8Array(iv)),
    ciphertext: bytesToHex(new Uint8Array(ciphertext)),
    mac: bytesToHex(macTag),
  };
}

export function aeadDecrypt(blob: AeadBlob, key: Uint8Array): Uint8Array {
  const { enc, mac } = deriveSubkeys(key);
  const iv = hexToBytes(blob.iv);
  const ciphertext = hexToBytes(blob.ciphertext);
  const providedMac = hexToBytes(blob.mac);

  const macInput = new Uint8Array(iv.length + ciphertext.length);
  macInput.set(iv, 0);
  macInput.set(ciphertext, iv.length);
  const expectedMac = hmacSha256(mac, macInput);

  if (!constantTimeEqual(expectedMac, providedMac)) {
    throw new Error('Authentication failed');
  }

  const aes = new aesjs.ModeOfOperation.cbc(enc, Array.from(iv));
  const padded = aes.decrypt(ciphertext);
  const unpadded = aesjs.padding.pkcs7.strip(padded);
  return new Uint8Array(unpadded);
}

export function serializeBlob(blob: AeadBlob): string {
  return `${blob.iv}:${blob.ciphertext}:${blob.mac}`;
}

export function deserializeBlob(s: string): AeadBlob {
  const parts = s.split(':');
  if (parts.length !== 3) throw new Error('invalid blob');
  return { iv: parts[0], ciphertext: parts[1], mac: parts[2] };
}
