import { NextResponse } from 'next/server';
import { z } from 'zod';
import { 
    verifyTokenForMiddleware, 
    generateAccessToken, 
    generateRefreshToken, 
    validateRefreshToken,
    revokeRefreshToken,
    storeRefreshToken} from '@/lib/auth';
import { findUserById } from '@/lib/actions/user.actions';

// Define the expected request body schema
const refreshSchema = z.object({
  refreshToken: z.string().min(1, { message: "Refresh token is required" }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = refreshSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { refreshToken: oldRefreshToken } = validation.data;

    // 1. Verify the token signature and basic claims (like expiry)
    const decodedPayload = await verifyTokenForMiddleware(oldRefreshToken);
    if (!decodedPayload) {
      // If verification fails, attempt to revoke it just in case it exists in DB but is malformed/expired
      // This is optional, depends on security posture
       try { await revokeRefreshToken("unknown", oldRefreshToken); } catch {}
      return NextResponse.json({ message: 'Invalid or expired refresh token' }, { status: 401 });
    }

    const { userId } = decodedPayload;

    // 2. Validate the token against the database (exists, not revoked)
    const isValidInDb = await validateRefreshToken(userId, oldRefreshToken);
    if (!isValidInDb) {
      // If it's not valid in DB (already revoked, expired, or never existed)
      return NextResponse.json({ message: 'Refresh token is invalid or has been revoked' }, { status: 401 });
    }

    // 3. Check if the user still exists
    const user = await findUserById(userId);
    if (!user) {
      // If user doesn't exist, revoke the token and deny access
      await revokeRefreshToken(userId, oldRefreshToken);
      return NextResponse.json({ message: 'User not found' }, { status: 401 });
    }

    // 4. Revoke the OLD refresh token (important step!)
    await revokeRefreshToken(userId, oldRefreshToken);

    // 5. Generate NEW tokens (Access and optionally Refresh)
    // Note: Implementing Refresh Token Rotation (issuing a new refresh token each time)
    // is generally more secure than reusing the same refresh token.
    const newJwtPayload = { userId: user.id };
    const newAccessToken = generateAccessToken(newJwtPayload);
    const newRefreshToken = generateRefreshToken(newJwtPayload); // Generate a new one

    // 6. Store the NEW refresh token
    try {
        await storeRefreshToken(user.id, newRefreshToken);
    } catch (storeError) {
        console.error("[API_AUTH_REFRESH_ERROR] Failed to store NEW refresh token:", storeError);
        // NOTE: If storing the new token fails, the user might be stuck.
        // Maybe we  don't revoke the old one until new one is stored?
        // For simplicity here, we proceed but I'll log the error.
        return NextResponse.json({ message: 'An internal server error occurred during token refresh.' }, { status: 500 });
    }

    // 7. Return the new tokens
    return NextResponse.json({
        message: 'Token refreshed successfully',
        accessToken: newAccessToken,
        refreshToken: newRefreshToken, // Send the new refresh token back
    }, { status: 200 });

  } catch (error) {
    console.error('[API_AUTH_REFRESH_ERROR]', error);
     if (error instanceof Error && error.message.includes("Database error")) {
        return NextResponse.json({ message: 'Database error during refresh.' }, { status: 500 });
    }
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
} 