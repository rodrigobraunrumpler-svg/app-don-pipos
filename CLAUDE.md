# CLAUDE.md — Reglas para trabajar en la app de Don Pipos

App de gestión para Android (Expo SDK 58 + Supabase). Idioma del proyecto: español (Perú). Este archivo resume; cuando haga falta el detalle, manda el documento que se cita.

## 1. Mapa de documentos

| Documento                 | Qué tiene                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `docs/PROJECT_CONTEXT.md` | Alcance, decisiones, reglas del negocio (§6), estructura de carpetas (§9), reglas del código (§10), seguridad (§12) y stack (§14) |
| `docs/glossary.md`        | El nombre de cada concepto en la pantalla, en el código y en la base. Manda sobre cualquier otro nombre                           |
| `docs/spec/`              | `README.md` con las reglas comunes de la base, y un archivo por módulo                                                            |
| `docs/plan/`              | `README.md` con las fases y su estado, y el plan detallado de cada fase                                                           |
| `docs/design/pantallas/`  | La maqueta aprobada (`index.html`). Es la referencia visual; sus datos son de ejemplo                                             |

Si un cambio se aparta de la especificación, primero se actualiza la especificación.

## 2. Reglas que no se negocian

Las 18 reglas del código (`PROJECT_CONTEXT.md` §10.1):

1. **Pantallas delgadas:** `src/app` pide los datos a los módulos y los muestra; no consulta ni calcula.
2. **Supabase solo en `api/`:** es el único punto de contacto de cada módulo.
3. **Módulos que no se pisan:** un módulo usa otro solo por su `index.ts`, sin ciclos.
4. **Cada carpeta en su papel:** la tabla de `PROJECT_CONTEXT.md` §9.1.
5. **Lo común no sabe del negocio:** `components/ui` y `lib` no importan de ningún módulo.
6. **Las cuentas, donde corresponde:** lo guardado lo calcula la base; el celular solo calcula la vista previa, en `rules/` y con pruebas.
7. **Archivos chicos:** un componente por archivo y 250 líneas como máximo.
8. **La base cambia solo con migraciones** (`supabase/migrations/`), cada una probada antes de enviarse; los tipos se generan de la base.
9. **Cada tabla igual de segura:** `business_id`, `created_at`, `updated_at`, reglas de acceso activas y `search_path` fijo en las funciones.
10. **Montos y fechas centralizados:** céntimos enteros y hora de Lima, siempre con `lib/money.ts` y `lib/dates.ts`.
11. **Idioma:** el código en inglés; los textos que ve el dueño, en español.
12. **Sin librerías de más:** TanStack Query para los datos y el estado de React para lo demás.
13. **Lo que se repite sube:** si lo usan dos módulos, pasa a `components/ui` o a `lib`.
14. **Módulos con la misma forma:** se crean con `pnpm new:feature <nombre>`, nunca a mano.
15. **Un nombre por concepto:** manda `docs/glossary.md`; un concepto nuevo se agrega ahí antes de usarlo.
16. **Errores con un solo formato:** `api/` convierte todo en `AppError`; los textos para el dueño salen de `lib/errors.ts`.
17. **Base rápida desde el principio:** un índice compuesto por consulta (empieza por `business_id`), cursor en vez de OFFSET y lo muy leído ya calculado.
18. **Que nada se duplique:** cada creación lleva un `request_id`; si se reintenta, la base devuelve lo ya creado.

El lint (`eslint.config.mjs`, `eslint/structure.mjs` y `eslint/colors.mjs`) hace cumplir las que se pueden leer en el código:

- **La 2, la 3, la 4 y la 5,** por lo que cada archivo importa: la tabla de `PROJECT_CONTEXT.md` §9.1, sin importaciones en círculo.
- **La 7,** con el máximo de 250 líneas y un componente por archivo.
- **En parte:** de la 1, que una pantalla no entre a un módulo por dentro ni hable con Supabase; de la 6, que `rules/` no importe ningún paquete (y las pruebas exigen ahí el 100 % de cobertura); de la 14, que dentro de un módulo no haya otro archivo ni otra carpeta.
- **Y fuera de las 18:** nombres en kebab-case, colores solo en `theme/`, nada de `any`, `@ts-ignore` ni `console`, que cada botón declare su rol o su nombre para el lector de pantalla, y ningún comentario que saque código de la cobertura.

Las demás no las ve el lint. La 8, la 9, la 17 y la 18 se comprueban en la base de datos, con las pruebas que llegan en la fase 1. La 10, la 11, la 12, la 13, la 15 y la 16 se cuidan al escribir y en la revisión de cada módulo.

Un comentario `eslint-disable` no tiene efecto: se corrige el código, no la regla. `pnpm lint:rules` comprueba que las reglas sigan atrapando lo que deben; si una se afloja, falla.

Además:

- **No inventar datos del negocio:** productos, precios, clientes, teléfonos ni textos del dueño. Lo que falta se pregunta; lo de prueba se marca como DEMO y vive solo en desarrollo.
- **Nunca pedir ni escribir una llave secreta:** ni la de Supabase (`sb_secret_…`), ni la contraseña de la base, ni un token; tampoco en el chat. Las llaves viven en `.env.local`, que no entra al repositorio y **nunca se abre ni se muestra**: las herramientas lo cargan solas. Ninguna secreta lleva el prefijo `EXPO_PUBLIC_`.

## 3. Dónde va cada cosa

| Si es…                                  | Va en…                                     |
| --------------------------------------- | ------------------------------------------ |
| Una pantalla, o la unión de dos módulos | `src/app/`, y solo arma la pantalla        |
| Hablar con Supabase                     | `features/<módulo>/api/`                   |
| Claves, consultas y mutaciones          | `features/<módulo>/queries/`               |
| La forma de los datos                   | `features/<módulo>/schema/`                |
| Una cuenta (total, estado, demora)      | `features/<módulo>/rules/`, con su prueba  |
| Una pieza propia del módulo             | `features/<módulo>/components/`            |
| Una pieza que usan dos o más módulos    | `components/ui/`                           |
| Una función común (montos, fechas)      | `lib/`                                     |
| Un error y su texto para el dueño       | `lib/errors.ts`                            |
| Un concepto nuevo del negocio           | `docs/glossary.md`, antes que en el código |
| Una ayuda para las pruebas              | `src/test/`                                |
| Un precio, un producto o un límite      | La base de datos                           |
| Un color o un tamaño                    | `theme/`                                   |
| Un cambio en la base de datos           | `supabase/migrations/`                     |

## 4. Comandos

```bash
pnpm start --tunnel        # abre la app en Expo Go: el celular escanea el QR
pnpm lint                  # reglas de estructura y de código, sin avisos
pnpm lint:rules            # prueba las propias reglas: archivos hechos para romperlas y la tabla de §9.1, celda por celda
pnpm typecheck             # genera los tipos de las rutas y compila: un enlace a una pantalla que no existe falla
pnpm test                  # Jest
pnpm test:coverage         # exige 100 % en lib/{money,dates,errors}, theme/tokens y features/*/rules
pnpm test:scripts          # las pruebas de scripts/ (node --test)
pnpm format                # Prettier
pnpm new:feature <nombre>  # crea un módulo en src/features desde templates/feature

pnpm sb <comando>          # la CLI de Supabase, con .env.local y la sesión propia de esta app
pnpm test:db [texto]       # las pruebas de la base (pgTAP); no dejan nada guardado
pnpm db:push               # envía las migraciones pendientes al proyecto de desarrollo
pnpm db:types              # vuelve a generar src/types/database.ts
pnpm db:check              # la revisión completa de la base: lint, consejos, tipos, pruebas y medidor
```

Antes de dar algo por terminado pasan `pnpm lint`, `pnpm lint:rules`, `pnpm typecheck` y `pnpm test`.

**Una vez por copia del repositorio,** para que cada commit se revise solo: instalar gitleaks 8.30.1 (el comando está en `docs/plan/fase-0-proyecto.md`, tarea 7) y correr `pnpm exec lefthook install`. Desde ahí, un commit entra solo si pasan la búsqueda de secretos, el formato, el lint, los tipos, las pruebas y el formato del mensaje. En GitHub (`.github/workflows/ci.yml`) se revisa lo mismo, pero completo y no solo lo que cambió: el formato de todos los archivos, el lint y la prueba de sus reglas, los tipos, las pruebas con su cobertura, el mensaje de cada commit que llega y los secretos en toda la historia.

## 5. La base de datos

El detalle está en `docs/spec/README.md`, «Lo común a todos los módulos» y «Cómo se prueba la base».

- **La CLI de Supabase va siempre por `pnpm sb`,** nunca `supabase` directo: cada comando actúa sobre una base local salvo que lleve `--remote`, y la sesión de esta app vive aparte de la de otros proyectos de la máquina.
- **Solo el proyecto de desarrollo.** Las herramientas se niegan a probar, medir o confirmar cambios (`--yes`) en otro proyecto. El dueño del proyecto autorizó crear, cambiar y reiniciar esa base; cualquier otra base se pregunta antes.
- **Primero la prueba, después la migración:** se escribe el archivo de `supabase/tests/`, se ve fallar con `pnpm test:db`, se escribe la migración (`pnpm sb migration new <nombre>`), se ve pasar, se envía con `pnpm db:push` y se corre `pnpm db:lint` y `pnpm db:advisors`. Una migración enviada no se edita.
- **Se lee con reglas de acceso y se escribe solo por funciones.** La lógica que escribe vive en `private.<nombre>` (`security definer`) y en `public.<nombre>` queda una envoltura que la llama.
- **Toda función** fija `set search_path = ''`, nombra cada cosa con su esquema, usa parámetros con `p_`, recibe y devuelve JSON en camelCase, y avisa los errores con `private.fail('<código>')`.
- **Toda tabla** lleva las reglas de acceso activadas, `business_id`, `created_at` y `updated_at` con su trigger, y un índice por cada llave foránea. Una función nueva para la app se agrega a la lista de `supabase/tests/900_structure.test.sql`.
- **Antes de cerrar una fase** pasa `pnpm db:check`.

## 6. Commits

En inglés y con Conventional Commits: `feat`, `fix`, `docs`, `chore`, `refactor` o `test`. El asunto tiene hasta 100 caracteres. Sin cuerpo y sin pie (tampoco `Co-Authored-By`). Un commit por tarea del plan.

## 7. Antes de escribir código de Expo o de una librería

Leer la documentación de la versión instalada, no responder de memoria: Expo cambia en cada SDK.

- **Expo:** la versión está en `package.json`; su documentación, en `https://docs.expo.dev/versions/v58.0.0/`, y el índice en `https://docs.expo.dev/llms.txt`.
- **Paquetes de Expo:** se instalan con `pnpm expo install <paquete>`, para que la versión coincida con el SDK. `npx expo-doctor` revisa y `pnpm expo install --fix` corrige.
- **Carpetas `android/` e `ios/`:** se generan; no se crean ni se editan a mano. Lo nativo se configura en `app.config.ts`.
- **Expo Go** solo trae sus propios módulos nativos. Una librería con código nativo nuevo pide una compilación de desarrollo.
- **Versiones fijadas a propósito:** ESLint 9 (Expo 58 no admite la 10), TypeScript 6.0, NativeWind 4 con Tailwind 3.4 (nunca Tailwind 4) y pnpm con `node-linker=hoisted`.
- **Pruebas:** primero la prueba. Con Testing Library 14, `render` es asíncrono: se usa `await renderWithProviders(...)`, de `@/test/render`. Las pruebas de las pantallas viven en `src/test/routes/`, porque todo archivo dentro de `src/app` es una ruta.
- **Estilos:** clases de NativeWind con los colores del tema, que son los únicos que existen: `bg-red-500` o `text-white` no generan nada. Una imagen toma su tamaño de un `View` que la envuelve, no de sus clases.
