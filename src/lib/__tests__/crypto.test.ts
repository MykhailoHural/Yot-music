import { describe, it, expect, beforeAll } from 'vitest';
import { encryptToken, decryptToken } from '../crypto';

beforeAll(() => {
  process.env.TOKEN_ENCRYPTION_KEY = 'test-key-long-enough-for-scrypt-derivation-ok';
});

describe('encryptToken / decryptToken', () => {
  it('round-trip returns original plaintext', () => {
    const plain = 'ya29.a0AfH6SMBexampleAccessToken';
    expect(decryptToken(encryptToken(plain))).toBe(plain);
  });

  it('encrypted output does not contain plaintext', () => {
    const plain = 'super-secret-token';
    expect(encryptToken(plain)).not.toContain(plain);
  });

  it('two encryptions of the same value produce different ciphertext (random IV)', () => {
    const plain = 'same-token';
    expect(encryptToken(plain)).not.toBe(encryptToken(plain));
  });

  it('handles long tokens (refresh tokens can be 200+ chars)', () => {
    const plain = 'x'.repeat(300);
    expect(decryptToken(encryptToken(plain))).toBe(plain);
  });

  it('handles tokens with special characters', () => {
    const plain = 'token/with+special=chars&more==';
    expect(decryptToken(encryptToken(plain))).toBe(plain);
  });

  it('throws on invalid ciphertext format', () => {
    expect(() => decryptToken('not-valid')).toThrow();
  });

  it('throws on tampered ciphertext', () => {
    const encrypted = encryptToken('original');
    const tampered = encrypted.slice(0, -4) + 'XXXX';
    expect(() => decryptToken(tampered)).toThrow();
  });
});
