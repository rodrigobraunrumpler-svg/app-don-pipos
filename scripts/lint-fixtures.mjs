// Lo que debe dar cada archivo de tools/lint-fixtures/src: la regla que lo atrapa, una vez por cada falta.
// Cada archivo tiene una sola falta, para que apagar una regla siempre se note. Los archivos que no están aquí deben pasar limpios.
const D = "boundaries/dependencies";
const COLOR = "no-restricted-syntax";

export const EXPECTED = {
  // Quién puede usar a quién (PROJECT_CONTEXT.md §9.1)
  "app/talks-to-supabase.tsx": [D],
  "app/enters-feature.tsx": [D],
  "components/ui/knows-business.tsx": [D],
  "components/ui/uses-test-helpers.tsx": [D],
  "features/orders/api/uses-components.ts": [D],
  "features/orders/components/uses-api.tsx": [D],
  "features/orders/components/enters-other-feature.tsx": [D],
  "features/orders/components/uses-supabase-js.tsx": [D],
  "features/orders/hooks/use-api.ts": [D],
  "features/orders/queries/uses-hooks.ts": [D],
  "features/orders/rules/uses-api.ts": [D],
  "features/orders/rules/uses-lib-supabase.ts": [D],
  "features/orders/rules/uses-react.ts": [D],
  "features/orders/rules/uses-asset.ts": [D],
  "lib/knows-business.ts": [D],
  "outside-structure.ts": ["boundaries/no-unknown-files"],
  "lib/cycle-a.ts": ["import-x/no-cycle"],
  "lib/cycle-b.ts": ["import-x/no-cycle"],

  // Colores escritos a mano fuera de src/theme
  "features/orders/components/color-hex-3.ts": [COLOR],
  "features/orders/components/color-hex-6.ts": [COLOR],
  "features/orders/components/color-hex-8.ts": [COLOR],
  "features/orders/components/color-rgb.ts": [COLOR],
  "features/orders/components/color-hsl.ts": [COLOR],
  "features/orders/components/color-template.ts": [COLOR],
  "features/orders/components/color-tailwind.tsx": [COLOR],

  // Nombres, tamaño y forma de los archivos
  "features/orders/components/BadFolder/thing.tsx": ["check-file/folder-naming-convention"],
  "features/orders/components/OrderCard.tsx": ["check-file/filename-naming-convention"],
  "features/orders/components/two-components.tsx": ["react/no-multi-comp"],
  "features/orders/rules/too-long.ts": ["max-lines"], // 251 líneas; just-fits.ts tiene 250 y pasa
  "features/leaky/index.ts": ["no-restricted-syntax"], // export *

  // Atajos prohibidos
  "features/orders/rules/uses-any.ts": ["@typescript-eslint/no-explicit-any"],
  "features/orders/rules/uses-ts-ignore.ts": ["@typescript-eslint/ban-ts-comment"],
  "features/orders/rules/uses-console.ts": ["no-console"],
  // El comentario no apaga la regla: se avisa el comentario y la falta sigue ahí
  "lib/disables-lint.ts": ["comentario-sin-efecto", "no-console"],

  // Accesibilidad
  "components/ui/no-a11y.tsx": ["react-native-a11y/has-valid-accessibility-descriptors"],
};

// Los archivos de prueba importan paquetes que pueden no estar instalados
export const IGNORED = new Set(["import/no-unresolved"]);
