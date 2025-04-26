import { z } from "zod";
import type { Client } from "@/lib/types"; // Import base Client type if needed

// --- Zod Schema for Client --- 
export const ClientSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  gender: z.string().optional(),
  contactNumber: z.string().min(1, "Contact number is required"),
  email: z.string().email("Invalid email address").min(1, "Email is required"),
  address: z.string().optional(),
});

// Schema for validating updates via Form Actions (requires ID)
export const UpdateClientFormSchema = ClientSchema.extend({
  id: z.string().uuid("Client UUID is required for update"),
});

// Schema for validating deletes via Form Actions (requires ID)
export const DeleteClientFormSchema = z.object({
  id: z.string().uuid("Client UUID is required for deletion"),
});

// --- API Specific Types ---

// Type for API creation (raw data before validation/encryption)
// Matches ClientSchema structure
export type ClientApiCreateInput = z.infer<typeof ClientSchema>;

// Explicitly define API update type
export type ClientApiUpdateInput = {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string | null; // Allow null if needed
    contactNumber?: string;
    email?: string;
    address?: string | null; // Allow null if needed
}; 