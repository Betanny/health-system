import bcrypt from 'bcryptjs';
import jwt, { Secret, JwtPayload as VerifiedJwtPayload } from 'jsonwebtoken';
import * as jose from 'jose'; // Import jose
import { NextRequest } from 'next/server';
import { db, users, refreshTokens } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import { TextEncoder } from 'util'; // Needed for jose

// Helper function to parse time strings (e.g., "15m", "7d", "1h") into seconds
function parseTimeStringToSeconds(timeString: string): number {
  const match = timeString.match(/^(\d+)([smhd])$/);
  if (!match) {
    throw new Error(`Invalid time string format: ${timeString}. Use format like "15m", "7d", "1h".`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 60 * 60 * 24;
    default: throw new Error(`Invalid time unit: ${unit}`); // Should not happen with regex
  }
}

const SALT_ROUNDS = 10; // Standard practice for bcrypt salt rounds

// --- Environment Variable Accessors ---
// Functions to get env vars, ensuring they are only accessed when needed.

function getJwtSecret(): Secret {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is not set.');
    }
    return secret;
}

function getAccessTokenExpiresInSeconds(): number {
    const timeString = process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m';
    try {
        return parseTimeStringToSeconds(timeString);
    } catch (e) {
        console.error("Failed to parse JWT_ACCESS_TOKEN_EXPIRES_IN:", e);
        console.warn("Using default JWT access token expiration: 15 minutes");
        return 15 * 60; // 15 minutes default
    }
}

export function getRefreshTokenExpiresInSeconds(): number {
    const timeString = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d';
     try {
        return parseTimeStringToSeconds(timeString);
    } catch (e) {
        console.error("Failed to parse JWT_REFRESH_TOKEN_EXPIRES_IN:", e);
        console.warn("Using default JWT refresh token expiration: 7 days");
        return 7 * 24 * 60 * 60; // 7 days default
    }
}

// --- Password Hashing ---

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

// --- JWT Generation (Using jsonwebtoken - Suitable for Server-Side) ---

export interface AppJwtPayload {
  userId: string;
  // Add other relevant claims if needed
}

export function generateAccessToken(payload: AppJwtPayload): string {
  const secret = getJwtSecret();
  const expiresIn = getAccessTokenExpiresInSeconds();
  return jwt.sign(payload, secret, { expiresIn });
}

export function generateRefreshToken(payload: AppJwtPayload): string {
  const secret = getJwtSecret();
  const expiresIn = getRefreshTokenExpiresInSeconds();
  return jwt.sign(payload, secret, { expiresIn });
}

// --- JWT Verification ---

// Verification using jsonwebtoken (Suitable for Server-Side API Routes)
export function verifyTokenServerSide(token: string): AppJwtPayload | null {
  try {
    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as VerifiedJwtPayload & AppJwtPayload;

    if (!decoded.userId) {
      console.error("Token verification (server-side) failed: Missing userId in payload.");
      return null;
    }
    return { userId: decoded.userId };

  } catch (error) {
    console.error("Token verification (server-side) failed:", error instanceof Error ? error.message : error);
    return null;
  }
}

// Verification using jose (Suitable for Edge Middleware)
// Cache the encoded secret key for performance
let joseSecretKey: Uint8Array | null = null;
function getJoseSecretKey(): Uint8Array {
    if (!joseSecretKey) {
        const secret = getJwtSecret();
        // Ensure the secret is a string before encoding.
        // TextEncoder().encode() expects a string. If getJwtSecret() returns
        // a Buffer (as suggested by the lint error), convert it to a string.
        // String() will handle both string and Buffer inputs appropriately.
        const secretString = String(secret);
        joseSecretKey = new TextEncoder().encode(secretString);
    }
    return joseSecretKey;
}

export async function verifyTokenForMiddleware(token: string): Promise<AppJwtPayload | null> {
    try {
        const secretKey = getJoseSecretKey();
        const { payload } = await jose.jwtVerify(token, secretKey);

        // Type guard to check if payload has userId
        if (payload && typeof payload === 'object' && typeof payload.userId === 'string') {
             return { userId: payload.userId };
        } else {
             console.error("Token verification (middleware) failed: Missing or invalid userId in payload.");
            return null;
        }
    } catch (error) {
        // Common errors: JWTExpired, JWSSignatureVerificationFailed, JWSInvalid
        console.error("Token verification (middleware) failed:", error instanceof Error ? error.message : error);
        return null;
    }
}


// --- Token Extraction ---

export function getTokenFromRequest(req: NextRequest): string | null {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
        return null; 
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
        console.warn("Malformed Authorization header:", authHeader);
        return null;
    }
    return parts[1];
}

// --- Refresh Token Database Operations ---

/**
 * Stores a new refresh token in the database.
 */
export async function storeRefreshToken(userId: string, token: string): Promise<void> { // Removed expiresInSeconds param - get it internally
    try {
        const expiresInSeconds = getRefreshTokenExpiresInSeconds(); // Get duration here
        const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
        await db.insert(refreshTokens).values({
            userId,
            token, // Storing the raw token
            expiresAt,
            revoked: false, // Ensure it starts as not revoked
        });
        console.log(`Stored refresh token for user ${userId}`);
    } catch (error) {
        console.error(`Error storing refresh token for user ${userId}:`, error);
        // Depending on requirements, you might want to throw this error
        // to signal failure in the calling function (e.g., sign-in)
        throw new Error("Failed to store refresh token.");
    }
}

/**
 * Validates a refresh token against the database.
 * Checks if it exists, belongs to the user, is not revoked, and not expired.
 */
export async function validateRefreshToken(userId: string, token: string): Promise<boolean> {
    try {
        // Use verifyTokenServerSide first to check expiry and basic structure using the secret
        const payload = verifyTokenServerSide(token);
        if (!payload || payload.userId !== userId) {
             console.log(`Refresh token JWT validation failed or userId mismatch for user ${userId}`);
             return false;
        }

        // If JWT is valid, check database status (revoked, exists)
        const result = await db.select({ expiresAt: refreshTokens.expiresAt }) // Only select what's needed
            .from(refreshTokens)
            .where(and(
                eq(refreshTokens.userId, userId),
                eq(refreshTokens.token, token),
                eq(refreshTokens.revoked, false) // Check if revoked
            ))
            .limit(1);

        const storedToken = result[0];

        if (!storedToken) {
            console.log(`Refresh token DB validation failed: Token not found or revoked for user ${userId}`);
            return false;
        }

        // Redundant check since verifyTokenServerSide handles expiry, but belt-and-suspenders
        if (storedToken.expiresAt < new Date()) {
             console.log(`Refresh token validation failed: Token expired in DB for user ${userId}`);
             await revokeRefreshToken(userId, token); // Mark as revoked if expired
             return false;
        }

        console.log(`Refresh token validated successfully for user ${userId}`);
        return true;
    } catch (error) {
        console.error(`Error validating refresh token for user ${userId}:`, error);
        return false; // Treat errors as validation failure
    }
}

/**
 * Marks a specific refresh token as revoked in the database.
 */
export async function revokeRefreshToken(userId: string, token: string): Promise<void> {
    try {
        const result = await db.update(refreshTokens)
            .set({ revoked: true })
            .where(and(
                eq(refreshTokens.userId, userId),
                eq(refreshTokens.token, token)
            ));
        
        if (result.rowCount > 0) {
             console.log(`Revoked refresh token successfully for user ${userId}`);
        } else {
             console.log(`Refresh token not found or already revoked for user ${userId} during revoke operation.`);
        }

    } catch (error) {
        console.error(`Error revoking refresh token for user ${userId}:`, error);
        throw new Error("Failed to revoke refresh token.");
    }
}

/**
 * Marks ALL refresh tokens for a specific user as revoked.
 */
export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
     try {
        const result = await db.update(refreshTokens)
            .set({ revoked: true })
            .where(eq(refreshTokens.userId, userId));

        console.log(`Revoked ${result.rowCount} refresh token(s) for user ${userId}`);

    } catch (error) {
        console.error(`Error revoking all refresh tokens for user ${userId}:`, error);
        throw new Error("Failed to revoke refresh tokens for user.");
    }
} 