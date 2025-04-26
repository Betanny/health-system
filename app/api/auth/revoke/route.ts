import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { revokeRefreshToken, revokeAllRefreshTokensForUser } from '@/lib/auth';

// Define the expected request body schema
// Option 1: Revoke a specific token
const revokeSpecificSchema = z.object({
  refreshToken: z.string().min(1, { message: "Refresh token is required" }),
});

// Option 2: Revoke all (no body needed, user identified by access token)

export async function POST(request: NextRequest) {
  // Get user ID from the header added by middleware
  const userId = request.headers.get('X-User-Id');

  // This should not happen if middleware is set up correctly, but we'll check anyway
  if (!userId) {
      console.error("[API_AUTH_REVOKE_ERROR] Missing user ID in authenticated request.");
      return NextResponse.json({ message: 'Authentication error' }, { status: 401 });
  }

  let requestBody;
  try {
      // Try to parse body, but handle cases where it might be empty
      requestBody = await request.json();
  } catch (e) {
      // If parsing fails (e.g., empty body), assume revoke all for this user
      requestBody = null; 
  }

  try {
    // Decide whether to revoke specific token or all tokens
    if (requestBody) {
        const validation = revokeSpecificSchema.safeParse(requestBody);
        if (!validation.success) {
            return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
        }
        const { refreshToken } = validation.data;
        
        // Revoke the specific token for the authenticated user
        await revokeRefreshToken(userId, refreshToken);
        return NextResponse.json({ message: 'Refresh token revoked successfully' }, { status: 200 });

    } else {
        // No valid body or body parsing failed - revoke all tokens for the user
        await revokeAllRefreshTokensForUser(userId);
        return NextResponse.json({ message: 'All refresh tokens revoked successfully' }, { status: 200 });
    }

  } catch (error) {
    console.error('[API_AUTH_REVOKE_ERROR]', error);
    // Handle specific errors if needed (e.g., from revoke functions)
    return NextResponse.json({ message: 'An internal server error occurred during token revocation' }, { status: 500 });
  }
} 