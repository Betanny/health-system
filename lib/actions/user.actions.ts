import { db, users } from '@/lib/db'; // Import Drizzle db instance and users schema
import { eq } from 'drizzle-orm';
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';

// Infer TS types from the Drizzle schema
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Type for creating a user (excluding DB-generated fields like id, createdAt, updatedAt)
// Ensure this aligns with the data expected in the register route
export type CreateUserInput = Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Finds a user by their email address using Drizzle.
 * @param email - The user's email.
 * @returns The user object or undefined if not found.
 */
export async function findUserByEmail(email: string): Promise<User | undefined> {
  console.log(`Drizzle: Attempting to find user by email: ${email}`);
  try {
    // Drizzle query to find a user by email
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = result[0]; // Drizzle returns an array, get the first element
    console.log(`Drizzle: Found user by email: ${user ? user.id : 'None'}`);
    return user;
  } catch (error) {
    console.error("Drizzle: Error finding user by email:", error);
    // Throwing an error here might be better to propagate DB issues
    throw new Error("Database error while finding user by email.");
  }
}

/**
 * Creates a new user in the database using Drizzle.
 * @param userData - The user data (email, hashedPassword).
 * @returns The created user object.
 */
export async function createUser(userData: CreateUserInput): Promise<User> {
  console.log(`Drizzle: Attempting to create user with email: ${userData.email}`);
  try {
    // Drizzle query to insert a new user
    const result = await db.insert(users).values(userData).returning(); // returning() gets the inserted row
    
    if (!result || result.length === 0) {
      throw new Error("User creation failed, no data returned.")
    }
    const newUser = result[0];
    console.log(`Drizzle: Created user with ID: ${newUser.id}`);
    return newUser;
  } catch (error) {
    console.error("Drizzle: Error creating user:", error);
    // Handle potential database errors (e.g., unique constraint violation)
    if (error instanceof Error && 'code' in error && error.code === '23505') { // Example for PostgreSQL unique violation
         throw new Error("User with this email already exists.");
    }
    throw new Error("Database error while creating user.");
  }
}

/**
 * Finds a user by their ID using Drizzle.
 * @param id - The user's ID.
 * @returns The user object or undefined if not found.
 */
export async function findUserById(id: string): Promise<User | undefined> {
  console.log(`Drizzle: Attempting to find user by ID: ${id}`);
  try {
    // Drizzle query to find a user by ID
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const user = result[0];
    console.log(`Drizzle: Found user by ID: ${user ? user.id : 'None'}`);
    return user;
  } catch (error) {
    console.error("Drizzle: Error finding user by ID:", error);
    throw new Error("Database error while finding user by ID.");
  }
}

// No longer need explicit export {}; as we have actual exports 