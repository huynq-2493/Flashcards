"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Global test setup — runs before all tests
const vitest_1 = require("vitest");
// Suppress console.error in tests unless DEBUG=true
if (!process.env.DEBUG) {
    vitest_1.vi.spyOn(console, 'error').mockImplementation(() => { });
}
//# sourceMappingURL=setup.js.map