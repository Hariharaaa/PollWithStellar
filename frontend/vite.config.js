import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': '{}',
  },
  optimizeDeps: {
    // Include stellar-sdk in pre-bundling (default behaviour)
    // so Vite resolves CommonJS modules correctly
    include: [
      '@stellar/stellar-sdk',
      '@creit.tech/stellar-wallets-kit',
      '@creit.tech/stellar-wallets-kit/sdk',
      '@creit.tech/stellar-wallets-kit/types',
    ],
  },
  build: {
    target: 'esnext',
    rolldownOptions: {
      output: {
        codeSplitting: true,
      },
    },
  },
})
