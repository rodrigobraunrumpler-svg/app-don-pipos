// Quién puede usar a quién (PROJECT_CONTEXT.md §9.1). Gana la última política que coincide.
import { join } from "node:path";

import boundaries from "eslint-plugin-boundaries";

// Las extensiones del código: las reglas valen para todas, no solo para TypeScript
export const CODE = "{ts,tsx,js,jsx,mjs,cjs}";

// Cada lugar conocido se escribe desde la raíz del repositorio: src/ y su copia en miniatura, que prueba las reglas.
// Así una ruta repetida más adentro (src/components/ui/src/features/x/api) no recibe los permisos de la verdadera
const ROOTS = ["src", "tools/lint-fixtures/src"];
const ASSET_ROOTS = ["assets", "tools/lint-fixtures/assets"];
const at = (path) => ROOTS.map((root) => `${root}/${path}`);
const folder = (type, path, options) => ({ type, pattern: at(path), partialMatch: false, ...options });

const LAYERS = ["api", "queries", "schema", "rules", "hooks", "components"];
// Dónde puede vivir una prueba (*.test.*). En src/app no: ahí todo archivo es una pantalla
const TESTABLE = [...LAYERS.map((layer) => `features/*/${layer}`), "components/ui", "lib", "theme", "test"];

// Para escribir las políticas: carpetas por su tipo, y los archivos sueltos por su categoría
const of = (...types) => ({ element: { type: types } });
const file = (category, captured) => ({ file: { categories: category, ...(captured && { captured }) } });
const fromFolder = { feature: "{{ from.element.captured.feature }}" };
const fromFile = { feature: "{{ from.file.captured.feature }}" };
const sameLayers = (...names) => names.map((n) => ({ element: { type: `feature-${n}`, captured: fromFolder } }));
const ownConstants = file("feature-constants", fromFolder);
const otherFeatureIndex = file("feature-index", { feature: "!{{ from.element.captured.feature }}" });
const anyFeatureIndex = file("feature-index");
const asset = file("asset");
// El cliente de Supabase es un archivo de lib con su propia regla: solo lo importan api/ y su propia prueba
const supabaseClient = file("supabase-client");
const supabaseClientTest = { file: { path: at("lib/supabase.test.ts") } };

export const structureSettings = {
  // Los patrones se leen desde la raíz del repositorio, se corra el lint desde donde se corra
  "boundaries/root-path": join(import.meta.dirname, ".."),
  "boundaries/elements": [
    folder("route", "app"),
    ...LAYERS.map((layer) => folder(`feature-${layer}`, `features/*/${layer}`, { capture: ["feature"] })),
    folder("ui", "components/ui"),
    folder("lib", "lib"),
    folder("theme", "theme"),
    folder("test-utils", "test"),
    folder("types", "types"),
  ],
  // Archivos sueltos con su propio papel. Dentro de un módulo solo existen estos dos y las seis carpetas:
  // cualquier otro archivo o carpeta no coincide con nada y falla (boundaries/no-unknown-files)
  "boundaries/files": [
    { pattern: at("features/*/index.ts"), category: "feature-index", capture: ["feature"] },
    { pattern: at("features/*/constants.ts"), category: "feature-constants", capture: ["feature"] },
    { pattern: at("lib/supabase.ts"), category: "supabase-client" },
    { pattern: TESTABLE.flatMap((dir) => at(`${dir}/**/*.test.${CODE}`)), category: "test" },
    // Solo las imágenes y las letras de assets/, la carpeta de la raíz: ni una carpeta «assets» dentro de src, ni código
    { pattern: ASSET_ROOTS.map((root) => `${root}/**/*.{png,jpg,jpeg,webp,gif,ttf,otf}`), category: "asset" },
  ],
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
      // También se revisa lo que se importa dentro de una misma carpeta: lib/supabase.ts vive en lib
      checkInternals: true,
      policies: [
        { allow: { dependency: { relationship: { to: "internal" } } } },
        { allow: { to: { module: { origin: ["external", "core"] } } } },
        { from: of("route"), allow: { to: [anyFeatureIndex, of("ui", "theme", "lib"), asset] } },
        {
          from: of("feature-components"),
          allow: {
            to: [
              ...sameLayers("hooks", "queries", "rules", "schema"),
              ownConstants,
              otherFeatureIndex,
              of("ui", "theme", "lib"),
              asset,
            ],
          },
        },
        {
          from: of("feature-hooks"),
          allow: { to: [...sameLayers("queries", "rules", "schema"), ownConstants, otherFeatureIndex, of("lib")] },
        },
        { from: of("feature-queries"), allow: { to: [...sameLayers("api", "schema"), of("lib")] } },
        { from: of("feature-api"), allow: { to: [...sameLayers("schema"), of("lib", "types")] } },
        {
          from: of("feature-rules"),
          allow: {
            to: [
              ...sameLayers("schema"),
              ownConstants,
              { element: { type: "lib", fileInternalPath: ["money.ts", "dates.ts"] } },
            ],
          },
        },
        // index.ts publica lo de su módulo, menos api. constants.ts no tiene política: no usa nada de la app
        {
          from: file("feature-index"),
          allow: {
            to: ["components", "hooks", "queries", "rules", "schema"].map((layer) => ({
              element: { type: `feature-${layer}`, captured: fromFile },
            })),
          },
        },
        { from: of("ui"), allow: { to: [of("theme", "lib"), asset] } },
        { from: of("lib"), allow: { to: of("types") } },
        { from: of("test-utils"), allow: { to: [anyFeatureIndex, of("ui", "theme", "lib", "route")] } },
        { from: file("test"), allow: { to: of("test-utils") } },
        // Un solo punto de contacto con Supabase: el cliente lo importa api/, nadie más (tampoco otro archivo de lib)
        {
          disallow: { to: supabaseClient },
          message: "Solo api/ importa el cliente de Supabase (src/lib/supabase.ts)",
        },
        { from: [of("feature-api"), supabaseClientTest], allow: { to: supabaseClient } },
        {
          from: [of("feature-api", "feature-rules", "feature-schema"), file("feature-constants")],
          disallow: {
            to: {
              module: { origin: "external", source: ["react", "react-native", "expo-*", "@tanstack/react-query"] },
            },
          },
          message: "Esta carpeta no usa React: {{ to.module.source }} va en components/, hooks/ o queries/",
        },
        {
          from: [
            of("route", "feature-*", "ui", "theme", "test-utils"),
            file("feature-index"),
            file("feature-constants"),
          ],
          disallow: { to: { module: { origin: "external", source: "@supabase/*" } } },
          message: "Solo src/lib/supabase.ts importa {{ to.module.source }}",
        },
      ],
    },
  ],
};

export { boundaries };
