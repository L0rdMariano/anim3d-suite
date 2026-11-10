import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const kit = fileURLToPath(new URL('./anim3d-fundamentos/kit/src/', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@anim3d\/kit$/, replacement: kit + 'index.ts' },
      { find: /^@anim3d\/kit\/(.*)$/, replacement: kit + '$1' },
    ],
  },
  test: { environment: 'jsdom', include: ['anim3d-*/**/*.test.{ts,tsx}'], exclude: ['**/node_modules/**'] },
});
