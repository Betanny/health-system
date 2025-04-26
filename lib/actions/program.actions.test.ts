// lib/actions/program.actions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { eq } from 'drizzle-orm'; // Import eq

// --- Hoist Mocks ---
const hoistedMocks = vi.hoisted(() => {
    // Define mockDb within hoisted scope
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockResolvedValue([{ id: 'new-program-uuid' }]),
      update: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ updatedId: 'updated-program-uuid' }]),
      delete: vi.fn().mockReturnThis(),
      query: {}
    };
    // Define mock revalidatePath within hoisted scope
    const mockRevalidatePath = vi.fn();

    return { mockDb, mockRevalidatePath };
});

// --- Mock Modules using Hoisted Mocks ---

// Import the actual schema definition *BEFORE* the mock factory uses it
import { programs as actualProgramsTable } from '@/lib/schema';

// Mock the db module
vi.mock('@/lib/db', () => ({
    db: hoistedMocks.mockDb, // Use hoisted mockDb
    programs: actualProgramsTable // Provide the actual schema table
}));

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: hoistedMocks.mockRevalidatePath // Use hoisted mock revalidatePath
}));

// --- Import Subject Under Test and Helpers ---
import { revalidatePath } from 'next/cache'; // Import the mocked function (points to hoistedMocks.mockRevalidatePath)
// Import the actual mapper function from lib/mappers
import { mapDbProgramToAppProgram } from "@/lib/mappers";
// DO NOT import db from @/lib/db

import {
    createProgramAction,
    updateProgramAction,
    deleteProgramAction,
    getProgramById,
    getAllPrograms,
    // mapDbProgramToAppProgram // Remove this import from actions
} from './program.actions'
import type { Program } from '@/lib/types';

// Helper to create FormData
const createMockFormData = (data: Record<string, string | undefined>): FormData => {
    const formData = new FormData();
    for (const key in data) {
        if (data[key] !== undefined) {
            formData.append(key, data[key]!);
        }
    }
    return formData;
};

const MOCK_PROGRAM_UUID = 'p1b2c3d4-e5f6-7890-1234-567890abcdef';

interface MockDbProgram {
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}

const MOCK_DB_PROGRAM_RAW: MockDbProgram = {
    id: MOCK_PROGRAM_UUID,
    name: 'Wellness Program',
    description: 'A basic wellness program.',
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('Program Actions', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks using hoistedMocks object
    hoistedMocks.mockDb.select.mockClear().mockReturnThis();
    hoistedMocks.mockDb.from.mockClear().mockReturnThis();
    hoistedMocks.mockDb.where.mockClear().mockReturnThis();
    hoistedMocks.mockDb.orderBy.mockClear().mockResolvedValue([]);
    hoistedMocks.mockDb.limit.mockClear().mockResolvedValue([]);
    hoistedMocks.mockDb.insert.mockClear().mockReturnThis();
    hoistedMocks.mockDb.values.mockClear().mockResolvedValue([{ id: 'new-program-uuid' }]);
    hoistedMocks.mockDb.update.mockClear().mockReturnThis();
    hoistedMocks.mockDb.set.mockClear().mockReturnThis();
    hoistedMocks.mockDb.returning.mockClear().mockResolvedValue([{ updatedId: 'updated-program-uuid' }]);
    hoistedMocks.mockDb.delete.mockClear().mockReturnThis();
    hoistedMocks.mockRevalidatePath.mockClear(); // Reset revalidatePath mock
  });

  //---------------------------------
  // createProgramAction Tests
  //---------------------------------
  describe('createProgramAction', () => {
    const validProgramData = {
      name: 'New Health Initiative',
      description: 'Focuses on preventative care.',
    };

    it('should successfully create a program with valid data', async () => {
        const formData = createMockFormData(validProgramData);
        const result = await createProgramAction(null, formData);

        expect(result.success).toBe(true);
        expect(result.message).toContain('created successfully');
        expect(result.errors).toBeNull();
        expect(hoistedMocks.mockDb.insert).toHaveBeenCalledTimes(1);
        expect(hoistedMocks.mockDb.values).toHaveBeenCalledWith({
            name: 'New Health Initiative',
            description: 'Focuses on preventative care.',
        });
        expect(hoistedMocks.mockRevalidatePath).toHaveBeenCalledWith('/programs');
    });

    it('should return validation errors for invalid data', async () => {
        const invalidData = { ...validProgramData, name: '' }; // Empty name
        const formData = createMockFormData(invalidData);
        const result = await createProgramAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Validation failed');
        expect(result.errors).toHaveProperty('name');
        expect(result.errors?.name?.[0]).toContain('required');
        expect(hoistedMocks.mockDb.insert).not.toHaveBeenCalled();
    });
    
    it('should handle database errors (e.g., duplicate name)', async () => {
        const duplicateError = new Error('DB error') as any;
        duplicateError.code = '23505'; 
        duplicateError.constraint_name = 'programs_name_unique';
        hoistedMocks.mockDb.values.mockRejectedValueOnce(duplicateError);

        const formData = createMockFormData(validProgramData);
        const result = await createProgramAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('program with this name already exists');
        expect(result.errors).toHaveProperty('name');
    });
  });

  //---------------------------------
  // updateProgramAction Tests
  //---------------------------------
  describe('updateProgramAction', () => {
    const validUpdateData = {
        id: MOCK_PROGRAM_UUID,
        name: 'Updated Wellness Program',
        description: 'Updated description.'
    };

    it('should successfully update a program', async () => {
        hoistedMocks.mockDb.returning.mockResolvedValueOnce([{ updatedId: MOCK_PROGRAM_UUID }]); 
        const formData = createMockFormData(validUpdateData);
        const result = await updateProgramAction(null, formData);

        expect(result.success).toBe(true);
        expect(result.message).toContain('updated successfully');
        expect(hoistedMocks.mockDb.update).toHaveBeenCalledTimes(1);
        expect(hoistedMocks.mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
            name: 'Updated Wellness Program',
            description: 'Updated description.'
        }));
        expect(hoistedMocks.mockDb.where).toHaveBeenCalledWith(eq(expect.anything(), MOCK_PROGRAM_UUID)); 
        expect(hoistedMocks.mockRevalidatePath).toHaveBeenCalledWith('/programs');
        expect(hoistedMocks.mockRevalidatePath).toHaveBeenCalledWith(`/programs/${MOCK_PROGRAM_UUID}`);
    });

    it('should return validation error for invalid name', async () => {
        const invalidData = { ...validUpdateData, name: '' };
        const formData = createMockFormData(invalidData);
        const result = await updateProgramAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.errors).toHaveProperty('name');
        expect(hoistedMocks.mockDb.update).not.toHaveBeenCalled();
    });

    it('should return error if program not found', async () => {
        hoistedMocks.mockDb.returning.mockResolvedValueOnce([]); // Simulate not found
        const formData = createMockFormData(validUpdateData);
        const result = await updateProgramAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Program not found for update');
        expect(result.errors).toHaveProperty('_form');
    });
    
    it('should handle duplicate name error during update', async () => {
        const duplicateError = new Error('DB error') as any;
        duplicateError.code = '23505';
        duplicateError.constraint_name = 'programs_name_unique';
        hoistedMocks.mockDb.returning.mockRejectedValueOnce(duplicateError);

        const formData = createMockFormData(validUpdateData);
        const result = await updateProgramAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Another program with this name already exists');
        expect(result.errors).toHaveProperty('name');
    });
  });

  //---------------------------------
  // deleteProgramAction Tests
  //---------------------------------
  describe('deleteProgramAction', () => {
    it('should successfully delete a program', async () => {
        hoistedMocks.mockDb.returning.mockResolvedValueOnce([{ deletedId: MOCK_PROGRAM_UUID }]);
        const formData = createMockFormData({ id: MOCK_PROGRAM_UUID });
        const result = await deleteProgramAction(null, formData);

        expect(result.success).toBe(true);
        expect(result.message).toContain('deleted successfully');
        expect(hoistedMocks.mockDb.delete).toHaveBeenCalledTimes(1);
        expect(hoistedMocks.mockDb.where).toHaveBeenCalledWith(eq(expect.anything(), MOCK_PROGRAM_UUID));
        expect(hoistedMocks.mockRevalidatePath).toHaveBeenCalledWith('/programs');
    });

    it('should return error if program not found', async () => {
        hoistedMocks.mockDb.returning.mockResolvedValueOnce([]);
        const formData = createMockFormData({ id: MOCK_PROGRAM_UUID });
        const result = await deleteProgramAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Program not found for deletion');
        expect(result.errors).toHaveProperty('_form');
    });

    it('should handle foreign key constraint error during deletion', async () => {
        const fkError = new Error('DB error') as any;
        fkError.code = '23503'; // Foreign key violation code
        hoistedMocks.mockDb.returning.mockRejectedValueOnce(fkError);
        const formData = createMockFormData({ id: MOCK_PROGRAM_UUID });
        const result = await deleteProgramAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Cannot delete program with active enrollments');
        expect(result.errors).toHaveProperty('_form');
    });
  });

  //---------------------------------
  // getProgramById Tests
  //---------------------------------
  describe('getProgramById', () => {
    it('should return a program when found', async () => {
        hoistedMocks.mockDb.limit.mockResolvedValueOnce([MOCK_DB_PROGRAM_RAW]);
        const program = await getProgramById(MOCK_PROGRAM_UUID);

        expect(program).not.toBeNull();
        expect(program?.id).toBe(MOCK_PROGRAM_UUID);
        expect(program?.name).toBe('Wellness Program');
        expect(hoistedMocks.mockDb.where).toHaveBeenCalledWith(eq(expect.anything(), MOCK_PROGRAM_UUID));
    });

    it('should return null if program not found', async () => {
        hoistedMocks.mockDb.limit.mockResolvedValueOnce([]);
        const program = await getProgramById(MOCK_PROGRAM_UUID);
        expect(program).toBeNull();
    });

    it('should return null for invalid UUID format', async () => {
        const program = await getProgramById('invalid-uuid');
        expect(program).toBeNull();
        expect(hoistedMocks.mockDb.select).not.toHaveBeenCalled();
    });
  });

  //---------------------------------
  // getAllPrograms Tests
  //---------------------------------
  describe('getAllPrograms', () => {
    it('should return a list of programs', async () => {
        const mockDbPrograms = [
            MOCK_DB_PROGRAM_RAW,
            { ...MOCK_DB_PROGRAM_RAW, id: 'uuid-p2', name: 'Diabetes Management' }
        ];
        hoistedMocks.mockDb.orderBy.mockResolvedValueOnce(mockDbPrograms);
        const programs = await getAllPrograms();

        expect(programs).toHaveLength(2);
        expect(programs[0].name).toBe('Wellness Program');
        expect(programs[1].name).toBe('Diabetes Management');
    });

    it('should return an empty array if no programs exist', async () => {
        hoistedMocks.mockDb.orderBy.mockResolvedValueOnce([]);
        const programs = await getAllPrograms();
        expect(programs).toHaveLength(0);
    });
  });

  //---------------------------------
  // mapDbProgramToAppProgram Tests
  //---------------------------------
  describe('mapDbProgramToAppProgram', () => {
      it('should correctly map DB fields to Program type', () => {
          // Test the actual imported mapper function
          const mapped = mapDbProgramToAppProgram(MOCK_DB_PROGRAM_RAW);
          expect(mapped.id).toBe(MOCK_DB_PROGRAM_RAW.id);
          expect(mapped.name).toBe(MOCK_DB_PROGRAM_RAW.name);
          expect(mapped.description).toBe(MOCK_DB_PROGRAM_RAW.description);
          expect(mapped.createdAt).toBe(MOCK_DB_PROGRAM_RAW.createdAt.toISOString());
          expect(mapped.updatedAt).toBe(MOCK_DB_PROGRAM_RAW.updatedAt.toISOString());
      });

      it('should handle null description', () => {
           const dbProgramNullDesc = { ...MOCK_DB_PROGRAM_RAW, description: null };
           const mapped = mapDbProgramToAppProgram(dbProgramNullDesc);
           expect(mapped.description).toBe(''); // Expect empty string for null description
      });
  });
}); 