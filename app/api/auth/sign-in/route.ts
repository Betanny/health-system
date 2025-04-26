import { NextResponse } from 'next/server';
import { z } from 'zod';
import { comparePassword, generateAccessToken, generateRefreshToken, storeRefreshToken } from '@/lib/auth';
import { findUserByEmail } from '@/lib/actions/user.actions';

// Define the expected request body schema
const signInSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password cannot be empty" }), // Basic check, adjust as needed
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = signInSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, password } = validation.data;

    // Find the user by email
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 }); // Unauthorized
    }
    
    // IMPORTANT: Ensure your User model/type from Prisma includes the password field
    // If Prisma excludes it by default, adjust the findUserByEmail query or type
    if (!user.password) {
        console.error(`User ${user.id} found but has no password field.`);
        return NextResponse.json({ message: 'An internal server error occurred during login.' }, { status: 500 });
    }

    // Compare the provided password with the stored hash
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid email or password' }, { status: 401 }); // Unauthorized
    }

    // Generate JWT tokens
    const jwtPayload = { userId: user.id };
    const accessToken = generateAccessToken(jwtPayload);
    const refreshToken = generateRefreshToken(jwtPayload);

    // Store the new refresh token in the database
    try {
        await storeRefreshToken(user.id, refreshToken);
    } catch (storeError) {
        console.error("[API_AUTH_SIGN_IN_ERROR] Failed to store refresh token:", storeError);
        // Decide if login should fail if token storing fails. Usually yes.
        return NextResponse.json({ message: 'An internal server error occurred during login process.' }, { status: 500 });
    }

    // Don't return password hash
    const { password: _, ...userWithoutPassword } = user;

    // Return tokens and user info
    return NextResponse.json({
      message: 'Sign in successful',
      accessToken,
      refreshToken,
      user: userWithoutPassword,
    }, { status: 200 });

  } catch (error) {
    console.error('[API_AUTH_SIGN_IN_ERROR]', error);
    // Catch errors from findUserByEmail or comparePassword
     if (error instanceof Error && error.message.includes("Database error")) {
        return NextResponse.json({ message: 'Database error during login.' }, { status: 500 });
    }
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
} 