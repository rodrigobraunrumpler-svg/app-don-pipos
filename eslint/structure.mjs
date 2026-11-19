// Quién puede usar a quién (PROJECT_CONTEXT.md §9.1). Gana la última política que coincide.
import boundaries from "eslint-plugin-boundaries";

const LAYERS = ["api", "queries", "schema", "rules", "hooks", "components"];
const same = { feature: "{{ from.element.captured.feature }}" };
const sameLayers = (...names) => names.map((n) => ({ element: { type: `feature-${n}`, captured: same } }));
const ownFile = (file) => ({ element: { type: "feature", captured: same, fileInternalPath: file } });
const otherFeatureIndex = {
  element: {
    type: "feature",
    captured: { feature: "!{{ from.element.captured.feature }}" },
    fileInternalPath: "index.ts",
  },
};
const anyFeatureIndex = { element: { type: "feature", fileInternalPath: "index.ts" } };
const libButSupabase = { element: { type: "lib", fileInternalPath: "!supabase.ts" } };
const of = (...types) => ({ element: { type: types } });

export const structureSettings = {
  "boundaries/elements": [
    { type: "route", pattern: "src/app" },
    ...LAYERS.map((n) => ({ type: `feature-${n}`, pattern: `src/features/*/${n}`, capture: ["feature"] })),
    { type: "feature", pattern: "src/features/*", capture: ["feature"] },
    { type: "ui", pattern: "src/components/ui" },
    { type: "lib", pattern: "src/lib" },
    { type: "theme", pattern: "src/theme" },
    { type: "test-utils", pattern: "src/test" },
    { type: "types", pattern: "src/types" },
  ],
  "boundaries/files": [{ pattern: "**/*.test.{ts,tsx}", category: "test" }],
  "boundaries/legacy-templates": false,
};

export const structureRules = {
  "boundaries/no-unknown-files": 2,
  "boundaries/dependencies": [
    2,
    {
      default: "disallow",
      checkAllOrigins: true,
      checkUnknownLocals: true,
      policies: [
        { allow: { to: { module: { origin: ["external", "core"] } } } },
        { from: of("route"), allow: { to: [anyFeatureIndex, of("ui", "theme"), libButSupabase] } },
        {
          from: of("feature-components"),
          allow: {
            to: [
              ...sameLayers("hooks", "queries", "rules", "schema"),
              ownFile("constants.ts"),
              otherFeatureIndex,
              of("ui", "theme"),
              libButSupabase,
            ],
          },
        },
        {
          from: of("feature-hooks"),
          allow: {
            to: [
              ...sameLayers("queries", "rules", "schema"),
              ownFile("constants.ts"),
              otherFeatureIndex,
              libButSupabase,
            ],
          },
        },
        { from: of("feature-queries"), allow: { to: [...sameLayers("api", "schema"), libButSupabase] } },
        { from: of("feature-api"), allow: { to: [...sameLayers("schema"), of("lib", "types")] } },
        {
          from: of("feature-rules"),
          allow: {
            to: [
              ...sameLayers("schema"),
              ownFile("constants.ts"),
              { element: { type: "lib", fileInternalPath: ["money.ts", "dates.ts"] } },
            ],
          },
        },
        { from: of("feature"), allow: { to: sameLayers("components", "hooks", "queries", "rules", "schema") } },
        { from: of("ui"), allow: { to: [of("theme"), libButSupabase] } },
        { from: of("lib"), allow: { to: of("types") } },
        { from: of("test-utils"), allow: { to: [anyFeatureIndex, of("ui", "theme", "lib", "route")] } },
        { from: { file: { categories: "test" } }, allow: { to: of("test-utils") } },
        {
          from: of("feature-api", "feature-rules", "feature-schema"),
          disallow: {
            to: {
              module: { origin: "external", source: ["react", "react-native", "expo-*", "@tanstack/react-query"] },
            },
          },
          message: "Esta carpeta no usa React: {{ to.module.source }} va en components/, hooks/ o queries/",
        },
        {
          from: of("route", "feature", "feature-*", "ui", "theme", "test-utils"),
          disallow: { to: { module: { origin: "external", source: "@supabase/*" } } },
          message: "Solo src/lib/supabase.ts importa {{ to.module.source }}",
        },
      ],
    },
  ],
};

export { boundaries };
