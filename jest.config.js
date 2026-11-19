module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testPathIgnorePatterns: ["/node_modules/", "/tools/lint-fixtures/", "/templates/", "<rootDir>/scripts/"],
  collectCoverageFrom: [
    "src/lib/{money,dates,errors}.ts",
    "src/theme/tokens.ts",
    "src/features/*/rules/**/*.ts",
    "!**/*.test.ts",
  ],
  coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
};
