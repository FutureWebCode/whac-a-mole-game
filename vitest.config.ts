import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['**/*.test.ts', '**/*.test.tsx'],
    setupFiles: ['./src/vitest-setup.ts'],
  },
  define: {
    global: 'globalThis',
  },
})
