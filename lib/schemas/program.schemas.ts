import { z } from "zod";

// --- Zod Schemas for Program ---
export const ProgramSchema = z.object({
  name: z.string().min(1, "Program name is required"),
  description: z.string().optional(),
});

export const UpdateProgramSchema = ProgramSchema.extend({
  // ID is validated from path params in API routes, not needed in body schema usually
  // id: z.string().uuid("Program UUID is required for update"),
});

export const DeleteProgramSchema = z.object({
  id: z.string().uuid("Program UUID is required for deletion"),
});

// Define types based on schemas for API usage if needed elsewhere
export type ProgramApiCreateInput = z.infer<typeof ProgramSchema>;
// Explicitly define update type
export type ProgramApiUpdateInput = {
    name?: string;
    description?: string | null;
}; 