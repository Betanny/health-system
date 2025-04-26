"use server"

import { revalidatePath } from "next/cache"
import { db, enrollments as enrollmentsTable, enrollmentStatusEnum } from "@/lib/db"
import { eq, and } from "drizzle-orm"
import { z } from "zod"
import type {  EnrollmentWithDetails } from "@/lib/types"
import { encrypt, decrypt } from '@/lib/crypto';
import { mapDbProgramToAppProgram, mapDbClientToAppClient } from "@/lib/mappers";
import type { FormState } from "./types";
import {
    EnrollmentSchema,
    UpdateEnrollmentSchema,
    DeleteEnrollmentSchema,
    EnrollmentApiCreateInput,
    EnrollmentApiUpdateInput
} from '@/lib/schemas/enrollment.schemas';

// --- Enrollment Data Fetching Functions ---

export async function getAllEnrollmentsWithDetails(): Promise<EnrollmentWithDetails[]> {
    const dbEnrollments = await db.query.enrollments.findMany({
        with: {
            client: {
                // Select only necessary client fields (these ARE encrypted)
                columns: { id: true, firstName: true, lastName: true }
            },
            program: {
                // Select only necessary program fields (assume name is NOT encrypted)
                columns: { id: true, name: true }
            }
        },
        orderBy: (enrollments, { desc }) => [desc(enrollments.enrollmentDate), desc(enrollments.createdAt)]
    });

    // Map the database results to the desired structure, decrypting notes and client names
    return dbEnrollments.map(e => {
        let decryptedNotes = undefined;
        let decryptedFirstName = "[DECRYPTION_FAILED]";
        let decryptedLastName = "[DECRYPTION_FAILED]";

        try {
            decryptedNotes = (e.notes ? decrypt(e.notes) : null) ?? undefined;
        } catch (err) {
            console.error(`Failed to decrypt notes for enrollment ${e.id}:`, err);
            decryptedNotes = "[DECRYPTION_FAILED]";
        }
        try {
            decryptedFirstName = decrypt(e.client.firstName) ?? decryptedFirstName;
        } catch (err) {
            console.error(`Failed to decrypt firstName for client ${e.client.id} via enrollment ${e.id}:`, err);
        }
         try {
            decryptedLastName = decrypt(e.client.lastName) ?? decryptedLastName;
        } catch (err) {
            console.error(`Failed to decrypt lastName for client ${e.client.id} via enrollment ${e.id}:`, err);
        }
        
        return {
            id: e.id,
            clientId: e.clientId,
            programId: e.programId,
            enrollmentDate: e.enrollmentDate,
            status: e.status,
            notes: decryptedNotes as string | undefined,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
            client: {
                id: e.client.id,
                firstName: decryptedFirstName,
                lastName: decryptedLastName,
            },
            program: {
                id: e.program.id,
                name: e.program.name,
            }
        };
    });
}

// Function to get all enrollments for API (potentially paginated/filtered later)
export async function getAllEnrollmentsApi(): Promise<EnrollmentWithDetails[]> {
    const dbEnrollments = await db.query.enrollments.findMany({
        with: {
            client: { columns: { id: true, firstName: true, lastName: true } },
            program: { columns: { id: true, name: true } }
        },
        orderBy: (enrollments, { desc }) => [desc(enrollments.enrollmentDate), desc(enrollments.createdAt)]
    });
    return dbEnrollments.map(mapDbEnrollmentToApiType); // Use the new mapper
}

// Function to get enrollments for a specific client
export async function getEnrollmentsByClientApi(clientId: string): Promise<EnrollmentWithDetails[]> {
    if (!z.string().uuid().safeParse(clientId).success) {
        throw new Error("Invalid client ID format.");
    }
    
    const dbEnrollments = await db.query.enrollments.findMany({
        where: eq(enrollmentsTable.clientId, clientId),
        with: {
            // Client info is known from context, only need program
            program: { columns: { id: true, name: true } }
            // Optionally include shallow client info if needed by API consumer
            // client: { columns: { id: true, firstName: true, lastName: true } }, 
        },
        orderBy: (enrollments, { desc }) => [desc(enrollments.enrollmentDate), desc(enrollments.createdAt)]
    });

    return dbEnrollments.map(mapDbEnrollmentToApiType); 
}

// Function to get a single enrollment by its ID
export async function getEnrollmentByIdApi(enrollmentId: string): Promise<EnrollmentWithDetails | null> {
    if (!z.string().uuid().safeParse(enrollmentId).success) {
        throw new Error("Invalid enrollment ID format.");
    }

    const dbEnrollment = await db.query.enrollments.findFirst({
        where: eq(enrollmentsTable.id, enrollmentId),
        with: {
            client: { columns: { id: true, firstName: true, lastName: true } },
            program: { columns: { id: true, name: true } }
        }
    });

    if (!dbEnrollment) {
        return null;
    }

    return mapDbEnrollmentToApiType(dbEnrollment);
}

// Helper function to map DB enrollment to API type (DRY principle)
function mapDbEnrollmentToApiType(e: any): EnrollmentWithDetails {
    let decryptedNotes = undefined;
    try {
        decryptedNotes = (e.notes ? decrypt(e.notes) : null) ?? undefined;
    } catch (err) {
        console.error(`Failed to decrypt notes for enrollment ${e.id}:`, err);
        decryptedNotes = "[DECRYPTION_FAILED]";
    }
    
    // Map client (decrypts names) - ensure query only selected needed fields
    const clientInfo = e.client 
        // The dbClient object passed here only has fields selected in the query (id, firstName, lastName)
        ? mapDbClientToAppClient(e.client) // Use the full mapper, but on limited data 
        : { id: e.clientId, firstName: '[MISSING]', lastName: '[DATA]', dateOfBirth: '', gender:'', contactNumber:'', email:'', address:'', createdAt: 'N/A', updatedAt:'N/A' }; // Match Client type

    // Map program (assuming name is not encrypted)
    const programInfo = e.program 
        ? mapDbProgramToAppProgram(e.program) 
        : { id: e.programId, name: '[MISSING PROGRAM DATA]', description: null, createdAt: 'N/A', updatedAt: 'N/A' };

    return {
        id: e.id,
        clientId: e.clientId,
        programId: e.programId,
        enrollmentDate: e.enrollmentDate,
        status: e.status,
        notes: decryptedNotes as string | undefined,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        client: { // Return simplified client structure
            id: clientInfo.id,
            firstName: clientInfo.firstName,
            lastName: clientInfo.lastName,
        },
        program: { // Return simplified program structure
            id: programInfo.id,
            name: programInfo.name,
        }
    };
}

// --- Enrollment Mutation Actions ---

export async function createEnrollmentAction(
    previousState: FormState | null, 
    formData: FormData
): Promise<FormState> { 

   const rawData = {
     clientId: formData.get('clientId') as string, 
     programId: formData.get('programId') as string, 
     enrollmentDate: formData.get('enrollmentDate') as string,
     status: formData.get('status') as typeof enrollmentStatusEnum.enumValues[number],
     notes: formData.get('notes') as string | undefined,
  };

  const validationResult = EnrollmentSchema.safeParse(rawData);

  if (!validationResult.success) {
    console.error("Enrollment creation validation failed:", validationResult.error.flatten());
    return { 
        success: false, 
        errors: validationResult.error.flatten().fieldErrors,
        message: "Validation failed. Please check the fields."
    }; 
  }

  const { clientId, programId, enrollmentDate, status, notes } = validationResult.data;

  try {
    const existingEnrollment = await db.select({ id: enrollmentsTable.id }).from(enrollmentsTable).where(
        and(
            eq(enrollmentsTable.clientId, clientId),
            eq(enrollmentsTable.programId, programId)
        )
    ).limit(1);

    if (existingEnrollment.length > 0) {
        const message = "This client is already enrolled in this specific program.";
        console.warn(`Client ${clientId} already enrolled in program ${programId}.`);
        return { 
            success: false, 
            errors: { _form: [message] },
            message: message 
        };
    }

    await db.insert(enrollmentsTable).values({ 
      clientId,
      programId,
      enrollmentDate,
      status,
      notes: notes ? encrypt(notes) : null, // Encrypt notes(Might include sensitive info, you never know)
    });
    console.log(`Enrollment created for client ${clientId} in program ${programId}`);
    revalidatePath(`/clients/${clientId}`); 
    return {
      success: true,
        message: "Enrollment created successfully!",
        errors: null 
    };
  } catch (error) {
    console.error("Error creating enrollment:", error);
    const message = "Failed to create enrollment. Please try again.";
    return {
      success: false,
        errors: { _form: [message] },
        message: message 
    };
  }
}

export async function updateEnrollmentAction(
    previousState: FormState | null,
    formData: FormData
  ): Promise<FormState> {

  const rawData = {
    id: formData.get('id') as string, // Get ID from form for validation
    enrollmentDate: formData.get('enrollmentDate') as string,
    status: formData.get('status') as typeof enrollmentStatusEnum.enumValues[number],
    notes: formData.get('notes') as string | undefined,
  };
  
  // Extend the UpdateEnrollmentSchema temporarily for form action validation
  const FormUpdateSchema = UpdateEnrollmentSchema.extend({ 
      id: z.string().uuid("Enrollment ID is required for update")
  });

  const validationResult = FormUpdateSchema.safeParse(rawData);

  if (!validationResult.success) {
    console.error("Enrollment update validation failed:", validationResult.error.flatten());
    return { 
      success: false, 
      errors: validationResult.error.flatten().fieldErrors,
      message: "Validation failed. Please check the fields."
    };
  }

  // Destructure validated data, including the ID
  const { id, enrollmentDate, status, notes } = validationResult.data; 

  try {
     // Fetch clientId before updating for revalidation path
     const enrollmentToUpdate = await db.query.enrollments.findFirst({ where: eq(enrollmentsTable.id, id), columns: { clientId: true } });
     if (!enrollmentToUpdate) {
        throw new Error("Enrollment not found for update.");
     }
     const clientId = enrollmentToUpdate.clientId;

    // Prepare data for update (only fields being updated)
    const dataToSet: Record<string, any> = { updatedAt: new Date() };
    if (enrollmentDate) dataToSet.enrollmentDate = enrollmentDate;
    if (status) dataToSet.status = status;
    // Allow setting notes to null explicitly
    if (notes !== undefined) dataToSet.notes = notes ? encrypt(notes) : null;

    const result = await db.update(enrollmentsTable)
      .set(dataToSet)
      .where(eq(enrollmentsTable.id, id))
      .returning({ updatedId: enrollmentsTable.id });

    if (result.length === 0) {
       throw new Error("Enrollment found but failed to update."); 
    }

    console.log("Enrollment updated successfully:", id);
    revalidatePath(`/clients/${clientId}`);
    revalidatePath('/enrollments');
    return { 
        success: true, 
        message: "Enrollment updated successfully!",
        errors: null 
    };
  } catch (error: any) {
    console.error(`Error updating enrollment ${id}:`, error);
    let errorMessage = "Failed to update enrollment. Please try again.";
    if (error.message?.includes("Enrollment not found")) {
        errorMessage = error.message;
    } else if (error.message?.includes("failed to update")) {
         errorMessage = error.message;
    }
    return { 
        success: false, 
        message: errorMessage, 
        errors: { _form: [errorMessage] } 
    };
  }
}

export async function deleteEnrollmentAction(
    previousState: FormState | null,
    formData: FormData
  ): Promise<FormState> {

  const rawData = { id: formData.get('id') as string }; // ID comes from form
  const validationResult = DeleteEnrollmentSchema.safeParse(rawData); // Validate the ID

  if (!validationResult.success) {
     console.error("Enrollment delete validation failed:", validationResult.error.flatten());
     return { 
       success: false, 
       errors: { _form: validationResult.error.flatten().formErrors },
       message: "Invalid Enrollment ID."
     };
   }
  
  const { id } = validationResult.data; // Get validated ID

  try {
     // Fetch clientId before deleting for revalidation path
     const enrollmentToDelete = await db.query.enrollments.findFirst({ where: eq(enrollmentsTable.id, id), columns: { clientId: true } });
     if (!enrollmentToDelete) {
         throw new Error("Enrollment not found for deletion.");
     }
     const clientId = enrollmentToDelete.clientId;

    const result = await db.delete(enrollmentsTable)
        .where(eq(enrollmentsTable.id, id))
        .returning({ deletedId: enrollmentsTable.id });

     if (result.length === 0) {
       // Should be caught by findFirst check above, but good to have defense
       throw new Error("Enrollment not found during delete operation.");
     }

    console.log("Enrollment deleted successfully:", id);
    revalidatePath(`/clients/${clientId}`);
    revalidatePath('/enrollments'); 
    return { 
        success: true, 
        message: "Enrollment deleted successfully!",
        errors: null 
    };
  } catch (error: any) {
    console.error(`Error deleting enrollment ${id}:`, error);
    let errorMessage = "Failed to delete enrollment. Please try again.";
    if (error.message?.includes("failed to delete")) {
       errorMessage = error.message;
    }
    return { 
        success: false, 
        message: errorMessage, 
        errors: { _form: [errorMessage] } 
    };
  }
} 

// --- API-Specific Enrollment Mutations ---

/**
 * Creates a new enrollment from API request data.
 * @param enrollmentData Raw enrollment data.
 * @returns The newly created enrollment data (with decrypted notes if applicable).
 * @throws Error on validation, duplicate enrollment, or DB error.
 */
export async function createEnrollmentApi(enrollmentData: EnrollmentApiCreateInput): Promise<EnrollmentWithDetails> {
    const validationResult = EnrollmentSchema.safeParse(enrollmentData);
    if (!validationResult.success) {
        console.error("[API Create Enrollment] Validation failed:", validationResult.error.flatten());
        throw new Error(`Validation failed: ${JSON.stringify(validationResult.error.flatten().fieldErrors)}`);
    }

    const { clientId, programId, enrollmentDate, status, notes } = validationResult.data;

    try {
        // Check for existing enrollment
        const existingEnrollment = await db.query.enrollments.findFirst({
            where: and(eq(enrollmentsTable.clientId, clientId), eq(enrollmentsTable.programId, programId)),
            columns: { id: true }
        });
        if (existingEnrollment) {
            throw new Error("Client is already enrolled in this program.");
        }

        const insertResult = await db.insert(enrollmentsTable).values({ 
            clientId,
            programId,
            enrollmentDate,
            status,
            notes: notes ? encrypt(notes) : null,
        }).returning(); 
        
        if (!insertResult || insertResult.length === 0) {
            throw new Error("Enrollment creation failed, no data returned from DB.");
        }
        const newEnrollmentId = insertResult[0].id;
        console.log("[API Create Enrollment] Enrollment created successfully:", newEnrollmentId);
        
        // Fetch the newly created enrollment with details to return
        const createdEnrollmentDetails = await getEnrollmentByIdApi(newEnrollmentId);
        if (!createdEnrollmentDetails) { 
            console.error(`[API Create Enrollment] Failed to fetch details for newly created enrollment ${newEnrollmentId}`);
            throw new Error("Enrollment created but failed to retrieve details.");
        }
        return createdEnrollmentDetails;

    } catch (error: any) {
        console.error("[API Create Enrollment] Error:", error);
        if (error.message.startsWith("Validation failed") || error.message.includes("already enrolled")) {
            throw error; // Re-throw specific known errors
        }
        if (error.code === '23503') { 
            throw new Error("Invalid Client or Program ID provided.");
        }
        throw new Error("Failed to create enrollment due to a database error.");
    }
}

/**
 * Updates an existing enrollment from API request data.
 * @param enrollmentId The UUID of the enrollment to update.
 * @param enrollmentData Raw enrollment data (partial is allowed by schema).
 * @returns The updated enrollment data.
 * @throws Error on validation, DB error, or if enrollment not found.
 */
export async function updateEnrollmentApi(enrollmentId: string, enrollmentData: EnrollmentApiUpdateInput): Promise<EnrollmentWithDetails> {
    // Validate UUID
    if (!z.string().uuid().safeParse(enrollmentId).success) {
        throw new Error("Invalid enrollment ID format.");
    }
    
    // Validate input data (allows partial)
    const validationResult = UpdateEnrollmentSchema.safeParse(enrollmentData);
    if (!validationResult.success) {
        console.error("[API Update Enrollment] Validation failed:", validationResult.error.flatten());
        throw new Error(`Validation failed: ${JSON.stringify(validationResult.error.flatten().fieldErrors)}`);
    }
    
    const dataToUpdate: Record<string, any> = {};
    const validatedData = validationResult.data;
    let hasChanges = false;

    if (validatedData.enrollmentDate !== undefined) { dataToUpdate.enrollmentDate = validatedData.enrollmentDate; hasChanges = true; }
    if (validatedData.status !== undefined) { dataToUpdate.status = validatedData.status; hasChanges = true; }
    if (validatedData.notes !== undefined) { 
        dataToUpdate.notes = validatedData.notes ? encrypt(validatedData.notes) : null; 
        hasChanges = true; 
    }

    if (!hasChanges) {
        throw new Error("No valid fields provided for update.");
    }

    dataToUpdate.updatedAt = new Date();

    try {
        const updateResult = await db.update(enrollmentsTable)
            .set(dataToUpdate)
            .where(eq(enrollmentsTable.id, enrollmentId))
            .returning();

        if (!updateResult || updateResult.length === 0) {
            throw new Error("Enrollment not found or update failed.");
        }
        const updatedId = updateResult[0].id;
        console.log("[API Update Enrollment] Enrollment updated successfully:", updatedId);
        
        // Fetch the updated enrollment with details
        const updatedEnrollmentDetails = await getEnrollmentByIdApi(updatedId);
         if (!updatedEnrollmentDetails) { 
            console.error(`[API Update Enrollment] Failed to fetch details for updated enrollment ${updatedId}`);
            throw new Error("Enrollment updated but failed to retrieve details.");
        }
        return updatedEnrollmentDetails;

    } catch (error: any) {
        console.error("[API Update Enrollment] Error:", error);
        if (error.message.startsWith("Validation failed") || error.message.startsWith("No valid fields") || error.message.startsWith("Invalid enrollment ID") || error.message.includes("not found or update failed")) {
            throw error; // Re-throw specific errors
        }
        throw new Error("Failed to update enrollment due to a database error.");
    }
}

/**
 * Deletes an enrollment by ID.
 * @param enrollmentId The UUID of the enrollment to delete.
 * @returns void
 * @throws Error if enrollment not found or DB error occurs.
 */
export async function deleteEnrollmentApi(enrollmentId: string): Promise<void> {
    // Validate UUID
    if (!z.string().uuid().safeParse(enrollmentId).success) {
        throw new Error("Invalid enrollment ID format.");
    }
    
    try {
        const deleteResult = await db.delete(enrollmentsTable)
            .where(eq(enrollmentsTable.id, enrollmentId))
            .returning({ id: enrollmentsTable.id });
        
        if (!deleteResult || deleteResult.length === 0) {
            throw new Error("Enrollment not found.");
        }

        console.log("[API Delete Enrollment] Enrollment deleted successfully:", enrollmentId);

    } catch (error: any) {
         console.error("[API Delete Enrollment] Error:", error);
         if (error.message.startsWith("Invalid enrollment ID") || error.message.startsWith("Enrollment not found")) {
             throw error; // Re-throw specific known errors
         }
         throw new Error("Failed to delete enrollment due to a database error.");
    }
} 