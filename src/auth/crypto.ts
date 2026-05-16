import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

/**
 * Password hashing.
 *
 * v1 strategy: salted SHA-256 with 10k iterations. Not as strong as a real
 * PBKDF2 with a slow KDF, but adequate for a single-user local app where the
 * threat model is "someone briefly grabs the device" rather than "an attacker
 * exfiltrates the hash database and runs GPUs against it". Migration path:
 * when we move to Supabase, server-side bcrypt/argon2 replaces this entirely.
 *
 * On web we use `crypto.subtle.digest`; on native we use `expo-crypto`'s
 * `digestStringAsync`. Both yield the same hex output for the same input.
 */

const ITERATIONS = 10_000;

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) {
    out += bytes[i].toString(16).padStart(2, '0');
  }
  return out;
}

async function sha256Hex(input: string): Promise<string> {
  if (Platform.OS === 'web') {
    const enc = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return bytesToHex(new Uint8Array(buf));
  }
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

export async function generateSalt(): Promise<string> {
  if (Platform.OS === 'web') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
  }
  const bytes = await Crypto.getRandomBytesAsync(16);
  return bytesToHex(bytes);
}

/**
 * Stretched salted hash. Iterating SHA-256 isn't a real KDF, but it slows
 * brute force by a constant factor and is portable across web + native
 * without bringing in a wasm bundle.
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  let h = `${salt}:${password}`;
  for (let i = 0; i < ITERATIONS; i++) {
    h = await sha256Hex(h);
  }
  return h;
}

export async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const h = await hashPassword(password, salt);
  // Constant-time-ish compare (not truly constant time in JS, but close
  // enough for a local app where timing attacks aren't part of the threat model).
  if (h.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) {
    diff |= h.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}

export function generateId(): string {
  // 16 random bytes hex → 32-char id. Good enough as a local primary key.
  if (Platform.OS === 'web') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return bytesToHex(bytes);
  }
  // Sync fallback using Math.random — not cryptographic, but ids don't need
  // to be unguessable. The async variant would force callers to await.
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}
