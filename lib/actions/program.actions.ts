"use server"

import { revalidatePath } from "next/cache"
import { db, programs as programsTable } from "@/lib/db"
import { eq } from "drizzle-orm"
import { z } from "zod"
import type { Program } from "@/lib/types"
import type { FormState } from "./types";
import { mapDbProgramToAppProgram } from "@/lib/mappers";
// Import schemas from the new location
import { 
    ProgramSchema, 
    UpdateProgramSchema, 
    DeleteProgramSchema, 
    ProgramApiCreateInput, // Import types defined in schema file
    ProgramApiUpdateInput
} from "@/lib/schemas/program.schemas"; 

// --- Zod Schemas for Program ---
// REMOVED from here
// const ProgramSchema = z.object({ ... });
// const UpdateProgramSchema = ProgramSchema.extend({ ... });
// const DeleteProgramSchema = z.object({ ... });

// --- Helper function to map DB program to App program type ---
// Export needed for client.actions and enrollment.actions
// export function mapDbProgramToAppProgram(dbProgram: typeof programsTable.$inferSelect): Program { ... }

// --- Program Data Fetching Functions ---

export async function getAllPrograms(): Promise<Program[]> {
    const dbPrograms = await db.select().from(programsTable).orderBy(programsTable.name);
    // Import and use mapper
    return dbPrograms.map(mapDbProgramToAppProgram);
}

export async function getProgramById(id: string): Promise<Program | null> {
  if (!z.string().uuid().safeParse(id).success) {
      console.error("Invalid UUID format provided to getProgramById:", id);
      return null;
  }
  const result = await db.select().from(programsTable).where(eq(programsTable.id, id)).limit(1);
  if (result.length === 0) {
      return null;
  }
  // Import and use mapper
  return mapDbProgramToAppProgram(result[0]);
}

// --- Program Mutation Actions ---

export async function createProgramAction(
    previousState: FormState | null, 
    formData: FormData
  ): Promise<FormState> { 

  const rawData = Object.fromEntries(formData.entries());
  const validationResult = ProgramSchema.safeParse(rawData);

  if (!validationResult.success) {
    console.error("Program validation failed:", validationResult.error.flatten());
    return { 
      success: false, 
      errors: validationResult.error.flatten().fieldErrors,
      message: "Validation failed. Please check the fields."
    };
  }

  const { name, description } = validationResult.data;

  try {
    // Assuming name/description are not encrypted
    await db.insert(programsTable).values({ 
      name,
      description: description || null,
    });
    console.log("Program created successfully:", name);
    revalidatePath('/programs'); 
    return {
      success: true,
        message: "Program created successfully!",
        errors: null 
    };
  } catch (error: any) {
     console.error("Error creating program:", error);
     let errorMessage = "Failed to create program. Please try again.";
     let errors: Record<string, string[] | undefined> | null = { _form: [errorMessage] };

      if (error.code === '23505' && error.constraint_name?.includes('name')) { 
        errorMessage = "A program with this name already exists.";
        errors = { name: [errorMessage] };
     }
     
    return {
      success: false,
        message: errorMessage, 
        errors: errors 
    };
  }
}

export async function updateProgramAction(
    previousState: FormState | null, 
    formData: FormData
  ): Promise<FormState> {
  
  const rawData = {
     id: formData.get('id') as string,
     name: formData.get('name') as string,
     description: formData.get('description') as string | undefined,
  };

  const FormUpdateProgramSchema = UpdateProgramSchema.extend({
    id: z.string().uuid("Program UUID is required for update"),
  });
  const validationResult = FormUpdateProgramSchema.safeParse(rawData);

  if (!validationResult.success) {
    console.error("Program update validation failed:", validationResult.error.flatten());
    return { 
      success: false, 
      errors: validationResult.error.flatten().fieldErrors,
      message: "Validation failed. Please check the fields."
    };
  }

  const { id, name, description } = validationResult.data;

  try {
    // Assuming name/description are not encrypted
    const result = await db.update(programsTable)
        .set({ name: name, description: description || null, updatedAt: new Date() })
        .where(eq(programsTable.id, id))
        .returning({ updatedId: programsTable.id });

    if (result.length === 0) {
       throw new Error("Program not found for update.");
    }

    console.log("Program updated successfully:", id);
    revalidatePath('/programs'); 
    revalidatePath(`/programs/${id}`); // Assuming program details page exists
    return { 
        success: true, 
        message: "Program updated successfully!",
        errors: null 
    };
  } catch (error: any) {
    console.error(`Error updating program ${id}:`, error);
     let errorMessage = "Failed to update program. Please try again.";
     let errors: Record<string, string[] | undefined> | null = { _form: [errorMessage] };

     if (error.message === "Program not found for update.") {
         errorMessage = error.message;
         errors = { _form: [errorMessage] };
     }
     else if (error.code === '23505' && error.constraint_name?.includes('name')) { 
        errorMessage = "Another program with this name already exists.";
        errors = { name: [errorMessage] };
     }
     
    return { 
        success: false, 
        message: errorMessage, 
        errors: errors 
    };
  }
}

export async function deleteProgramAction(
    previousState: FormState | null, 
    formData: FormData
  ): Promise<FormState> {

  const rawData = { id: formData.get('id') as string };
  const validationResult = DeleteProgramSchema.safeParse(rawData);

  if (!validationResult.success) {
     console.error("Program delete validation failed:", validationResult.error.flatten());
     return { 
       success: false, 
       errors: { _form: validationResult.error.flatten().formErrors },
       message: "Invalid Program ID."
     };
   }
  
  const { id } = validationResult.data;

  try {
    const result = await db.delete(programsTable)
        .where(eq(programsTable.id, id))
        .returning({ deletedId: programsTable.id });

     if (result.length === 0) {
       throw new Error("Program not found for deletion.");
     }

    console.log("Program deleted successfully:", id);
    revalidatePath('/programs'); 
    return { 
        success: true, 
        message: "Program deleted successfully!",
        errors: null 
    };
  } catch (error: any) {
    console.error(`Error deleting program ${id}:`, error);
    let errorMessage = "Failed to delete program. Please try again.";
    // Add check for foreign key constraint violation if enrollments depend on programs
    if (error.code === '23503') { // Check specific DB error code for FK violation
       errorMessage = "Cannot delete program with active enrollments.";
    } else if (error.message === "Program not found for deletion.") {
       errorMessage = error.message;
    }
    return { 
        success: false, 
        message: errorMessage, 
        errors: { _form: [errorMessage] } 
    };
  }
}

// --- API-Specific Program Mutations ---

// Types ProgramApiCreateInput, ProgramApiUpdateInput are now imported

export async function createProgramApi(programData: ProgramApiCreateInput): Promise<Program> {
    const validationResult = ProgramSchema.safeParse(programData);
    if (!validationResult.success) {
        console.error("[API Create Program] Validation failed:", validationResult.error.flatten());
        throw new Error(`Validation failed: ${JSON.stringify(validationResult.error.flatten().fieldErrors)}`);
    }

    const { name, description } = validationResult.data;

    try {
        const insertResult = await db.insert(programsTable).values({ 
            name,
            description: description || null,
        }).returning();

        if (!insertResult || insertResult.length === 0) {
            throw new Error("Program creation failed, no data returned from DB.");
        }

        console.log("[API Create Program] Program created successfully:", insertResult[0].id);
        return mapDbProgramToAppProgram(insertResult[0]);

    } catch (error: any) {
        console.error("[API Create Program] Error:", error);
        if (error.code === '23505' && error.constraint_name?.includes('name')) { 
            throw new Error("A program with this name already exists.");
        } else if (error.message.startsWith("Validation failed")) {
            throw error; // Re-throw validation error
        }
        throw new Error("Failed to create program due to a database error.");
    }
}

export async function updateProgramApi(programId: string, programData: ProgramApiUpdateInput): Promise<Program> {
    // Validate UUID
    if (!z.string().uuid().safeParse(programId).success) {
        throw new Error("Invalid program ID format.");
    }
    
    // Validate input data (allow partial)
    const validationResult = ProgramSchema.partial().safeParse(programData); // Keep validation as partial
    if (!validationResult.success) {
        console.error("[API Update Program] Validation failed:", validationResult.error.flatten());
        throw new Error(`Validation failed: ${JSON.stringify(validationResult.error.flatten().fieldErrors)}`);
    }
    
    const dataToUpdate: Record<string, any> = {};
    const validatedData = validationResult.data;
    let hasChanges = false;

    if (validatedData.name !== undefined) { dataToUpdate.name = validatedData.name; hasChanges = true; }
    if (validatedData.description !== undefined) { dataToUpdate.description = validatedData.description || null; hasChanges = true; }

    if (!hasChanges) {
        throw new Error("No valid fields provided for update.");
    }

    dataToUpdate.updatedAt = new Date();

    try {
        const updateResult = await db.update(programsTable)
            .set(dataToUpdate)
            .where(eq(programsTable.id, programId))
            .returning();

        if (!updateResult || updateResult.length === 0) {
            throw new Error("Program not found or update failed.");
        }

        console.log("[API Update Program] Program updated successfully:", updateResult[0].id);
        return mapDbProgramToAppProgram(updateResult[0]);

    } catch (error: any) {
        console.error("[API Update Program] Error:", error);
        if (error.code === '23505' && error.constraint_name?.includes('name')) { 
            throw new Error("Another program with this name already exists.");
        } else if (error.message.startsWith("Validation failed") || error.message.startsWith("No valid fields") || error.message.startsWith("Invalid program ID")) {
            throw error; // Re-throw specific errors
        }
        throw new Error("Failed to update program due to a database error.");
    }
}

/**
 * Deletes a program by ID.
 * @param programId The UUID of the program to delete.
 * @returns void
 * @throws Error if program not found or DB error occurs (e.g., FK constraint).
 */
export async function deleteProgramApi(programId: string): Promise<void> {
    // Validate UUID
    if (!z.string().uuid().safeParse(programId).success) {
        throw new Error("Invalid program ID format.");
    }
    
    try {
        const deleteResult = await db.delete(programsTable)
            .where(eq(programsTable.id, programId))
            .returning({ id: programsTable.id });
        
        if (!deleteResult || deleteResult.length === 0) {
            throw new Error("Program not found.");
        }

        console.log("[API Delete Program] Program deleted successfully:", programId);

    } catch (error: any) {
         console.error("[API Delete Program] Error:", error);
         if (error.code === '23503') { // Foreign key violation
             throw new Error("Cannot delete program because it has associated enrollments.");
         } else if (error.message.startsWith("Invalid program ID") || error.message.startsWith("Program not found")) {
             throw error; // Re-throw specific known errors
         }
         throw new Error("Failed to delete program due to a database error.");
    }
} 