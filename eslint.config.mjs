import { fixupPluginRules } from "@eslint/compat";
import pluginQuery from "@tanstack/eslint-plugin-query";
import expo from "eslint-config-expo/flat.js";
import prettier from "eslint-config-prettier";
import checkFile from "eslint-plugin-check-file";
import { importX } from "eslint-plugin-import-x";
import a11y from "eslint-plugin-react-native-a11y";
import { createTypeScriptImportResolver } from "eslint-import-resolver-typescript";
import globals from "globals";
import tseslint from "typescript-eslint";

import { colorSelectors } from "./eslint/colors.mjs";
import { boundaries, CODE, structureRules, structureSettings } from "./eslint/structure.mjs";

const NO_EXPORT_ALL = {
  selector: "ExportAllDeclaration",
  message: "En index.ts lo público se elige nombre por nombre",
};

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      ".superpowers/**",
      "dist/**",
      "coverage/**",
      "docs/**",
      "templates/**",
      "tools/lint-fixtures/**",
      "src/types/database.ts",
    ],
  },
  ...expo,
  ...pluginQuery.configs["flat/recommended"],
  {
    // Todo el código de src, también el que no es TypeScript: un .js o un .jsx no queda fuera de las reglas
    files: [`**/src/**/*.${CODE}`],
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: "error" },
    plugins: {
      boundaries,
      "check-file": checkFile,
      "import-x": importX,
      "react-native-a11y": fixupPluginRules(a11y),
    },
    settings: {
      ...structureSettings,
      ...importX.flatConfigs.typescript.settings,
      "import/resolver": { typescript: { alwaysTryTypes: true } },
      "import-x/resolver-next": [createTypeScriptImportResolver({ alwaysTryTypes: true })],
    },
    rules: {
      ...structureRules,
      "import-x/no-cycle": 2,
      "max-lines": [2, { max: 250, skipBlankLines: true, skipComments: true }],
      "react/no-multi-comp": 2,
      "no-console": 2,
      // La cobertura se cumple con pruebas, no sacando ramas de la cuenta con un comentario
      "no-warning-comments": [2, { terms: ["istanbul ignore", "c8 ignore", "v8 ignore"], location: "anywhere" }],
      "react-native-a11y/has-valid-accessibility-descriptors": 2,
      "check-file/filename-naming-convention": [
        2,
        { [`**/src/!(app)/**/*.${CODE}`]: "KEBAB_CASE" },
        { ignoreMiddleExtensions: true },
      ],
      "check-file/folder-naming-convention": [2, { "**/src/!(app)/**": "KEBAB_CASE" }],
      "no-restricted-syntax": [2, ...colorSelectors],
    },
  },
  {
    // Reglas que solo existen en TypeScript
    files: ["**/src/**/*.{ts,tsx}"],
    rules: { "@typescript-eslint/no-explicit-any": 2, "@typescript-eslint/ban-ts-comment": 2 },
  },
  { files: ["**/src/theme/**"], rules: { "no-restricted-syntax": 0 } },
  // Una regla solo admite una lista: en el index.ts de un módulo van las de colores y, además, la de export *
  { files: ["**/src/features/*/index.ts"], rules: { "no-restricted-syntax": [2, ...colorSelectors, NO_EXPORT_ALL] } },
  { files: [`**/*.test.${CODE}`, "jest.setup.js"], languageOptions: { globals: globals.jest } },
  prettier,
);
