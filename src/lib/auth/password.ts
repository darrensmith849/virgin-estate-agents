// NB: intentionally NOT `server-only` — pure crypto with no secrets, so it can
// also be used from the seed script (Node). Secret-bearing modules (session,
// dal, storage) keep the server-only guard.
import { scrypt } from "@noble/hashes/scrypt.js";
import { randomBytes, bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

// scrypt params — solid for a small admin login and fast enough on Workers.
const PARAMS = { N: 16384, r: 8, p: 1, dkLen: 32 } as const;

/** Hash a password into a `scrypt$<saltHex>$<hashHex>` string. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const dk = scrypt(password, salt, PARAMS);
  return `scrypt$${bytesToHex(salt)}$${bytesToHex(dk)}`;
}

/** Verify a password against a stored `scrypt$<salt>$<hash>` value. */
export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, saltHex, hashHex] = stored.split("$");
    if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
    const dk = scrypt(password, hexToBytes(saltHex), PARAMS);
    const computed = bytesToHex(dk);
    if (computed.length !== hashHex.length) return false;
    // constant-time comparison
    let diff = 0;
    for (let i = 0; i < computed.length; i++) {
      diff |= computed.charCodeAt(i) ^ hashHex.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
