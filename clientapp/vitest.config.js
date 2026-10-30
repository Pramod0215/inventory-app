import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /\.[jt]sx?$/,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.{js,jsx}', 'src/**/*.test.{js,jsx}'],
    setupFiles: ['./tests/setup.js'],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.test.{js,jsx}', 'src/setupTests.js'],
    },
  },
});
