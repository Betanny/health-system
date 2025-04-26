"use server"

import { revalidatePath } from "next/cache"
import { db, clients as clientsTable } from "@/lib/db" 
import { eq, ilike, or } from "drizzle-orm"
import { z } from "zod"
import type { Client, ClientWithEnrollments } from "@/lib/types" 
import { encrypt, decrypt } from '@/lib/crypto'; 
import type { FormState } from "./types";
import { mapDbClientToAppClient, mapDbProgramToAppProgram } from "@/lib/mappers"; 
import { 
    ClientSchema, 
    UpdateClientFormSchema, 
    DeleteClientFormSchema,
    ClientApiCreateInput, 
    ClientApiUpdateInput
} from "@/lib/schemas/client.schemas";


// --- Client Data Fetching Functions ---

export async function getAllClients(): Promise<Client[]> {
  const dbClients = await db.select().from(clientsTable).orderBy(clientsTable.lastName, clientsTable.firstName);
  return dbClients.map(mapDbClientToAppClient);
}

export async function searchClients(query: string): Promise<Client[]> {
  // If no query, return all clients (decrypted via mapDbClientToAppClient)
  if (!query.trim()) {
    return getAllClients();
  }
  // For now, we log a warning and return an empty array if a search query is provided. TO-DO: Remove this once we have a method to search encrypted fields.
  console.warn(`Search query "${query}" provided, but searching encrypted client fields (name, email, contact) is not supported by the current database query method. Returning empty results.`);
  return []; 
}

export async function getClientById(id: string): Promise<Client | null> {
  if (!z.string().uuid().safeParse(id).success) {
      console.error("Invalid UUID format provided to getClientById:", id);
      return null;
  }
  const result = await db.select().from(clientsTable).where(eq(clientsTable.id, id)).limit(1);
  if (result.length === 0) {
    return null;
  }
  return mapDbClientToAppClient(result[0]);
}

export async function getClientWithEnrollments(clientId: string): Promise<ClientWithEnrollments | null> {
   if (!z.string().uuid().safeParse(clientId).success) {
      console.error("Invalid UUID format provided to getClientWithEnrollments:", clientId);
      return null;
   }
    const clientResult = await db.query.clients.findFirst({
        where: eq(clientsTable.id, clientId),
        with: {
            enrollments: {
                with: {
                    program: true
                },
                orderBy: (enrollments, { desc }) => [desc(enrollments.enrollmentDate)],
            }
        }
    });

    if (!clientResult) {
        return null;
    }

    let decryptedClientFirstName = "[DECRYPTION_FAILED]";
    let decryptedClientLastName = "[DECRYPTION_FAILED]";
    try { decryptedClientFirstName = decrypt(clientResult.firstName) ?? decryptedClientFirstName; } catch (e) { console.error(`Failed to decrypt firstName for client ${clientResult.id}:`, e); }
    try { decryptedClientLastName = decrypt(clientResult.lastName) ?? decryptedClientLastName; } catch (e) { console.error(`Failed to decrypt lastName for client ${clientResult.id}:`, e); }
    
    const clientInfoForNesting = {
        id: clientResult.id, 
        firstName: decryptedClientFirstName,
        lastName: decryptedClientLastName,
    };

    const mappedEnrollments = clientResult.enrollments.map(e => {
        let decryptedNotes = undefined;
        try {
            decryptedNotes = (e.notes ? decrypt(e.notes) : null) ?? undefined;
        } catch(err) {
            console.error(`Failed to decrypt notes for enrollment ${e.id}:`, err);
            decryptedNotes = "[DECRYPTION_FAILED]"; // Indicate failure in notes
        }

        return {
            id: e.id,
            clientId: e.clientId,
            programId: e.programId,
            enrollmentDate: e.enrollmentDate,
            status: e.status,
            notes: decryptedNotes as string | undefined, // Use decrypted (or error placeholder) notes
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString(),
            client: clientInfoForNesting, // Use already decrypted client subset
            program: mapDbProgramToAppProgram(e.program) // Assumes program name doesn't need decryption
        };
    });

    // mapDbClientToAppClient handles decryption for the main client object details
    return {
        ...mapDbClientToAppClient(clientResult),
        enrollments: mappedEnrollments,
    };
}

// --- Client Mutation Actions (Original Form Actions) ---

export async function createClientAction(
    previousState: FormState | null, 
    formData: FormData
  ): Promise<FormState> { 
  
  const rawData = Object.fromEntries(formData.entries());
  const validationResult = ClientSchema.safeParse(rawData);

  if (!validationResult.success) {
    console.error("Client validation failed:", validationResult.error.flatten());
    return {
      success: false,
      errors: validationResult.error.flatten().fieldErrors,
      message: "Validation failed. Please check the fields."
    };
  }

  const { firstName, lastName, dateOfBirth, gender, contactNumber, email, address } = validationResult.data;

  try {
    // Encrypt sensitive data before insertion
    const encryptedFirstName = encrypt(firstName);
    const encryptedLastName = encrypt(lastName);
    const encryptedDateOfBirth = encrypt(dateOfBirth);
    const encryptedGender = gender ? encrypt(gender) : null;
    const encryptedContactNumber = encrypt(contactNumber);
    const encryptedEmail = encrypt(email);
    const encryptedAddress = address ? encrypt(address) : null;

    // Basic check if any essential encryption failed (more robust error handling might be needed)
    if (!encryptedFirstName || !encryptedLastName || !encryptedDateOfBirth || !encryptedContactNumber || !encryptedEmail) {
        console.error("Encryption failed for one or more required client fields.");
        return {
            success: false,
            message: "Failed to securely process client data. Please try again.",
            errors: { _form: ["Internal server error during data encryption."] }
        };
    }

    await db.insert(clientsTable).values({ 
      firstName: encryptedFirstName,
      lastName: encryptedLastName,
      dateOfBirth: encryptedDateOfBirth,
      gender: encryptedGender, 
      contactNumber: encryptedContactNumber,
      email: encryptedEmail, 
      address: encryptedAddress,
    });
    console.log("Client created successfully (encrypted data for email):", encryptedEmail); // Log encrypted email for reference
    revalidatePath('/clients'); 
    return {
      success: true,
      message: "Client registered successfully!",
      errors: null 
    };
  } catch (error: any) {
     console.error("Error creating client:", error);
     let errorMessage = "Failed to create client. Please try again.";
     let errors: Record<string, string[] | undefined> | null = { _form: [errorMessage] }; // Default to general form error

     if (error.code === '23505' && error.constraint_name?.includes('email')) { 
        errorMessage = "Email address already exists.";
        errors = { email: [errorMessage] }; // Specific field error
     }
     
    return {
      success: false,
      message: errorMessage, 
      errors: errors 
    };
  }
}

export async function updateClientAction(
    previousState: FormState | null, 
    formData: FormData
  ): Promise<FormState> {

  const rawData = {
     id: formData.get('id') as string,
     firstName: formData.get('firstName') as string,
     lastName: formData.get('lastName') as string,
     dateOfBirth: formData.get('dateOfBirth') as string,
     gender: formData.get('gender') as string | undefined,
     contactNumber: formData.get('contactNumber') as string,
     email: formData.get('email') as string,
     address: formData.get('address') as string | undefined,
  };

  const validationResult = UpdateClientFormSchema.safeParse(rawData);

  if (!validationResult.success) {
    console.error("Client update validation failed:", validationResult.error.flatten());
    return { 
      success: false, 
      errors: validationResult.error.flatten().fieldErrors,
      message: "Validation failed. Please check the fields."
    };
  }

  const { id, firstName, lastName, dateOfBirth, gender, contactNumber, email, address } = validationResult.data;

  try {
    // Encrypt sensitive data before update
    const encryptedFirstName = encrypt(firstName);
    const encryptedLastName = encrypt(lastName);
    const encryptedDateOfBirth = encrypt(dateOfBirth);
    const encryptedGender = gender ? encrypt(gender) : null;
    const encryptedContactNumber = encrypt(contactNumber);
    const encryptedEmail = encrypt(email);
    const encryptedAddress = address ? encrypt(address) : null;

    // Basic check if any essential encryption failed
    if (!encryptedFirstName || !encryptedLastName || !encryptedDateOfBirth || !encryptedContactNumber || !encryptedEmail) {
        console.error("Encryption failed for one or more required client fields during update.");
        return {
            success: false,
            message: "Failed to securely process client data for update. Please try again.",
            errors: { _form: ["Internal server error during data encryption."] }
        };
    }

    const result = await db.update(clientsTable)
      .set({
        firstName: encryptedFirstName,
        lastName: encryptedLastName,
        dateOfBirth: encryptedDateOfBirth,
        gender: encryptedGender,
        contactNumber: encryptedContactNumber,
        email: encryptedEmail,
        address: encryptedAddress,
        updatedAt: new Date() // Manually update timestamp
      })
      .where(eq(clientsTable.id, id))
      .returning({ updatedId: clientsTable.id });

    if (result.length === 0) {
       throw new Error("Client not found for update.");
    }

    console.log("Client updated successfully:", id);
    revalidatePath('/clients'); 
    revalidatePath(`/clients/${id}`); 
    return { 
        success: true, 
        message: "Client updated successfully!",
        errors: null 
    };
  } catch (error: any) {
    console.error(`Error updating client ${id}:`, error);
    let errorMessage = "Failed to update client. Please try again.";
    let errors: Record<string, string[] | undefined> | null = { _form: [errorMessage] };

    if (error.message === "Client not found for update.") {
        errorMessage = error.message;
    } else if (error.code === '23505' && error.constraint_name?.includes('email')) { 
        errorMessage = "Another client with this email address already exists.";
        errors = { email: [errorMessage] };
    }
    
    return { 
        success: false, 
        message: errorMessage, 
        errors: errors 
    };
  }
}

export async function deleteClientAction(
    previousState: FormState | null, 
    formData: FormData
  ): Promise<FormState> {

  const rawData = { id: formData.get('id') as string };
  const validationResult = DeleteClientFormSchema.safeParse(rawData);

  if (!validationResult.success) {
     console.error("Client delete validation failed:", validationResult.error.flatten());
     return { 
       success: false, 
       errors: { _form: validationResult.error.flatten().formErrors },
       message: "Invalid Client ID."
     };
   }
  
  const { id } = validationResult.data;

  try {
    const result = await db.delete(clientsTable)
        .where(eq(clientsTable.id, id))
        .returning({ deletedId: clientsTable.id });

     if (result.length === 0) {
       throw new Error("Client not found for deletion.");
     }

    console.log("Client deleted successfully:", id);
    revalidatePath('/clients'); 
    revalidatePath('/enrollments'); // Also revalidate enrollments page if needed
    return { 
        success: true, 
        message: "Client and associated enrollments deleted successfully!",
        errors: null 
    };
  } catch (error: any) {
    console.error(`Error deleting client ${id}:`, error);
    let errorMessage = "Failed to delete client. Please try again.";
    if (error.message === "Client not found for deletion.") {
       errorMessage = error.message;
    }
    return { 
        success: false, 
        message: errorMessage, 
        errors: { _form: [errorMessage] } 
    };
  }
} 

// --- API-Specific Client Mutations(API IS NEEDED FOR INTERVIEW) ---

export async function createClientApi(clientData: ClientApiCreateInput): Promise<Client> {
    // Validation uses ClientSchema
    const validationResult = ClientSchema.safeParse(clientData);
    if (!validationResult.success) {
        console.error("[API Create Client] Validation failed:", validationResult.error.flatten());
        // Construct a user-friendly error message or structure
        throw new Error(`Validation failed: ${JSON.stringify(validationResult.error.flatten().fieldErrors)}`);
    }

    const { firstName, lastName, dateOfBirth, gender, contactNumber, email, address } = validationResult.data;

    try {
        const encryptedFirstName = encrypt(firstName);
        const encryptedLastName = encrypt(lastName);
        const encryptedDateOfBirth = encrypt(dateOfBirth);
        const encryptedGender = gender ? encrypt(gender) : null;
        const encryptedContactNumber = encrypt(contactNumber);
        const encryptedEmail = encrypt(email);
        const encryptedAddress = address ? encrypt(address) : null;

        if (!encryptedFirstName || !encryptedLastName || !encryptedDateOfBirth || !encryptedContactNumber || !encryptedEmail) {
            console.error("[API Create Client] Encryption failed for one or more required client fields.");
            throw new Error("Internal server error during data encryption.");
        }

        const insertResult = await db.insert(clientsTable).values({ 
            firstName: encryptedFirstName,
            lastName: encryptedLastName,
            dateOfBirth: encryptedDateOfBirth,
            gender: encryptedGender, 
            contactNumber: encryptedContactNumber,
            email: encryptedEmail, 
            address: encryptedAddress,
        }).returning(); // Get the inserted row back
        
        if (!insertResult || insertResult.length === 0) {
            throw new Error("Client creation failed, no data returned from DB.");
        }
        
        console.log("[API Create Client] Client created successfully:", insertResult[0].id);
        // Return the decrypted version of the created client
        return mapDbClientToAppClient(insertResult[0]); 

    } catch (error: any) {
        console.error("[API Create Client] Error:", error);
        if (error.code === '23505' && error.constraint_name?.includes('email')) { 
            throw new Error("Email address already exists.");
        } else if (error.message.startsWith("Validation failed")) {
            throw error; // Re-throw validation error
        } else if (error.message.includes("encryption")) {
            throw error; // Re-throw encryption error
        }
        throw new Error("Failed to create client due to a database error.");
    }
}

export async function updateClientApi(clientId: string, clientData: ClientApiUpdateInput): Promise<Client> {
    // Validation uses ClientSchema.partial()
    const validationResult = ClientSchema.partial().safeParse(clientData);
    if (!validationResult.success) {
        console.error("[API Update Client] Validation failed:", validationResult.error.flatten());
        throw new Error(`Validation failed: ${JSON.stringify(validationResult.error.flatten().fieldErrors)}`);
    }

    // Only update fields that were actually provided in the input
    const dataToUpdate: Record<string, any> = {};
    const validatedData = validationResult.data;

    try {
        if (validatedData.firstName) dataToUpdate.firstName = encrypt(validatedData.firstName);
        if (validatedData.lastName) dataToUpdate.lastName = encrypt(validatedData.lastName);
        if (validatedData.dateOfBirth) dataToUpdate.dateOfBirth = encrypt(validatedData.dateOfBirth);
        if (validatedData.gender !== undefined) dataToUpdate.gender = validatedData.gender ? encrypt(validatedData.gender) : null;
        if (validatedData.contactNumber) dataToUpdate.contactNumber = encrypt(validatedData.contactNumber);
        if (validatedData.email) dataToUpdate.email = encrypt(validatedData.email);
        if (validatedData.address !== undefined) dataToUpdate.address = validatedData.address ? encrypt(validatedData.address) : null;

        // Add timestamp update
        dataToUpdate.updatedAt = new Date(); 

        // Check if any encryption failed (basic check)
        // A more robust check would verify each encryption result individually
        if ( (validatedData.firstName && !dataToUpdate.firstName) || 
             (validatedData.lastName && !dataToUpdate.lastName) || 
             (validatedData.dateOfBirth && !dataToUpdate.dateOfBirth) || 
             (validatedData.contactNumber && !dataToUpdate.contactNumber) || 
             (validatedData.email && !dataToUpdate.email) ) { 
            console.error("[API Update Client] Encryption failed for one or more provided fields.");
            throw new Error("Internal server error during data encryption.");
        }
        
        // Ensure there's actually something to update
        if (Object.keys(dataToUpdate).length <= 1) { // Only contains updatedAt
           throw new Error("No valid fields provided for update.");
        }

        const updateResult = await db.update(clientsTable)
            .set(dataToUpdate)
            .where(eq(clientsTable.id, clientId))
            .returning();

        if (!updateResult || updateResult.length === 0) {
            throw new Error("Client not found or update failed.");
        }

        console.log("[API Update Client] Client updated successfully:", updateResult[0].id);
        return mapDbClientToAppClient(updateResult[0]);

    } catch (error: any) {
        console.error("[API Update Client] Error:", error);
        if (error.code === '23505' && error.constraint_name?.includes('email')) { 
            throw new Error("Email address already exists.");
        } else if (error.message.startsWith("Validation failed") || error.message.includes("encryption") || error.message.startsWith("No valid fields") || error.message.startsWith("Invalid client ID")) {
            throw error; // Re-throw specific errors
        }
        throw new Error("Failed to update client due to a database error.");
    }
}

/**
 * Deletes a client by ID.
 * @param clientId - The UUID of the client to delete.
 * @returns void
 * @throws Error if client not found or DB error occurs.
 */
export async function deleteClientApi(clientId: string): Promise<void> {
     // Validate UUID
    if (!z.string().uuid().safeParse(clientId).success) {
        throw new Error("Invalid client ID format.");
    }
    
    try {
        const deleteResult = await db.delete(clientsTable)
            .where(eq(clientsTable.id, clientId))
            .returning({ id: clientsTable.id }); // Check if a row was actually deleted
        
        if (!deleteResult || deleteResult.length === 0) {
            throw new Error("Client not found."); // Or handle as non-error if desired
        }

        console.log("[API Delete Client] Client deleted successfully:", clientId);

    } catch (error: any) {
         console.error("[API Delete Client] Error:", error);
         if (error.message.startsWith("Invalid client ID") || error.message.startsWith("Client not found")) {
             throw error; // Re-throw specific known errors
         }
         // Handle potential foreign key constraint errors if needed, although cascade should handle it
         throw new Error("Failed to delete client due to a database error.");
    }
} 