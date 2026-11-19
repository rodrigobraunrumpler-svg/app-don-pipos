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

  // Dentro de un módulo solo existen index.ts, constants.ts y las seis carpetas; fuera de las carpetas conocidas, nada
  "features/orders/utils/helper.ts": ["boundaries/no-unknown-files"],
  "features/orders/widget.tsx": ["boundaries/no-unknown-files"],
  "features/orders/extra.ts": ["boundaries/no-unknown-files"],
  "features/shared.ts": ["boundaries/no-unknown-files"],
  "misc/orphan.test.ts": ["boundaries/no-unknown-files"], // llamarse .test.ts no vuelve conocido a un archivo
  "features/leaky/constants.ts": [D], // constants.ts no usa nada del módulo
  "features/catalog/index.ts": [D], // index.ts publica carpetas del módulo; constants.ts no está en su lista (§9.1)
  // Una ruta repetida más adentro no da los permisos de la verdadera: esto es components/ui, no un api/
  "components/ui/src/features/fake/api/talks-to-supabase.ts": [D],

  // El cliente de Supabase (lib/supabase.ts) solo lo importa api/: ni otro archivo de lib ni las ayudas de prueba.
  // Su propia prueba (lib/supabase.test.ts) sí puede, y pasa limpia
  "lib/barrel.ts": [D],
  "lib/db.ts": [D],
  "test/uses-supabase.ts": [D],

  // Paquetes externos: rules/ no importa ninguno; schema/ y constants.ts, solo zod; api/ no usa React;
  // y @supabase/* solo en lib/supabase.ts y en api/ (schema/uses-zod.ts y api/uses-supabase-js.ts pasan limpios)
  "features/orders/rules/uses-reanimated.ts": [D],
  "features/orders/rules/uses-zod.ts": [D],
  "features/orders/rules/uses-node.ts": [D],
  "features/orders/schema/uses-date-fns.ts": [D],
  "features/orders/schema/uses-react.ts": [D],
  "features/noisy/constants.ts": [D],
  "features/orders/api/uses-react-query.ts": [D],
  "lib/uses-supabase-js.ts": [D],
  "types/uses-supabase-js.ts": [D],

  // «assets» es solo la carpeta de imágenes y letras de la raíz: una carpeta con ese nombre dentro de src no tiene trato especial
  "assets/fake-asset.ts": ["boundaries/no-unknown-files"],
  "app/enters-feature-through-assets.tsx": [D],
  "features/orders/components/assets/talks-to-supabase.ts": [D],
  "app/imports-code-from-assets.tsx": [D], // en assets/ solo cuentan las imágenes y las letras
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

  // Las reglas valen igual para los archivos .js, .jsx, .mjs y .cjs
  "features/orders/components/legacy-widget.jsx": [D],
  "features/orders/components/two-in-one.jsx": ["react/no-multi-comp"],
  "lib/disables-lint.js": ["comentario-sin-efecto", "no-console"],
  "lib/knows-business.cjs": [D],
  "lib/logs.mjs": ["no-console"],
  "misc/loose.js": ["boundaries/no-unknown-files"],

  // Accesibilidad
  "components/ui/no-a11y.tsx": ["react-native-a11y/has-valid-accessibility-descriptors"],
};

// Los archivos de prueba importan paquetes que pueden no estar instalados
export const IGNORED = new Set(["import/no-unresolved"]);
