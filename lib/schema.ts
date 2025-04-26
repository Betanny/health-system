import { pgTable, text, varchar, timestamp, date, uuid, pgEnum, boolean } from 'drizzle-orm/pg-core';

// Enum for enrollment status
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['active', 'completed', 'withdrawn']);

// Clients table
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  dateOfBirth: text('date_of_birth').notNull(),
  gender: text('gender'),
  contactNumber: text('contact_number').notNull(),
  email: text('email').notNull().unique(),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Programs table
export const programs = pgTable('programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 256 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Enrollments table
export const enrollments = pgTable('enrollments', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(), // Foreign key to clients
  programId: uuid('program_id').references(() => programs.id, { onDelete: 'cascade' }).notNull(), // Foreign key to programs
  enrollmentDate: date('enrollment_date').notNull(),
  status: enrollmentStatusEnum('status').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Define relations (optional but helpful for querying)
import { relations } from 'drizzle-orm';

export const clientRelations = relations(clients, ({ many }) => ({
  enrollments: many(enrollments),
}));

export const programRelations = relations(programs, ({ many }) => ({
  enrollments: many(enrollments),
}));

export const enrollmentRelations = relations(enrollments, ({ one }) => ({
  client: one(clients, {
    fields: [enrollments.clientId],
    references: [clients.id],
  }),
  program: one(programs, {
    fields: [enrollments.programId],
    references: [programs.id],
  }),
}));

// Users table (for authentication)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(), // We'lltore hashed passwords here
  // TO-DO:Add other user-related fields if needed (e.g., name, role)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Refresh Tokens table (for tracking valid/revoked refresh tokens)
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  token: text('token').notNull().unique(), // Store the actual refresh token or a unique hash of it
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked: boolean('revoked').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Add relations for the new tables
export const userRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  // TO-DO: Add other relations if users are linked elsewhere
}));

export const refreshTokenRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// TO-DO: Define relations for users if needed (e.g., if users are linked to clients)
// export const userRelations = relations(users, ({ one/many }) => ({ ... })); 