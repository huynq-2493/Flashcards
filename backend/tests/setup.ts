// Global test setup — runs before all tests
import { vi } from 'vitest';

// Suppress console.error in tests unless DEBUG=true
if (!process.env.DEBUG) {
  vi.spyOn(console, 'error').mockImplementation(() => {});
}
