import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing/vitest-plugin';

export default defineConfig({
  // Gives tests the same aliases and auto-imports as the extension build,
  // plus an in-memory fake of the `browser` extension API.
  plugins: [WxtVitest()],
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'entrypoints/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
});
