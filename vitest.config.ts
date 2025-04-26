import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // Add react plugin for testing components
  test: {
    globals: true, // Use Vitest global APIs (describe, test, expect)
    environment: 'jsdom', // Simulate browser environment for component tests
    setupFiles: './vitest.setup.ts', // Optional setup file (e.g., for global mocks)
    // Add coverage configuration if needed
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      exclude: [
          'node_modules/',
          'dist/',
          '.next/',
          'coverage/',
          '*.config.js',
          '*.config.ts',
          'vitest.setup.ts'
      ], 
    },
    // Add @ alias for imports like in tsconfig.json
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
}) 