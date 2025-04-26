import { z } from "zod";
import { enrollmentStatusEnum } from "@/lib/db"; // Assuming db exports the enum

// --- Zod Schema for Enrollment ---
export const EnrollmentSchema = z.object({
  clientId: z.string().uuid("Invalid client UUID"),
  programId: z.string().uuid("Invalid program UUID"),
  enrollmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  status: z.enum(enrollmentStatusEnum.enumValues),
  notes: z.string().optional(),
});

// Used for update, only need subset of fields + id
export const UpdateEnrollmentSchema = z.object({
  enrollmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)").optional(),
  status: z.enum(enrollmentStatusEnum.enumValues).optional(),
  notes: z.string().nullable().optional(),
});

export const DeleteEnrollmentSchema = z.object({
  id: z.string().uuid("Enrollment UUID is required for deletion"),
});

// Type for API creation input (can also live here)
export type EnrollmentApiCreateInput = z.infer<typeof EnrollmentSchema>;

// Type for API update input (can also live here)
export type EnrollmentApiUpdateInput = z.infer<typeof UpdateEnrollmentSchema>; 