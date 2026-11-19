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

import { boundaries, structureRules, structureSettings } from "./eslint/structure.mjs";

// Un color completo (#rgb, #rrggbb, #rrggbbaa), un valor suelto de Tailwind ([#fff]) o rgb()/hsl(). «#0042» no coincide: es un número de pedido
const RAW_COLOR = "/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$|\\[#[0-9a-fA-F]{3,8}\\]|\\b(?:rgba?|hsla?)\\(/";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
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
    files: ["**/src/**/*.{ts,tsx}"],
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
      "@typescript-eslint/no-explicit-any": 2,
      "@typescript-eslint/ban-ts-comment": 2,
      "react-native-a11y/has-valid-accessibility-descriptors": 2,
      "check-file/filename-naming-convention": [
        2,
        { "**/src/!(app)/**/*.{ts,tsx}": "KEBAB_CASE" },
        { ignoreMiddleExtensions: true },
      ],
      "check-file/folder-naming-convention": [2, { "**/src/!(app)/**": "KEBAB_CASE" }],
      "no-restricted-syntax": [
        2,
        { selector: `Literal[value=${RAW_COLOR}]`, message: "Los colores van en src/theme" },
        { selector: `TemplateElement[value.raw=${RAW_COLOR}]`, message: "Los colores van en src/theme" },
      ],
    },
  },
  { files: ["**/src/theme/**"], rules: { "no-restricted-syntax": 0 } },
  {
    files: ["**/src/features/*/index.ts"],
    rules: {
      "no-restricted-syntax": [
        2,
        { selector: "ExportAllDeclaration", message: "En index.ts lo público se elige nombre por nombre" },
      ],
    },
  },
  { files: ["**/*.test.{ts,tsx}"], languageOptions: { globals: globals.jest } },
  prettier,
);
