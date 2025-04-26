// vitest.setup.ts
// This file can be used for global test setup, like:
// - Mocking global objects (e.g., fetch)
// - Setting up test environment variables (though vi.stubEnv in tests is often preferred)
// - Importing global CSS for component tests

import { vi } from 'vitest';

// --- IMPORTANT --- 
// This is a TEST KEY. DO NOT use your production key here.
const TEST_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 hex chars

// Set the environment variable for all tests
process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;

// Example (if needed later):
// vi.mock('some-global-module', () => ({ ... }));

console.log('Vitest setup file loaded. ENCRYPTION_KEY set for tests.'); 