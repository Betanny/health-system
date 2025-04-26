// lib/crypto.test.ts
import { describe, it, expect, vi } from 'vitest'
import { encrypt, decrypt } from './crypto'

// Test key is now set globally in vitest.setup.ts

describe('Encryption/Decryption Utilities', () => {

  it('should encrypt and decrypt a string successfully', () => {
    const originalText = 'This is a secret message.';
    const encrypted = encrypt(originalText);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBeNull();
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(originalText);

    const decrypted = decrypt(encrypted!); // Use non-null assertion as we expect it to be defined

    expect(decrypted).toBeDefined();
    expect(decrypted).not.toBeNull();
    expect(decrypted).toBe(originalText);
  });

  it('should return null when encrypting null or empty string', () => {
    expect(encrypt(null as any)).toBeNull(); // Test with null
    expect(encrypt('')).toBeNull(); // Test with empty string
  });

  it('should throw error when decrypting null, empty, or invalid string', () => {
     // Decrypting null/empty string should throw because substring logic fails
    expect(() => decrypt(null as any)).toThrow(); 
    expect(() => decrypt('')).toThrow(); 
    // Decrypting garbage/non-hex data should throw
    expect(() => decrypt('invalid-encrypted-text')).toThrow('Decryption failed');
    // Decrypting valid hex but wrong format/length should throw
    expect(() => decrypt('aabbccddeeff')).toThrow('Decryption failed');
  });
  
  it('should throw error when decrypting with a different key (simulated)', () => {
    const originalText = 'Another secret';
    const encrypted = encrypt(originalText); // Encrypted with TEST_ENCRYPTION_KEY
    expect(encrypted).not.toBeNull();

    // Simulate trying to decrypt with a wrong key by temporarily changing the mocked env var
    // (This is a bit indirect as the module loads the key only once. A better approach
    // might involve resetting modules or directly mocking the crypto functions if needed,
    // but this demonstrates the intent.)
    // For this test, we'll just assume decryption fails if the format is correct but content differs.
    // A more robust test would involve actually using a different key if the setup allowed.

    // Tamper with the encrypted string slightly (e.g., change one char) to simulate wrong key/corruption
    const tamperedEncrypted = encrypted!.slice(0, -1) + (encrypted!.slice(-1) === 'a' ? 'b' : 'a');

    expect(() => decrypt(tamperedEncrypted)).toThrow('Decryption failed');
  });

    it('should handle different data types passed to encrypt (though expects string)', () => {
        // Although the function expects a string, test behavior with other types
        const numInput: any = 12345;
        const objInput: any = { key: 'value' };
        const boolInput: any = true;

        // It will likely coerce to string or throw depending on internal crypto implementation
        // Let's assume coercion to string for this example
        const encryptedNum = encrypt(String(numInput));
        const encryptedObj = encrypt(String(objInput)); // [object Object]
        const encryptedBool = encrypt(String(boolInput)); // 'true'

        expect(decrypt(encryptedNum!)).toBe('12345');
        expect(decrypt(encryptedObj!)).toBe('[object Object]');
        expect(decrypt(encryptedBool!)).toBe('true');
    });
}); 