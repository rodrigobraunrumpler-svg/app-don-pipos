module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  // Los recorridos con la app entera tardan; con la máquina ocupada y la cobertura, 5 s (lo de Jest) no alcanzaba.
  // Y con un trabajador por núcleo, los archivos compiten entre sí: la mitad de los núcleos corre más parejo
  testTimeout: 15_000,
  maxWorkers: "50%",
  // Las hojas de estilo (global.css) no son JavaScript: en las pruebas se cambian por un módulo vacío
  moduleNameMapper: { "\\.css$": "<rootDir>/jest.css-stub.js", "^@/(.*)$": "<rootDir>/src/$1" },
  testPathIgnorePatterns: [
    "/node_modules/",
    "/tools/lint-fixtures/",
    "/templates/",
    "<rootDir>/scripts/",
    "<rootDir>/supabase/",
  ],
  collectCoverageFrom: [
    "src/lib/{money,dates,errors}.ts",
    "src/theme/tokens.ts",
    "src/features/*/rules/**/*.ts",
    "!**/*.test.ts",
  ],
  coverageThreshold: { global: { branches: 100, functions: 100, lines: 100, statements: 100 } },
};
