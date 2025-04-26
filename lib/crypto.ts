import crypto from 'crypto';

// Ensure the ENCRYPTION_KEY environment variable is set
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = 'aes-256-gcm'; // Recommended algorithm
const IV_LENGTH = 16; // For GCM

// Replace your key validation with:
if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable must be set.');
}

// For a base64 key
const key = Buffer.from(ENCRYPTION_KEY, 'base64');

// Check the key length
if (key.length !== 32) {
  throw new Error('ENCRYPTION_KEY must decode to 32 bytes (256 bits) for AES-256.');
}

export function encrypt(text: string): string | null {
  if (!text) {
    return null; // Handle empty or null input gracefully
  }
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    // Prepend IV and authTag to the encrypted text for storage
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
  } catch (error) {
    console.error('Encryption failed:', error);
    // Depending on policy, you might want to throw, return null, or return a specific error indicator
    return null; // Or throw error
  }
}

export function decrypt(encryptedText: string): string | null {
  // Throw immediately if input is null, empty, or clearly too short
  if (!encryptedText || encryptedText.length < (IV_LENGTH * 2 + 16 * 2)) { // IV + AuthTag minimum length
    console.error('Decryption failed: Input is null, empty, or too short.');
    throw new Error('Decryption failed: Invalid input.');
  }
  try {
    const ivHex = encryptedText.substring(0, IV_LENGTH * 2);
    const authTagHex = encryptedText.substring(IV_LENGTH * 2, IV_LENGTH * 2 + 16 * 2); 
    const ciphertextHex = encryptedText.substring(IV_LENGTH * 2 + 16 * 2);

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Decryption failed', { cause: error }); 
  }
} 