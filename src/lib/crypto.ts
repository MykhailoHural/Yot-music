import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';

// Lazy key derivation — deferred until first use so the module can be imported
// without TOKEN_ENCRYPTION_KEY (e.g. during build or in tests that mock env).
let _KEY: Buffer | null = null;
function getKey(): Buffer {
  if (!_KEY) {
    const encKey = process.env.TOKEN_ENCRYPTION_KEY;
    if (!encKey) throw new Error('TOKEN_ENCRYPTION_KEY is not defined in environment variables');
    _KEY = scryptSync(encKey, 'static-salt-yt-music', 32);
  }
  return _KEY;
}

export function encryptToken(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map(b => b.toString('base64')).join(':');
}

export function decryptToken(ciphertext: string): string {
  const key = getKey();
  const [ivB64, tagB64, encB64] = ciphertext.split(':');
  if (!ivB64 || !tagB64 || !encB64) {
    throw new Error('Invalid ciphertext format');
  }
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');
  const encrypted = Buffer.from(encB64, 'base64');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}
