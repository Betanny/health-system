import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyTokenForMiddleware, getTokenFromRequest } from '@/lib/auth';

// 1. Specify protected routes
// Only applies to routes matching this pattern
export const config = {
  matcher: [
      '/api/auth/revoke', // Protect the revoke endpoint
      '/api/clients/:path*', // Protect client CRUD APIs
      '/api/programs/:path*', // Protect program CRUD APIs
      '/api/enrollments/:path*', // Protect enrollment CRUD APIs
      // Add other API routes that need authentication(ideally all of them since it's patient info)
    ],
}

// Extend the NextRequest type to include the user payload after verification
interface AuthenticatedRequest extends NextRequest {
  user?: { userId: string };
}

export async function middleware(request: AuthenticatedRequest) {
  // 2. Check for a token
  const token = getTokenFromRequest(request);

  if (!token) {
    return NextResponse.json(
      { message: 'Authentication required.' },
      { status: 401 }
    )
  }

  // 3. Verify access token using the Edge-compatible function
  const payload = await verifyTokenForMiddleware(token);

  if (!payload) {
    return NextResponse.json(
      { message: 'Invalid or expired token.' }, 
      { status: 401 } 
    )
  }
  
  // 4. Attach user payload to the request object via headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('X-User-Id', payload.userId);

  // 5. Allow request to proceed with added headers
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
} 