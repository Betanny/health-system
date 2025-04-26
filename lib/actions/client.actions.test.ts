import { describe, it, expect, vi, beforeEach } from 'vitest'
// Import necessary things like schema *before* hoisting. TESTING. WILL REVISIT
import { clients as actualClientsTable } from '@/lib/schema';

// --- Hoist Mocks ---
const hoistedMocks = vi.hoisted(() => {
    // Define mockDb within the hoisted scope
    const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockResolvedValue([{ id: 'new-uuid' }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ updatedId: 'updated-uuid' }]),
        delete: vi.fn().mockReturnThis(),
        query: {
            clients: {
                findFirst: vi.fn().mockResolvedValue(null),
            },
        }
    };
    // Define mock crypto functions within the hoisted scope
    const mockEncrypt = vi.fn((text: string) => text ? `encrypted-${text}` : null);
    const mockDecrypt = vi.fn((text: string) => {
         if (!text) throw new Error('Decryption failed');
         if (text.includes('[DECRYPTION_FAILED]') || text.includes('invalid')) {
           throw new Error('Decryption failed');
         }
         return text.startsWith('encrypted-') ? text.substring(10) : text;
    });
    // Define mock Drizzle operators within the hoisted scope
    const mockEq = vi.fn((col, val) => `mockEq(${col}, ${val})`);
    const mockOr = vi.fn((...conditions) => `mockOr(${conditions.join(', ')})`);
    const mockLike = vi.fn((col, val) => `mockLike(${col}, ${val})`);

    return { mockDb, mockEncrypt, mockDecrypt, mockEq, mockOr, mockLike };
});

// --- Mock Drizzle operators using hoisted mocks ---
vi.mock('drizzle-orm', async (importOriginal) => {
    const actual = await importOriginal()
    return {
        ...(actual as any), // Cast to any to allow spreading
        eq: hoistedMocks.mockEq,
        or: hoistedMocks.mockOr,
        like: hoistedMocks.mockLike,
    };
});

// --- Mock Modules Using Hoisted Mocks ---
vi.mock('@/lib/db', () => ({
    db: hoistedMocks.mockDb, // Access mockDb from the hoisted result
    clients: actualClientsTable // Export the actual schema table under its original name 'clients'
}));

vi.mock('@/lib/crypto', () => ({
  encrypt: hoistedMocks.mockEncrypt, // Access from hoisted result
  decrypt: hoistedMocks.mockDecrypt  // Access from hoisted result
}));

// Define the alias used within the test file for the schema
const clientsTable = actualClientsTable;

// Mock revalidatePath (doesn't depend on other mocks)
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn()
}));

// --- Import Subject Under Test and Helpers ---

// Import the mocked revalidatePath for checking calls
import { revalidatePath } from 'next/cache';
// Note: DO NOT import db or clientsTable from @/lib/db
// We use the 'clientsTable' const defined above which refers to the actual schema

import {
    createClientAction,
    updateClientAction,
    deleteClientAction,
    getClientById,
    getClientWithEnrollments,
    getAllClients,
    searchClients
} from './client.actions'

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

const MOCK_CLIENT_UUID = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
const MOCK_DB_CLIENT_RAW = {
    id: MOCK_CLIENT_UUID,
    firstName: 'encrypted-John',
    lastName: 'encrypted-Doe',
    dateOfBirth: 'encrypted-1990-01-01',
    gender: 'encrypted-Male',
    contactNumber: 'encrypted-1234567890',
    email: 'encrypted-john.doe@example.com',
    address: 'encrypted-123 Main St',
    createdAt: new Date(),
    updatedAt: new Date(),
};

describe('Client Actions', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks using the hoistedMocks object
    hoistedMocks.mockDb.query.clients.findFirst.mockResolvedValue(null);
    hoistedMocks.mockDb.select.mockClear().mockReturnThis();
    hoistedMocks.mockDb.from.mockClear().mockReturnThis();
    hoistedMocks.mockDb.where.mockClear().mockReturnThis();
    hoistedMocks.mockDb.orderBy.mockClear().mockResolvedValue([]);
    hoistedMocks.mockDb.limit.mockClear().mockResolvedValue([]);
    hoistedMocks.mockDb.insert.mockClear().mockReturnThis();
    hoistedMocks.mockDb.values.mockClear().mockResolvedValue([{ id: 'new-uuid' }]);
    hoistedMocks.mockDb.update.mockClear().mockReturnThis();
    hoistedMocks.mockDb.set.mockClear().mockReturnThis();
    hoistedMocks.mockDb.returning.mockClear().mockResolvedValue([{ updatedId: 'updated-uuid' }]);
    hoistedMocks.mockDb.delete.mockClear().mockReturnThis();
    hoistedMocks.mockEncrypt.mockClear().mockImplementation((text: string) => text ? `encrypted-${text}` : null);
    hoistedMocks.mockDecrypt.mockClear().mockImplementation((text: string) => {
         if (!text) throw new Error('Decryption failed');
         if (text.includes('[DECRYPTION_FAILED]') || text.includes('invalid')) {
           throw new Error('Decryption failed');
         }
         return text.startsWith('encrypted-') ? text.substring(10) : text;
    });
    hoistedMocks.mockEq.mockClear().mockImplementation((col, val) => `mockEq(${col}, ${val})`);
    hoistedMocks.mockOr.mockClear().mockImplementation((...conditions) => `mockOr(${conditions.join(', ')})`);
    hoistedMocks.mockLike.mockClear().mockImplementation((col, val) => `mockLike(${col}, ${val})`);

    vi.mocked(revalidatePath).mockClear();
  });

  // --- Tests using hoistedMocks ---

  describe('createClientAction', () => {
    const validClientData = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      contactNumber: '1234567890',
      email: 'john.doe@example.com',
      address: '123 Main St',
    };

    it('should successfully create a client with valid data', async () => {
      const formData = createMockFormData(validClientData);
      const result = await createClientAction(null, formData);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(result.errors).toBeNull();
      expect(hoistedMocks.mockDb.insert).toHaveBeenCalledTimes(1);
      expect(hoistedMocks.mockDb.values).toHaveBeenCalledWith({
          firstName: 'encrypted-John',
          lastName: 'encrypted-Doe',
          dateOfBirth: 'encrypted-1990-01-01',
          gender: 'encrypted-Male',
          contactNumber: 'encrypted-1234567890',
          email: 'encrypted-john.doe@example.com',
          address: 'encrypted-123 Main St',
      });
      expect(hoistedMocks.mockEncrypt).toHaveBeenCalledWith('John');
      expect(hoistedMocks.mockEncrypt).toHaveBeenCalledWith('Doe');
      expect(hoistedMocks.mockEncrypt).toHaveBeenCalledWith('1990-01-01');
      expect(hoistedMocks.mockEncrypt).toHaveBeenCalledWith('Male');
      expect(hoistedMocks.mockEncrypt).toHaveBeenCalledWith('1234567890');
      expect(hoistedMocks.mockEncrypt).toHaveBeenCalledWith('john.doe@example.com');
      expect(hoistedMocks.mockEncrypt).toHaveBeenCalledWith('123 Main St');
      expect(revalidatePath).toHaveBeenCalledWith('/clients');
    });

    it('should return validation errors for invalid data', async () => {
        const invalidData = { ...validClientData, email: 'invalid-email' };
        const formData = createMockFormData(invalidData);
        const result = await createClientAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Validation failed');
        expect(result.errors).toHaveProperty('email');
        expect(result.errors?.email?.[0]).toContain('Invalid email');
        expect(hoistedMocks.mockDb.insert).not.toHaveBeenCalled();
        expect(revalidatePath).not.toHaveBeenCalled();
    });
    
    it('should return error if encryption fails', async () => {
        hoistedMocks.mockEncrypt.mockImplementationOnce((text: string) => {
            if (text === 'john.doe@example.com') return null; // Simulate specific failure
            return `encrypted-${text}`;
        });

        const formData = createMockFormData(validClientData);
        const result = await createClientAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to securely process');
        expect(result.errors).toHaveProperty('_form');
        expect(hoistedMocks.mockDb.insert).not.toHaveBeenCalled();
    });

    it('should handle database errors during insertion (e.g., duplicate email)', async () => {
        const duplicateError = new Error('DB error') as any;
        duplicateError.code = '23505'; // Simulate unique constraint violation
        duplicateError.constraint_name = 'clients_email_unique';
        hoistedMocks.mockDb.values.mockRejectedValueOnce(duplicateError);

        const formData = createMockFormData(validClientData);
        const result = await createClientAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Email address already exists');
        expect(result.errors).toHaveProperty('email');
    });

    it('should handle generic database errors during insertion', async () => {
        hoistedMocks.mockDb.values.mockRejectedValueOnce(new Error('Generic DB Error'));

        const formData = createMockFormData(validClientData);
        const result = await createClientAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to create client');
        expect(result.errors).toHaveProperty('_form');
    });
  });

  //---------------------------------
  // updateClientAction Tests
  //---------------------------------
  describe('updateClientAction', () => {
    const validUpdateData = {
        id: MOCK_CLIENT_UUID,
        firstName: 'Johnny',
        lastName: 'Doethan',
        dateOfBirth: '1991-02-02',
        gender: 'Other',
        contactNumber: '0987654321',
        email: 'johnny.d@new.com',
        address: '456 New Ave',
      };

    it('should successfully update a client with valid data', async () => {
        hoistedMocks.mockDb.returning.mockResolvedValueOnce([{ updatedId: MOCK_CLIENT_UUID }]); // Ensure update returns success
        const formData = createMockFormData(validUpdateData);
        const result = await updateClientAction(null, formData);

        expect(result.success).toBe(true);
        expect(result.message).toContain('updated successfully');
        expect(hoistedMocks.mockDb.update).toHaveBeenCalledTimes(1);
        expect(hoistedMocks.mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
            firstName: 'encrypted-Johnny',
            lastName: 'encrypted-Doethan',
            email: 'encrypted-johnny.d@new.com',
        }));
        // Check that mockEq was called correctly via mockDb.where
        expect(hoistedMocks.mockDb.where).toHaveBeenCalledTimes(1);
        expect(hoistedMocks.mockEq).toHaveBeenCalledWith(clientsTable.id, MOCK_CLIENT_UUID);
        expect(revalidatePath).toHaveBeenCalledWith('/clients');
        expect(revalidatePath).toHaveBeenCalledWith(`/clients/${MOCK_CLIENT_UUID}`);
    });

    it('should return validation errors for invalid update data', async () => {
        const invalidData = { ...validUpdateData, email: 'invalid' };
        const formData = createMockFormData(invalidData);
        const result = await updateClientAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Validation failed');
        expect(result.errors).toHaveProperty('email');
        expect(hoistedMocks.mockDb.update).not.toHaveBeenCalled();
    });

    it('should return error if client not found during update', async () => {
        hoistedMocks.mockDb.returning.mockResolvedValueOnce([]); // Simulate no rows updated
        const formData = createMockFormData(validUpdateData);
        const result = await updateClientAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Client not found for update');
        expect(result.errors).toHaveProperty('_form');
    });
     
    it('should return error if encryption fails during update', async () => {
        hoistedMocks.mockEncrypt.mockImplementationOnce((text: string) => {
            if (text === 'johnny.d@new.com') return null; 
            return `encrypted-${text}`;
        });

        const formData = createMockFormData(validUpdateData);
        const result = await updateClientAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to securely process');
        expect(result.errors).toHaveProperty('_form');
        expect(hoistedMocks.mockDb.update).not.toHaveBeenCalled();
    });

    it('should handle database errors during update (e.g., duplicate email)', async () => {
        const duplicateError = new Error('DB error') as any;
        duplicateError.code = '23505';
        duplicateError.constraint_name = 'clients_email_unique';
        // Mock the rejection on the final step of the chain
        hoistedMocks.mockDb.returning.mockRejectedValueOnce(duplicateError); 

        const formData = createMockFormData(validUpdateData);
        const result = await updateClientAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('email address already exists');
        expect(result.errors).toHaveProperty('email');
    });
  });

  //---------------------------------
  // deleteClientAction Tests
  //---------------------------------
   describe('deleteClientAction', () => {
     it('should successfully delete a client', async () => {
        hoistedMocks.mockDb.returning.mockResolvedValueOnce([{ deletedId: MOCK_CLIENT_UUID }]); // Simulate successful delete
        const formData = createMockFormData({ id: MOCK_CLIENT_UUID });
        const result = await deleteClientAction(null, formData);

        expect(result.success).toBe(true);
        expect(result.message).toContain('deleted successfully');
        expect(hoistedMocks.mockDb.delete).toHaveBeenCalledTimes(1);
        // Check that mockEq was called correctly via mockDb.where
        expect(hoistedMocks.mockDb.where).toHaveBeenCalledTimes(1);
        expect(hoistedMocks.mockEq).toHaveBeenCalledWith(clientsTable.id, MOCK_CLIENT_UUID);
        expect(revalidatePath).toHaveBeenCalledWith('/clients');
        expect(revalidatePath).toHaveBeenCalledWith('/enrollments');
     });

     it('should return validation error for invalid UUID', async () => {
        const formData = createMockFormData({ id: 'invalid-uuid' });
        const result = await deleteClientAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid Client ID');
        expect(result.errors).toHaveProperty('_form');
        expect(hoistedMocks.mockDb.delete).not.toHaveBeenCalled();
     });

     it('should return error if client not found for deletion', async () => {
        hoistedMocks.mockDb.returning.mockResolvedValueOnce([]); // Simulate client not found
        const formData = createMockFormData({ id: MOCK_CLIENT_UUID });
        const result = await deleteClientAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Client not found for deletion');
        expect(result.errors).toHaveProperty('_form');
     });

     it('should handle generic database errors during deletion', async () => {
        hoistedMocks.mockDb.returning.mockRejectedValueOnce(new Error('Generic Delete Error'));
        const formData = createMockFormData({ id: MOCK_CLIENT_UUID });
        const result = await deleteClientAction(null, formData);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Failed to delete client');
        expect(result.errors).toHaveProperty('_form');
    });
   });

  //---------------------------------
  // getClientById Tests
  //---------------------------------
  describe('getClientById', () => {
    it('should return a decrypted client when found', async () => {
      // Mock the final step of the db chain for select
      hoistedMocks.mockDb.limit.mockResolvedValueOnce([MOCK_DB_CLIENT_RAW]);
      const client = await getClientById(MOCK_CLIENT_UUID);

      expect(client).not.toBeNull();
      expect(client?.id).toBe(MOCK_CLIENT_UUID);
      expect(client?.firstName).toBe('John'); 
      expect(client?.email).toBe('john.doe@example.com');
      expect(hoistedMocks.mockDecrypt).toHaveBeenCalledWith(MOCK_DB_CLIENT_RAW.firstName);
      expect(hoistedMocks.mockDecrypt).toHaveBeenCalledWith(MOCK_DB_CLIENT_RAW.email);
      // Check that mockEq was called correctly via mockDb.where
      expect(hoistedMocks.mockDb.where).toHaveBeenCalledTimes(1);
      expect(hoistedMocks.mockEq).toHaveBeenCalledWith(clientsTable.id, MOCK_CLIENT_UUID);
    });

    it('should return null if client not found', async () => {
      hoistedMocks.mockDb.limit.mockResolvedValueOnce([]);
      const client = await getClientById(MOCK_CLIENT_UUID);
      expect(client).toBeNull();
      expect(hoistedMocks.mockDb.select).toHaveBeenCalled();
    });

    it('should return null for invalid UUID format', async () => {
      const client = await getClientById('invalid-uuid');
      expect(client).toBeNull();
      expect(hoistedMocks.mockDb.select).not.toHaveBeenCalled();
    });
    
    it('should return client with placeholder on decryption failure', async () => {
        const corruptData = { ...MOCK_DB_CLIENT_RAW, email: 'invalid-encrypted-email' };
        hoistedMocks.mockDb.limit.mockResolvedValueOnce([corruptData]);
        hoistedMocks.mockDecrypt.mockImplementation((text: string) => {
            if (text === 'invalid-encrypted-email') {
                throw new Error('Decryption failed');
            }
            return text.startsWith('encrypted-') ? text.substring(10) : text;
        });

        const client = await getClientById(MOCK_CLIENT_UUID);

        expect(client).not.toBeNull();
        expect(client?.firstName).toBe('John');
        expect(client?.email).toBe('[DECRYPTION_FAILED]'); 
    });
  });

  //---------------------------------
  // getAllClients Tests
  //---------------------------------
  describe('getAllClients', () => {
      it('should return a list of decrypted clients', async () => {
          const mockDbClients = [
              MOCK_DB_CLIENT_RAW,
              { ...MOCK_DB_CLIENT_RAW, id: 'uuid-2', firstName: 'encrypted-Jane', email: 'encrypted-jane@example.com' }
          ];
          // Mock the final step of the db chain for select using mockDb
          hoistedMocks.mockDb.orderBy.mockResolvedValueOnce(mockDbClients); 
          const clients = await getAllClients();

          expect(clients).toHaveLength(2);
          expect(clients[0].firstName).toBe('John');
          expect(clients[1].firstName).toBe('Jane');
          expect(clients[0].email).toBe('john.doe@example.com');
          expect(clients[1].email).toBe('jane@example.com');
          expect(hoistedMocks.mockDecrypt).toHaveBeenCalledTimes(mockDbClients.length * 7); // Called for each field per client
      });

      it('should return an empty array if no clients exist', async () => {
           // use hoisted mockDb here
           hoistedMocks.mockDb.orderBy.mockResolvedValueOnce([]);
           const clients = await getAllClients();
           expect(clients).toHaveLength(0);
      });
  });

  //---------------------------------
  // searchClients Tests
  //---------------------------------
  describe('searchClients', () => {
      it('should return all clients if query is empty or whitespace', async () => {
          const mockDbClients = [MOCK_DB_CLIENT_RAW];
          // Mock the final step for the getAllClients call within searchClients using mockDb
          hoistedMocks.mockDb.orderBy.mockResolvedValueOnce(mockDbClients); 
          
          const clientsEmpty = await searchClients('');
          expect(clientsEmpty).toHaveLength(1);
          expect(clientsEmpty[0].firstName).toBe('John');

          // Reset mock for the next call within the same test
          vi.clearAllMocks(); // Clear calls
          // Reset hoisted mockDb behavior
          hoistedMocks.mockDb.orderBy.mockResolvedValueOnce(mockDbClients);
          const clientsSpace = await searchClients('   ');
          expect(clientsSpace).toHaveLength(1);
          expect(clientsSpace[0].firstName).toBe('John');
      });

       it('should return empty array and log warning if query is provided (due to encryption)', async () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn');
            const clients = await searchClients('john');
            expect(clients).toEqual([]);
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('searching encrypted client fields'));
            consoleWarnSpy.mockRestore();
       });
  });

  //---------------------------------
  // getClientWithEnrollments Tests (low priority)
  //---------------------------------
  // TODO: Add tests for getClientWithEnrollments, mocking mockDb.query.clients.findFirst 
  // and ensuring enrollments and nested program/client data are decrypted/mapped correctly.

}); 