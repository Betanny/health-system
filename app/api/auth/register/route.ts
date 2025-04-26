import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth';
import { createUser, findUserByEmail } from '@/lib/actions/user.actions'; 

// Define the expected request body schema
const registerSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
  // TO-DO: Add other fields if needed (e.g., name, role)
  // name: z.string().min(2, { message: "Name is required" })
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { email, password } = validation.data;

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json({ message: 'User with this email already exists' }, { status: 409 }); // 409 Conflict
    }

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create the user in the database
    // Ensure createUser accepts the necessary fields and returns the created user (or at least ID)
    const newUser = await createUser({
      email,
      password: hashedPassword,
      // Add other fields passed in validation.data if needed
    });

    // Don't return password hash
    const { password: _, ...userWithoutPassword } = newUser;

    // Return success response
    return NextResponse.json({ 
        message: 'User registered successfully', 
        user: userWithoutPassword 
    }, { status: 201 }); // 201 Created

  } catch (error) {
    console.error('[API_AUTH_REGISTER_ERROR]', error);
    // Handle potential Prisma errors or other specific errors if necessary
    return NextResponse.json({ message: 'An internal server error occurred' }, { status: 500 });
  }
} 