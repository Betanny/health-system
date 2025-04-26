import type { Client, Program } from "./types";
import { decrypt } from './crypto';
import type { clients as clientsTable, programs as programsTable } from "./db"; // Need DB types here

/**
 * Maps a raw database client object to the application's Client type,
 * handling decryption and potential null values.
 */
export function mapDbClientToAppClient(dbClient: typeof clientsTable.$inferSelect): Client {
    let decryptedFirstName = "[DECRYPTION_FAILED]";
    let decryptedLastName = "[DECRYPTION_FAILED]";
    let decryptedDateOfBirth = "[DECRYPTION_FAILED]";
    let decryptedGender = "[DECRYPTION_FAILED]";
    let decryptedContactNumber = "[DECRYPTION_FAILED]";
    let decryptedEmail = "[DECRYPTION_FAILED]";
    let decryptedAddress = "[DECRYPTION_FAILED]";

    // Decrypt fields safely
    try { decryptedFirstName = decrypt(dbClient.firstName) ?? decryptedFirstName; } catch (e) { console.error(`Failed to decrypt firstName for client ${dbClient.id}:`, e); }
    try { decryptedLastName = decrypt(dbClient.lastName) ?? decryptedLastName; } catch (e) { console.error(`Failed to decrypt lastName for client ${dbClient.id}:`, e); }
    try { decryptedDateOfBirth = decrypt(dbClient.dateOfBirth) ?? decryptedDateOfBirth; } catch (e) { console.error(`Failed to decrypt dateOfBirth for client ${dbClient.id}:`, e); }
    try { decryptedGender = dbClient.gender ? (decrypt(dbClient.gender) ?? decryptedGender) : ''; } catch (e) { console.error(`Failed to decrypt gender for client ${dbClient.id}:`, e); decryptedGender = ''; }
    try { decryptedContactNumber = decrypt(dbClient.contactNumber) ?? decryptedContactNumber; } catch (e) { console.error(`Failed to decrypt contactNumber for client ${dbClient.id}:`, e); }
    try { decryptedEmail = decrypt(dbClient.email) ?? decryptedEmail; } catch (e) { console.error(`Failed to decrypt email for client ${dbClient.id}:`, e); }
    try { decryptedAddress = dbClient.address ? (decrypt(dbClient.address) ?? decryptedAddress) : ''; } catch (e) { console.error(`Failed to decrypt address for client ${dbClient.id}:`, e); decryptedAddress = ''; }

    return {
        id: dbClient.id,
        firstName: decryptedFirstName,
        lastName: decryptedLastName,
        dateOfBirth: decryptedDateOfBirth,
        gender: decryptedGender,
        contactNumber: decryptedContactNumber,
        email: decryptedEmail,
        address: decryptedAddress,
        createdAt: dbClient.createdAt.toISOString(),
        updatedAt: dbClient.updatedAt.toISOString(),
    };
}

/**
 * Maps a raw database program object to the application's Program type.
 * Assumes program fields do not require decryption.
 */
export function mapDbProgramToAppProgram(dbProgram: typeof programsTable.$inferSelect): Program {
    return {
        id: dbProgram.id,
        name: dbProgram.name,
        description: dbProgram.description ?? '',
        createdAt: dbProgram.createdAt.toISOString(),
        updatedAt: dbProgram.updatedAt.toISOString(),
    };
} 