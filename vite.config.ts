/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { imageUploadPlugin } from './vite-upload-plugin';

export default defineConfig({
  plugins: [react(), imageUploadPlugin()],
  build: { chunkSizeWarningLimit: 2000 },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
