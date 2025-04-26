import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eq, and } from 'drizzle-orm'; 

// --- Hoist Mocks ---
const hoistedMocks = vi.hoisted(() => {
    // Define mockDb within hoisted scope
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue([{ id: 'new-enrollment-uuid' }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ updatedId: 'updated-enrollment-uuid' }]),
      delete: vi.fn().mockReturnThis(),
      query: {
          enrollments: {
              findFirst: vi.fn().mockResolvedValue(null),
              findMany: vi.fn().mockResolvedValue([]),
          },
      }
    };
    // Define mock crypto within hoisted scope
    const mockEncrypt = vi.fn((text: string) => text ? `encrypted-${text}` : null);
    const mockDecrypt = vi.fn((text: string) => {
        if (!text) throw new Error('Decryption failed');
        if (text.includes('[DECRYPTION_FAILED]') || text.includes('invalid')) {
          throw new Error('Decryption failed');
        }
        return text.startsWith('encrypted-') ? text.substring(10) : text;
    });

    // Define mock revalidatePath within hoisted scope
    const mockRevalidatePath = vi.fn();

    return { mockDb, mockEncrypt, mockDecrypt, mockRevalidatePath };
});

// --- Mock Modules using Hoisted Mocks ---

// Mock the db module
vi.mock('@/lib/db', async (importOriginal) => {
    const actualDb = await importOriginal() as any;
    return {
        ...actualDb,
        db: hoistedMocks.mockDb, // Use hoisted mockDb
        // Assume enrollmentsTable is imported from schema within action file
    };
});

// Mock crypto
vi.mock('@/lib/crypto', () => ({
  encrypt: hoistedMocks.mockEncrypt,
  decrypt: hoistedMocks.mockDecrypt
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: hoistedMocks.mockRevalidatePath // Use hoisted mock revalidatePath
}));

// Import the original mapper *BEFORE* the mock factory uses it
import { mapDbProgramToAppProgram as originalMapDbProgram } from '@/lib/mappers';

// Mock the mappers module
vi.mock('@/lib/mappers', () => ({
    mapDbProgramToAppProgram: vi.fn(originalMapDbProgram) // Spy on the real mapper
}));

// --- Import Subject Under Test and Helpers ---
import { revalidatePath } from 'next/cache'; // Import the mocked function (points to hoistedMocks.mockRevalidatePath)
import { mapDbProgramToAppProgram } from '@/lib/mappers'; // Import the mocked mapper

import {
    createEnrollmentAction,
    updateEnrollmentAction,
    deleteEnrollmentAction,
    getAllEnrollmentsWithDetails
} from './enrollment.actions'
import { enrollmentStatusEnum } from '@/lib/db'; // Import the actual enum

// Helper
const createMockFormData = (data: Record<string, string | undefined>): FormData => {
    const formData = new FormData();
    for (const key in data) {
        if (data[key] !== undefined) {
            formData.append(key, data[key]!);
        }
    }
    return formData;
};

// Mock Data
const MOCK_ENROLLMENT_UUID = 'e1b2c3d4-e5f6-7890-1234-567890abcdef';
const MOCK_CLIENT_UUID = 'c1b2c3d4-e5f6-7890-1234-567890abcdef';
const MOCK_PROGRAM_UUID = 'p1b2c3d4-e5f6-7890-1234-567890abcdef';

describe('Enrollment Actions', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks using hoistedMocks object
    hoistedMocks.mockDb.select.mockClear().mockReturnThis();
    hoistedMocks.mockDb.from.mockClear().mockReturnThis();
    hoistedMocks.mockDb.where.mockClear().mockReturnThis();
    hoistedMocks.mockDb.limit.mockClear().mockResolvedValue([]);
    hoistedMocks.mockDb.insert.mockClear().mockReturnThis();
    hoistedMocks.mockDb.values.mockClear().mockResolvedValue([{ id: 'new-enrollment-uuid' }]);
    hoistedMocks.mockDb.update.mockClear().mockReturnThis();
    hoistedMocks.mockDb.set.mockClear().mockReturnThis();
    hoistedMocks.mockDb.returning.mockClear().mockResolvedValue([{ updatedId: 'updated-enrollment-uuid' }]);
    hoistedMocks.mockDb.delete.mockClear().mockReturnThis();
    hoistedMocks.mockDb.query.enrollments.findFirst.mockClear().mockResolvedValue(null);
    hoistedMocks.mockDb.query.enrollments.findMany.mockClear().mockResolvedValue([]);

    hoistedMocks.mockEncrypt.mockClear().mockImplementation((text: string) => text ? `encrypted-${text}` : null);
    hoistedMocks.mockDecrypt.mockClear().mockImplementation((text: string) => {
        if (!text) throw new Error('Decryption failed');
        if (text.includes('[DECRYPTION_FAILED]') || text.includes('invalid')) {
          throw new Error('Decryption failed');
        }
        return text.startsWith('encrypted-') ? text.substring(10) : text;
    });

    hoistedMocks.mockRevalidatePath.mockClear(); // Reset revalidatePath mock
    vi.mocked(mapDbProgramToAppProgram).mockClear(); // Reset mapper spy if needed
  });

  //---------------------------------
  // createEnrollmentAction Tests
  //---------------------------------
  describe('createEnrollmentAction', () => {
    const validEnrollmentData = {
        clientId: MOCK_CLIENT_UUID,
        programId: MOCK_PROGRAM_UUID,
        enrollmentDate: '2024-01-15',
        status: 'active' as typeof enrollmentStatusEnum.enumValues[number],
        notes: 'Initial enrollment notes.'
    };

    it('should successfully create an enrollment', async () => {
        hoistedMocks.mockDb.limit.mockResolvedValueOnce([]); // Simulate no existing enrollment
        const formData = createMockFormData(validEnrollmentData);
        const result = await createEnrollmentAction(null, formData);

        expect(result.success).toBe(true);
        expect(result.message).toContain('created successfully');
        expect(hoistedMocks.mockDb.insert).toHaveBeenCalledTimes(1);
        expect(hoistedMocks.mockDb.values).toHaveBeenCalledWith({
            ...validEnrollmentData,
            notes: 'encrypted-Initial enrollment notes.' // Check notes are encrypted
        });
        expect(hoistedMocks.mockEncrypt).toHaveBeenCalledWith('Initial enrollment notes.');
        expect(hoistedMocks.mockRevalidatePath).toHaveBeenCalledWith(`/clients/${MOCK_CLIENT_UUID}`);
    });
    
    it('should return error if client is already enrolled in the program', async () => {
        hoistedMocks.mockDb.limit.mockResolvedValueOnce([{ id: 'existing-enrollment-uuid' }]); // Simulate existing enrollment found
        const formData = createMockFormData(validEnrollmentData);
        const result = await createEnrollmentAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('already enrolled');
        expect(result.errors).toHaveProperty('_form');
        expect(hoistedMocks.mockDb.insert).not.toHaveBeenCalled();
    });

    it('should return validation errors for invalid data', async () => {
        const invalidData = { ...validEnrollmentData, enrollmentDate: 'invalid-date' };
        const formData = createMockFormData(invalidData);
        const result = await createEnrollmentAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Validation failed');
        expect(result.errors).toHaveProperty('enrollmentDate');
    });

    it('should handle database errors during creation', async () => {
        hoistedMocks.mockDb.limit.mockResolvedValueOnce([]); 
        hoistedMocks.mockDb.values.mockRejectedValueOnce(new Error('DB insert failed'));
        const formData = createMockFormData(validEnrollmentData);
        const result = await createEnrollmentAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to create enrollment');
        expect(result.errors).toHaveProperty('_form');
    });
  });

  //---------------------------------
  // updateEnrollmentAction Tests
  //---------------------------------
  describe('updateEnrollmentAction', () => {
     const validUpdateData = {
        id: MOCK_ENROLLMENT_UUID,
        enrollmentDate: '2024-02-20',
        status: 'completed' as typeof enrollmentStatusEnum.enumValues[number],
        notes: 'Updated notes.'
     };

    it('should successfully update an enrollment', async () => {
        // Mock findFirst to return the enrollment needing update (to get clientId)
        hoistedMocks.mockDb.query.enrollments.findFirst.mockResolvedValueOnce({ clientId: MOCK_CLIENT_UUID });
        // Mock returning to indicate success
        hoistedMocks.mockDb.returning.mockResolvedValueOnce([{ updatedId: MOCK_ENROLLMENT_UUID }]);

        const formData = createMockFormData(validUpdateData);
        const result = await updateEnrollmentAction(null, formData);

        expect(result.success).toBe(true);
        expect(result.message).toContain('updated successfully');
        expect(hoistedMocks.mockDb.update).toHaveBeenCalledTimes(1);
        expect(hoistedMocks.mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
            enrollmentDate: '2024-02-20',
            status: 'completed',
            notes: 'encrypted-Updated notes.'
        }));
        expect(hoistedMocks.mockDb.where).toHaveBeenCalledWith(eq(expect.anything(), MOCK_ENROLLMENT_UUID));
        expect(hoistedMocks.mockEncrypt).toHaveBeenCalledWith('Updated notes.');
        expect(hoistedMocks.mockRevalidatePath).toHaveBeenCalledWith(`/clients/${MOCK_CLIENT_UUID}`);
        expect(hoistedMocks.mockRevalidatePath).toHaveBeenCalledWith('/enrollments');
    });

    it('should return validation errors for invalid update data', async () => {
        const invalidData = { ...validUpdateData, status: 'invalid-status' };
        const formData = createMockFormData(invalidData);
        const result = await updateEnrollmentAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Validation failed');
        expect(result.errors).toHaveProperty('status');
        expect(hoistedMocks.mockDb.update).not.toHaveBeenCalled();
    });

    it('should return error if enrollment not found for update', async () => {
        hoistedMocks.mockDb.query.enrollments.findFirst.mockResolvedValueOnce(null); // Simulate findFirst returning nothing
        const formData = createMockFormData(validUpdateData);
        const result = await updateEnrollmentAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Enrollment not found for update');
        expect(result.errors).toHaveProperty('_form');
        expect(hoistedMocks.mockDb.update).not.toHaveBeenCalled();
    });
    
    it('should return error if update fails after finding enrollment', async () => {
        hoistedMocks.mockDb.query.enrollments.findFirst.mockResolvedValueOnce({ clientId: MOCK_CLIENT_UUID });
        hoistedMocks.mockDb.returning.mockResolvedValueOnce([]); // Simulate update returning no rows
        const formData = createMockFormData(validUpdateData);
        const result = await updateEnrollmentAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('failed to update');
        expect(result.errors).toHaveProperty('_form');
    });
  });

  //---------------------------------
  // deleteEnrollmentAction Tests
  //---------------------------------
   describe('deleteEnrollmentAction', () => {
     it('should successfully delete an enrollment', async () => {
        hoistedMocks.mockDb.query.enrollments.findFirst.mockResolvedValueOnce({ clientId: MOCK_CLIENT_UUID });
        hoistedMocks.mockDb.returning.mockResolvedValueOnce([{ deletedId: MOCK_ENROLLMENT_UUID }]);
        const formData = createMockFormData({ id: MOCK_ENROLLMENT_UUID });
        const result = await deleteEnrollmentAction(null, formData);

        expect(result.success).toBe(true);
        expect(result.message).toContain('deleted successfully');
        expect(hoistedMocks.mockDb.delete).toHaveBeenCalledTimes(1);
        expect(hoistedMocks.mockDb.where).toHaveBeenCalledWith(eq(expect.anything(), MOCK_ENROLLMENT_UUID));
        expect(hoistedMocks.mockRevalidatePath).toHaveBeenCalledWith(`/clients/${MOCK_CLIENT_UUID}`);
        expect(hoistedMocks.mockRevalidatePath).toHaveBeenCalledWith('/enrollments');
     });

     it('should return success if enrollment already deleted (not found)', async () => {
        hoistedMocks.mockDb.query.enrollments.findFirst.mockResolvedValueOnce(null);
        const formData = createMockFormData({ id: MOCK_ENROLLMENT_UUID });
        const result = await deleteEnrollmentAction(null, formData);

        expect(result.success).toBe(true);
        expect(result.message).toContain('not found or already deleted');
        expect(hoistedMocks.mockDb.delete).not.toHaveBeenCalled();
     });
     
     it('should return error if delete fails after finding enrollment', async () => {
        hoistedMocks.mockDb.query.enrollments.findFirst.mockResolvedValueOnce({ clientId: MOCK_CLIENT_UUID });
        hoistedMocks.mockDb.returning.mockResolvedValueOnce([]); // Simulate delete returning no rows
        const formData = createMockFormData({ id: MOCK_ENROLLMENT_UUID });
        const result = await deleteEnrollmentAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('failed to delete');
        expect(result.errors).toHaveProperty('_form');
    });

   });

  //---------------------------------
  // getAllEnrollmentsWithDetails Tests
  //---------------------------------
  describe('getAllEnrollmentsWithDetails', () => {
    const mockDbEnrollment = {
        id: MOCK_ENROLLMENT_UUID,
        clientId: MOCK_CLIENT_UUID,
        programId: MOCK_PROGRAM_UUID,
        enrollmentDate: '2024-01-10',
        status: 'active' as typeof enrollmentStatusEnum.enumValues[number],
        notes: 'encrypted-Test notes',
        createdAt: new Date(),
        updatedAt: new Date(),
        client: {
            id: MOCK_CLIENT_UUID,
            firstName: 'encrypted-ClientFirstName',
            lastName: 'encrypted-ClientLastName'
        },
        program: {
            id: MOCK_PROGRAM_UUID,
            name: 'Test Program'
        }
    };

    it('should return decrypted enrollments with client/program details', async () => {
        hoistedMocks.mockDb.query.enrollments.findMany.mockResolvedValueOnce([mockDbEnrollment]);
        const results = await getAllEnrollmentsWithDetails();

        expect(results).toHaveLength(1);
        const result = results[0];
        expect(result.id).toBe(MOCK_ENROLLMENT_UUID);
        expect(result.notes).toBe('Test notes');
        expect(result.client.firstName).toBe('ClientFirstName');
        expect(result.client.lastName).toBe('ClientLastName');
        expect(result.program.name).toBe('Test Program');
        expect(hoistedMocks.mockDecrypt).toHaveBeenCalledWith('encrypted-Test notes');
        expect(hoistedMocks.mockDecrypt).toHaveBeenCalledWith('encrypted-ClientFirstName');
        expect(hoistedMocks.mockDecrypt).toHaveBeenCalledWith('encrypted-ClientLastName');
    });

    it('should return empty array if no enrollments exist', async () => {
        hoistedMocks.mockDb.query.enrollments.findMany.mockResolvedValueOnce([]);
        const results = await getAllEnrollmentsWithDetails();
        expect(results).toHaveLength(0);
    });
    
    it('should handle decryption errors gracefully', async () => {
        const corruptEnrollment = {
            ...mockDbEnrollment,
            notes: 'invalid-notes',
            client: { ...mockDbEnrollment.client, firstName: 'invalid-firstname' }
        };
        hoistedMocks.mockDb.query.enrollments.findMany.mockResolvedValueOnce([corruptEnrollment]);
        // Adjust mockDecrypt to simulate failure for specific fields
        hoistedMocks.mockDecrypt.mockImplementation((text: string) => {
            if (text === 'invalid-notes' || text === 'invalid-firstname') {
                throw new Error('Simulated decryption failure');
            }
            return text.startsWith('encrypted-') ? text.substring(10) : text;
        });

        const results = await getAllEnrollmentsWithDetails();

        expect(results).toHaveLength(1);
        expect(results[0].notes).toBe('[DECRYPTION_FAILED]');
        expect(results[0].client.firstName).toBe('[DECRYPTION_FAILED]');
        expect(results[0].client.lastName).toBe('ClientLastName'); // Assuming lastName decrypted ok
    });
  });

}); 