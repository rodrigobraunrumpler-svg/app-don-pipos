# Fase 2: el acceso — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que el dueño entre con su número y su PIN, revisado en el servidor con los intentos contados, y después con su huella o su PIN, con bloqueo automático, la sesión cifrada, las pestañas vacías y Más → Cuenta. Todo se prueba en Expo Go.

**Arquitectura:** el PIN y los intentos viven en el esquema `private`. Dos Edge Functions los usan con una conexión directa a la base: `sign-in-with-pin` abre la sesión de Supabase con una contraseña interna (un HMAC del id del dueño) y `change-pin` cambia el PIN. En el celular, la sesión se guarda cifrada (`LargeSecureStore`) y un PIN local con sal permite entrar sin internet. Expo Router protege las pantallas según haya sesión y según esté bloqueada.

**Stack:** Supabase Auth y Edge Functions (Deno, subidas con `--use-api`), pgcrypto (bcrypt), `npm:postgres@3`, `@supabase/supabase-js` 2, expo-secure-store, expo-local-authentication, expo-crypto, aes-js, Expo Router (`Stack.Protected`).

**Especificación:** `docs/spec/auth.md`, `docs/spec/businesses.md` §6 (el layout raíz), `docs/PROJECT_CONTEXT.md` (D18, §12 y §14) y la maqueta (`docs/design/pantallas/`: Ingresar, Entrar y Más → Cuenta).

**Decidido con el dueño del proyecto (2026-11-19):** sin cuenta de Expo por ahora. La fase se prueba en Expo Go; la primera APK y Sentry pasan a la fase de entrega. Hasta entonces solo se usan librerías que Expo Go ya trae, o JavaScript puro.

**El WhatsApp del equipo** para «Olvidé mi PIN» y «Pedir un PIN nuevo al equipo» lo dio el dueño del proyecto el 2026-11-19. Está en `.env.local` como `EXPO_PUBLIC_SUPPORT_WHATSAPP` (solo números, con el código del país). La app arma el enlace `https://wa.me/<número>`; si la variable falta, esos botones no se muestran.

## Lo que ya se comprobó (2026-11-19)

Con una función de prueba en el proyecto de desarrollo, que después se borró:

- **Las funciones se suben sin Docker:** `supabase functions deploy <nombre> --use-api`.
- **Lo que tiene a mano una función:** `SUPABASE_URL`, `SUPABASE_DB_URL` (conexión directa como `postgres`, que ve el esquema `private`), `SUPABASE_PUBLISHABLE_KEYS` y `SUPABASE_SECRET_KEYS` (JSON con la llave `default`), `SUPABASE_JWKS`. Un secreto propio (`supabase secrets set --env-file`) se ve sin volver a subir la función. Los nombres propios no pueden empezar con `SUPABASE_`.
- **Con `--no-verify-jwt`** la función responde aunque no llegue ninguna llave.
- **Desde la función:** `signInWithPassword` con la llave publicable devuelve la sesión (access token de 3600 s); con otra contraseña, «Invalid login credentials».
- **La API de administración** crea y borra usuarios con solo `apikey: sb_secret_…`, y acepta correos `@….invalid`.
- **El registro público está abierto hoy.** Con un `config.toml` que solo declara `[auth] enable_signup = false`, `supabase config diff` muestra ese único cambio; lo demás no se toca.
- **Tiempo:** cada llamada a la función tarda alrededor de 1 s desde aquí (el proyecto está en Oregon); la primera, 1.7 s.
- **Node 24** corre pruebas `.ts` que importan archivos `.ts`, sin compilar.
- **Expo 58:** expo-secure-store ~58.0.3, expo-local-authentication ~58.0.3 y expo-crypto ~58.0.8 vienen en Expo Go (la huella de Android sí; Face ID no). Expo ya trae `URL` y `URLSearchParams`. Expo Router tiene `Stack.Protected` con `guard`. supabase-js 2.119, aes-js 3.1.

## Restricciones globales

- **Siguen todas las de la fase 1:** un solo proyecto (el de desarrollo), la CLI por `pnpm sb`, primero la prueba, una migración enviada no se edita, `private.fail` para los errores de la base.
- **El dueño del proyecto autorizó (2026-11-19)** subir funciones, guardar sus secretos y cerrar el registro público en el proyecto de desarrollo.
- **Solo librerías que Expo Go ya trae,** o JavaScript puro.
- **Secretos:** `AUTH_PASSWORD_SECRET` vive solo en `.env.local` y en los secretos de las funciones. El hash del PIN nunca sale de la base. Ninguna respuesta lleva el id interno ni el correo del dueño, salvo la sesión que abre Supabase.
- **Textos:** los de la maqueta, en español. Teléfonos de prueba: `+51 900 000 1xx` (falsos).
- **Nada nuevo que ejecute `authenticated` en la base:** la app habla con las funciones del servidor, no con funciones nuevas de la base. La lista de la prueba de estructura no cambia.
- **Commits:** como siempre, en inglés, hasta 100 caracteres y sin cuerpo. Un commit por tarea.

## Fuera de esta fase

- La APK y Sentry: fase de entrega (decidido el 2026-11-19).
- El proyecto de producción y los scripts del equipo contra producción: fase 8.
- Lo que va dentro de Inicio, Pedidos, Stock y el botón +: sus fases.

## Foco de revisión

1. **Un número que no existe** responde igual que un PIN incorrecto, con la misma secuencia de intentos y el mismo tiempo (bcrypt contra un hash de relleno). → Tarea 2.
2. **Dos intentos a la vez para el mismo número:** el contador no se salta ninguno. → Tarea 2, prueba con dos conexiones.
3. **Sin señal al ingresar o al cambiar el PIN:** el error de red de supabase-js se convierte en `offline` («Sin conexión»), nunca en «Algo salió mal». Es el pendiente I13 de la revisión de la fase 0. → Tarea 6.
4. **Una sesión que vence o se cierra desde el servidor** mientras la app está en segundo plano: la app vuelve a Ingresar, sin pantallas rotas. → Tarea 6.
5. **El PIN local:** 5 errores cierran la sesión del celular, y cerrar y abrir la app no reinicia el contador. Sin huella registrada, o sin sensor, se entra con el PIN. → Tarea 6.

---

### Task 1: Las cuentas del acceso

**Archivos:**
- Crear: `src/features/auth/` con `pnpm new:feature auth`; `src/features/auth/rules/pin.ts`, `rules/lock.ts`, `rules/attempts.ts` y sus pruebas al lado.

**Interfaces:**
- `pinIsObvious(pin: string, phone: string): boolean`. Es fácil si: los 6 números van seguidos hacia arriba o hacia abajo (sin dar la vuelta); es una pareja repetida 3 veces; es un trío repetido 2 veces; o es igual a los últimos 6 números de `phone`.
- `shouldAskUnlock(backgroundAt: Date | null, now: Date, minutes: AutoLockMinutes): boolean`, con `type AutoLockMinutes = 0 | 1 | 5 | 15`. Sin `backgroundAt`, `false`.
- `attemptsLabel(left: number): string`.
- Esos tres nombres y `AutoLockMinutes` salen por `src/features/auth/index.ts`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`rules/pin.test.ts`:

```ts
import { pinIsObvious } from "./pin";

const PHONE = "+51900000101";

test.each(["123456", "654321", "012345", "987654", "111111", "121212", "123123", "000000", "000101"])("%s es fácil", (pin) => {
  expect(pinIsObvious(pin, PHONE)).toBe(true);
});

test.each(["197346", "582039", "901234", "120121"])("%s no es fácil", (pin) => {
  expect(pinIsObvious(pin, PHONE)).toBe(false);
});
```

Los ejemplos son los mismos de la prueba de la base de la tarea 2: las dos reglas tienen que coincidir. `901234` no es fácil porque los números seguidos no dan la vuelta del 9 al 0.

`rules/lock.test.ts`:

```ts
import { shouldAskUnlock } from "./lock";

const at = (minutes: number) => new Date(Date.UTC(2026, 10, 19, 16, minutes));

test("con 0 minutos pide siempre", () => expect(shouldAskUnlock(at(0), at(0), 0)).toBe(true));
test("con 5 minutos, a los 4 no pide", () => expect(shouldAskUnlock(at(0), at(4), 5)).toBe(false));
test("con 5 minutos, a los 5 pide", () => expect(shouldAskUnlock(at(0), at(5), 5)).toBe(true));
test("si nunca pasó a segundo plano, no pide", () => expect(shouldAskUnlock(null, at(30), 1)).toBe(false));
```

`rules/attempts.test.ts`:

```ts
import { attemptsLabel } from "./attempts";

test("4 intentos", () => expect(attemptsLabel(4)).toBe("Te quedan 4 intentos"));
test("1 intento", () => expect(attemptsLabel(1)).toBe("Te queda 1 intento"));
```

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/features/auth`
Esperado: FALLAN con «Cannot find module './pin'» (y los otros dos).

- [ ] **Paso 3: Escribir las tres funciones y exportarlas por `index.ts`**

- [ ] **Paso 4: Ver que pasan, con 100 % de cobertura**

Corre: `pnpm test:coverage && pnpm lint && pnpm typecheck`
Esperado: todo pasa; `src/features/auth/rules` al 100 %.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add the access rules for obvious PINs, auto-lock and attempts"
```

---

### Task 2: El PIN y los intentos en la base

**Archivos:**
- Crear: `supabase/migrations/<fecha>_auth_pin.sql`
- Prueba: `supabase/tests/060_pin.test.sql`, `supabase/tests/060_pin.concurrent.mjs`
- Modificar: `docs/spec/auth.md` §2 (los intentos pasan a su propia tabla, por número)

**Interfaces:**
- **Un cambio respecto de la especificación:** los intentos se cuentan por número de teléfono en su propia tabla, y no en la fila del PIN. Así un número que no existe se comporta igual que uno que existe, por construcción. Se actualiza `auth.md` §2 antes de escribir la migración.
- `private.pin_credentials`: `user_id uuid` (llave) → `auth.users (id) on delete cascade`, `phone public.phone_pe not null unique`, `pin_hash text not null`, `pin_changed_at timestamptz not null default now()`, `created_at`, `updated_at` (con el trigger común). Reglas de acceso activadas y sin políticas.
- `private.sign_in_attempts`: `phone public.phone_pe` (llave), `failed_attempts integer not null default 0` (≥ 0), `locked_until timestamptz`, `hard_locked_at timestamptz`, `updated_at timestamptz not null default now()`. Reglas de acceso activadas y sin políticas.
- `private.pin_is_obvious(p_pin text, p_phone text) returns boolean`: las mismas reglas de `pinIsObvious` (tarea 1).
- `private.set_pin(p_user_id uuid, p_phone text, p_pin text) returns void`: para los scripts del equipo. Seis números y que no sea fácil (si no, `invalid`). Guarda `extensions.crypt(p_pin, extensions.gen_salt('bf', 10))`, pone `pin_changed_at` y borra la fila de intentos de ese número (desbloquea).
- `private.check_pin(p_phone text, p_pin text) returns jsonb`. En una sola operación, con la fila de intentos del número bloqueada (`insert … on conflict do nothing` y después `select … for update`):
  1. `hard_locked_at` puesto → `{"status": "hard_locked"}`, sin mirar el PIN.
  2. `locked_until` en el futuro → `{"status": "locked", "retryAt": "<locked_until>"}`, sin mirar el PIN.
  3. Compara con bcrypt. Si el número no tiene PIN, compara igual contra un hash de relleno (una constante bcrypt de costo 10, escrita en la migración), para que tarde lo mismo.
  4. Acierto → pone en cero los errores y borra `locked_until`; responde `{"status": "ok", "userId": "<id>", "email": "<correo de auth.users>"}`.
  5. Error → suma uno. Con 10 → pone `hard_locked_at` y responde `hard_locked`. Con 5 → `locked_until = now() + 15 minutos` y responde `locked`. Si no, `{"status": "wrong_pin", "attemptsLeft": n}`, con `n = 5 − errores` antes de la espera y `10 − errores` después.
- `private.change_pin(p_user_id uuid, p_current text, p_next text) returns jsonb`: busca el número del dueño (si no tiene PIN, `not_found`), revisa `p_current` con la misma lógica (cuenta como intento) y, si no acierta, devuelve esa respuesta. Si acierta: el nuevo igual al actual → `{"status": "same_pin"}`; fácil o sin seis números → `{"status": "obvious_pin"}`; si no, lo guarda y responde `{"status": "ok"}`.
- La lógica común de los intentos es una sola función interna; `check_pin` y `change_pin` la llaman.
- `private.purge_sign_in_attempts() returns integer`: borra las filas sin cambios hace más de 30 días, salvo las bloqueadas de un número que sí tiene PIN. pg_cron `purge-sign-in-attempts`, cada día a las `20 8 * * *` (03:20 de Lima). Son números que alguien escribió: no se guardan para siempre (Ley 29733).
- Nadie fuera del servidor ejecuta estas funciones ni lee estas tablas. La prueba de estructura (900) no cambia.

- [ ] **Paso 1: Poner la especificación al día** (`auth.md` §2: la tabla `private.sign_in_attempts`, y las respuestas `same_pin` y `obvious_pin` de `change-pin` en §3)

- [ ] **Paso 2: Escribir las pruebas que fallan**

`supabase/tests/060_pin.test.sql` usa al dueño `…000a` con el número `+51900000101` y el PIN `197346`, y el número `+51900000199`, que no tiene PIN. Comprueba, en este orden:

1. `set_pin` rechaza con `invalid`: `123456` (fácil), `12345` (cinco números) y `abcdef`.
2. Con `197346`: `status` es `ok`, `userId` es `…000a` y `email` es `…000a@prueba.invalid`.
3. Cuatro errores responden, exactamente, `{"status": "wrong_pin", "attemptsLeft": 4}`, luego 3, 2 y 1.
4. El quinto responde `locked`, con `retryAt` entre 14 y 16 minutos después de `now()`.
5. Durante la espera, hasta el PIN correcto responde `locked`.
6. Con la espera vencida (`update … set locked_until = now() - interval '1 second'`), cuatro errores más responden 4, 3, 2 y 1, y el décimo, `hard_locked`.
7. Con la cuenta bloqueada, el PIN correcto responde `hard_locked`.
8. `set_pin` otra vez desbloquea: el PIN correcto vuelve a entrar.
9. Un acierto reinicia el contador: un error, un acierto, un error → `attemptsLeft` 4.
10. El número sin PIN da, para cinco intentos, exactamente las mismas respuestas que el número con PIN (`wrong_pin` 4, 3, 2, 1 y `locked`).
11. Ninguna respuesta contiene el texto del hash (`$2`).
12. `pin_is_obvious` da `true` para `123456`, `654321`, `012345`, `987654`, `111111`, `121212`, `123123`, `000000` y `000101`, y `false` para `197346`, `582039`, `901234` y `120121`.
13. `change_pin`: con el PIN actual equivocado responde `wrong_pin` con 4; con el nuevo igual al actual, `same_pin`; con `123456`, `obvious_pin`; con `582039`, `ok`, y después `197346` ya no entra y `582039` sí.
14. `purge_sign_in_attempts` borra una fila de hace 31 días de un número sin PIN, y deja la de hace 31 días bloqueada de un número con PIN.
15. Con la sesión de `authenticated`: leer `private.pin_credentials` y `private.sign_in_attempts`, y ejecutar `check_pin`, `change_pin` y `set_pin`, dan `42501`.

`supabase/tests/060_pin.concurrent.mjs`: igual que la de la idempotencia, con el número `+51900000188`. La primera sesión llama a `check_pin` con un PIN equivocado; la segunda, con `lock_timeout = '400ms'`, no termina (`55P03`). Las dos deshacen.

- [ ] **Paso 3: Correrlas y ver que fallan**

Corre: `pnpm test:db 060`
Esperado: FALLA con «function private.set_pin(…) does not exist».

- [ ] **Paso 4: Escribir la migración** (`pnpm sb migration new auth_pin`)

El hash de relleno se genera una vez con `select extensions.crypt('000000', extensions.gen_salt('bf', 10))` y se escribe como constante.

- [ ] **Paso 5: Ver que pasan, enviar y revisar**

```bash
pnpm test:db 060 && pnpm db:push && pnpm test:db && pnpm db:lint && pnpm db:advisors
```

Esperado: todas pasan, incluida la de dos conexiones; el lint y los consejos no reportan nada.

- [ ] **Paso 6: Commit**

```bash
git add -A
git commit -m "feat: store PINs with bcrypt and count sign-in attempts per phone number"
```

---

### Task 3: Las funciones del servidor

**Archivos:**
- Crear: `supabase/functions/_shared/phone.ts`, `_shared/owner-password.ts`, `_shared/db.ts`, `_shared/respond.ts`, sus pruebas `_shared/*.test.ts`; `supabase/functions/tsconfig.json`; `supabase/functions/sign-in-with-pin/index.ts`, `supabase/functions/change-pin/index.ts`; `scripts/functions-deploy.mjs`; `scripts/lib/owners.mjs`
- Modificar: `package.json` (scripts `functions:deploy` y `test:auth`; `test:scripts` también corre `supabase/functions/**/*.test.ts`; `typecheck` también corre `tsc -p supabase/functions`), `eslint.config.mjs` (ignora `supabase/functions/**`), `tsconfig.json` (excluye `supabase/functions`), `.env.example` (`AUTH_PASSWORD_SECRET=`)
- Prueba: `supabase/tests/auth.e2e.test.mjs` (con `node --test`), script `test:auth`

**Interfaces:**
- **Lo compartido** usa solo APIs web (`crypto.subtle`), importa con la extensión `.ts` y lo prueban `node --test` en Node y Deno en el servidor:
  - `normalizePhone(input: string): string | null`: quita espacios, guiones y un `+51` o `51` inicial; con 9 números exactos devuelve `+51XXXXXXXXX`, si no `null`.
  - `ownerPassword(userId: string, secret: string): Promise<string>`: HMAC-SHA256 del id con el secreto, en base64url. La usan la función y los scripts del equipo (tarea 4).
  - `supabase/functions/tsconfig.json` revisa los tipos de `_shared/` (`allowImportingTsExtensions`, `noEmit`, estricto). Los `index.ts` de cada función quedan fuera: usan `Deno` y `npm:`, y los cubre la prueba contra las funciones subidas.
- **`sign-in-with-pin`** (POST `{ phone, pin }`, sin sesión):
  - con el número o el PIN mal formados → 400 `{"status": "invalid"}`;
  - llama a `private.check_pin` por `SUPABASE_DB_URL` (`npm:postgres@3`, un cliente por instancia);
  - si `ok`: `signInWithPassword` con el correo que devolvió la base, `ownerPassword(userId, AUTH_PASSWORD_SECRET)` y la llave publicable de `SUPABASE_PUBLISHABLE_KEYS`; responde 200 `{"status": "ok", "session": {"accessToken", "refreshToken", "expiresAt"}}`;
  - si no, 200 con la respuesta de la base tal cual (`wrong_pin`, `locked`, `hard_locked`);
  - otro método → 405; cualquier falla → 500 `{"status": "error"}`, sin detalles.
- **`change-pin`** (POST `{ current, next }`, con `Authorization: Bearer <access token>`):
  - comprueba la sesión con `auth.getUser(token)`; sin sesión válida → 401 `{"status": "unauthorized"}`;
  - con el PIN mal formado → 400 `invalid`;
  - si no, 200 con la respuesta de `private.change_pin`.
- Las dos se suben con `--no-verify-jwt`: la primera se llama sin sesión, y la segunda revisa la sesión por su cuenta.
- **`pnpm functions:deploy`:**
  1. Si `.env.local` no tiene `AUTH_PASSWORD_SECRET`, genera 48 bytes al azar y los agrega, sin mostrarlos.
  2. Lo guarda en los secretos de las funciones con un archivo temporal que solo tiene esa línea y que se borra al terminar.
  3. Sube las dos funciones con `--use-api --no-verify-jwt --yes`.
  - Cambiar `AUTH_PASSWORD_SECRET` deja a los dueños sin poder entrar hasta un `owner reset-pin`. Se anota en `CLAUDE.md`.
- **`scripts/lib/owners.mjs`:** `createOwner({ phone, business, modules, pin }): Promise<{ userId, businessId }>` crea la cuenta con la API de administración (correo `dueno-<8 hex>@cuentas.invalid`, confirmado, y la contraseña `ownerPassword`), guarda el PIN con `private.set_pin` y crea el negocio; si algo falla, borra lo que creó. `deleteOwner(userId)` borra el negocio con sus filas, los intentos de su número y la cuenta. Lo usan la prueba y los scripts del equipo (tarea 4).
- **`pnpm test:auth`** corre `supabase/tests/auth.e2e.test.mjs` contra las funciones subidas. Crea un dueño temporal con `createOwner` y lo borra al terminar con `deleteOwner`, pase lo que pase.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`supabase/functions/_shared/phone.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import { normalizePhone } from "./phone.ts";

test("acepta el número con o sin +51, con espacios o guiones", () => {
  for (const input of ["900000101", "900 000 101", "+51 900 000 101", "51900000101", "900-000-101"]) {
    assert.equal(normalizePhone(input), "+51900000101", input);
  }
});

test("rechaza lo que no son 9 números", () => {
  for (const input of ["90000010", "9000001011", "+52 900 000 101", "abc", ""]) assert.equal(normalizePhone(input), null, input);
});
```

`supabase/functions/_shared/owner-password.test.ts`: el mismo id y el mismo secreto dan la misma contraseña; otro id u otro secreto, otra; tiene 43 caracteres y solo `[A-Za-z0-9_-]`.

`supabase/tests/auth.e2e.test.mjs` (con `node:test`), con un dueño temporal de número `+51900000150` y PIN `197346`:
1. `sign-in-with-pin` con el PIN correcto responde `ok` con `accessToken` y `refreshToken`, y con esa sesión `get_business()` devuelve el negocio temporal.
2. Un PIN equivocado responde `{"status": "wrong_pin", "attemptsLeft": 4}`; un número sin cuenta, lo mismo.
3. `{ "phone": "123", "pin": "197346" }` responde 400 `invalid`, y un GET, 405.
4. Ninguna respuesta contiene `userId`, `email` ni `$2`.
5. `change-pin` sin sesión responde 401; con sesión y el PIN actual equivocado, `wrong_pin`; con un PIN fácil, `obvious_pin`; con uno bueno, `ok`, y después entra con el nuevo.

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test:scripts && pnpm test:auth`
Esperado: FALLAN: no existen `phone.ts`, `owner-password.ts` ni las funciones subidas (404).

- [ ] **Paso 3: Escribir lo compartido, las dos funciones y el script de subida**

- [ ] **Paso 4: Subir y ver que pasan**

```bash
pnpm test:scripts && pnpm functions:deploy && pnpm test:auth
```

Esperado: pasan las pruebas de lo compartido y las de `test:auth`, y `pnpm typecheck` revisa `_shared/`. `pnpm sb functions list` muestra las dos funciones.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add the sign-in-with-pin and change-pin edge functions"
```

---

### Task 4: Los scripts del equipo, el registro cerrado y el dueño DEMO

**Archivos:**
- Crear: `scripts/owner.mjs`, `scripts/lib/owner-args.mjs`, `scripts/lib/owner-args.test.mjs`
- Modificar: `supabase/config.toml` (solo lo que se maneja desde el repositorio), `package.json` (scripts `owner` y `auth:config`), `.env.example`, `CLAUDE.md`

**Interfaces:**
- `pnpm owner create --phone <9 números> --business "<nombre>" [--modules a,b,c] [--demo]`:
  1. genera un PIN al azar de 6 números y le pregunta a la base si es fácil (`private.pin_is_obvious`) hasta que no lo sea;
  2. crea al dueño y su negocio con `createOwner` (tarea 3);
  3. imprime el número y el PIN para entregarlos en persona. Con `--demo` no imprime el PIN: lo escribe en `.env.local` como `DEMO_OWNER_PHONE` y `DEMO_OWNER_PIN`.
- `pnpm owner reset-pin --phone <…> [--demo]`: PIN nuevo, desbloqueo y la contraseña interna calculada otra vez.
- `pnpm owner sign-out-everywhere --phone <…>`: borra sus sesiones (`auth.sessions`). Lo que ya tenga abierto dura hasta que venza su token (1 hora).
- `scripts/lib/owner-args.mjs`: `parseOwnerArgs(argv: string[]): { command, phone, business?, modules, demo }`. Lanza con un mensaje en español si falta algo o el número no vale (usa `normalizePhone`).
- Todo con la API de administración (`SUPABASE_SECRET_KEY`) y la conexión directa de la fase 1, que solo acepta el proyecto de desarrollo.
- `supabase/config.toml` queda con `project_id` y lo que el repositorio maneja: `[auth] enable_signup = false`. `pnpm auth:config` es `sb config push --yes`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`scripts/lib/owner-args.test.mjs`: `create` con `--phone "900 000 101" --business "Don Pipos (DEMO)" --demo` da `{ command: "create", phone: "+51900000101", business: "Don Pipos (DEMO)", modules: [], demo: true }`; sin `--business` lanza «falta --business»; un número de 8 cifras lanza «el número no vale»; un comando desconocido lanza «comandos: create, reset-pin, sign-out-everywhere».

En `supabase/tests/auth.e2e.test.mjs`, una prueba más: el registro público está cerrado. `POST /auth/v1/signup` con la llave publicable y un correo `@prueba.invalid` responde el código `signup_disabled` (hoy responde `email_address_invalid`: la base revisa primero si el registro está cerrado).

- [ ] **Paso 2: Correrlas y ver que fallan, junto con la del registro cerrado**

Corre: `pnpm test:scripts && pnpm test:auth`
Esperado: FALLAN las del script (no existe) y la del registro cerrado (responde `email_address_invalid`).

- [ ] **Paso 3: Escribir los scripts y dejar `config.toml` con lo que se maneja**

Antes de enviar: `pnpm sb config diff` tiene que mostrar un solo cambio, `auth.enable_signup`.

- [ ] **Paso 4: Cerrar el registro, crear el dueño DEMO y ver que todo pasa**

```bash
pnpm auth:config
pnpm owner create --phone 900000101 --business "Don Pipos (DEMO)" --modules orders,stock,products,expenses,income,cash,reports,customers,loyalty,messages,reminders --demo
pnpm test:scripts && pnpm test:auth && pnpm db:check
```

Esperado: todo pasa, y `.env.local` tiene `DEMO_OWNER_PHONE` y `DEMO_OWNER_PIN`.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add the team scripts for owners, close public sign-ups and create the DEMO owner"
```

---

### Task 5: Las variables de entorno y el cliente de Supabase

**Archivos:**
- Crear: `src/lib/env.ts`, `src/lib/secure-session-storage.ts`, `src/lib/supabase.ts` y sus pruebas
- Modificar: `package.json` (con `pnpm expo install @supabase/supabase-js expo-secure-store expo-crypto expo-local-authentication` y `pnpm add aes-js`, `pnpm add -D @types/aes-js`), `jest.setup.js` (SecureStore, Crypto y LocalAuthentication simulados en memoria), `.env.example` (`EXPO_PUBLIC_SUPPORT_WHATSAPP=`)

**Interfaces:**
- `parseEnv(source: Record<string, string | undefined>): { ok: true; env: AppEnv } | { ok: false; problems: string[] }`, con Zod:
  - `EXPO_PUBLIC_SUPABASE_URL`: una URL `https`;
  - `EXPO_PUBLIC_SUPABASE_KEY`: empieza con `sb_publishable_`. Si empieza con `sb_secret_`, el problema dice «Esa es la llave secreta: aquí va la publicable»;
  - `EXPO_PUBLIC_SUPPORT_WHATSAPP`: opcional, solo números con el código del país.
- `appEnv`: `parseEnv` aplicado a las variables, escritas una por una (`process.env.EXPO_PUBLIC_SUPABASE_URL`…), porque Expo solo reemplaza las que encuentra escritas así.
- `createSecureSessionStorage(): { getItem, setItem, removeItem }`: el `LargeSecureStore` de la guía de Supabase para Expo, con la llave al azar de `expo-crypto` (`getRandomBytes(32)`) en vez de `react-native-get-random-values`.
- `src/lib/supabase.ts`: `supabase`, creado con `createClient<Database>` con esa memoria, `autoRefreshToken`, `persistSession` y `detectSessionInUrl: false`. Al volver a primer plano llama a `startAutoRefresh()`, y al irse, a `stopAutoRefresh()`. Solo lo importa la carpeta `api/` de un módulo.

- [ ] **Paso 1: Escribir las pruebas que fallan**

- `env.test.ts`: con las dos variables bien, `ok`; sin la URL, con `http://`, con la llave secreta y con una llave cualquiera, `ok: false` con el problema en español; `EXPO_PUBLIC_SUPPORT_WHATSAPP` vacía queda como `undefined`.
- `secure-session-storage.test.ts`: lo que se guarda en AsyncStorage no es el texto original; `getItem` lo devuelve igual; sin la llave en SecureStore devuelve `null`; `removeItem` borra en los dos lados; dos `setItem` del mismo valor guardan textos distintos (llave nueva cada vez).

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/lib`
Esperado: FALLAN con «Cannot find module './env'» y «./secure-session-storage».

- [ ] **Paso 3: Instalar, escribir los tres archivos y ver que pasan**

Corre: `pnpm test:coverage && pnpm lint && pnpm typecheck`
Esperado: todo pasa.

- [ ] **Paso 4: Commit**

```bash
git add -A
git commit -m "feat: add env validation, the encrypted session storage and the Supabase client"
```

---

### Task 6: La sesión, el PIN local, la huella y el bloqueo

**Archivos:**
- Crear, en `src/features/auth/`: `schema/sign-in.ts`, `api/session.ts`, `api/pin.ts`, `queries/session.ts`, `queries/mutations.ts`, `hooks/unlock-context.ts`, `hooks/use-session.ts`, `hooks/use-unlock.ts`, `hooks/use-auto-lock.ts`, `components/unlock-provider.tsx`; en `src/lib/`: `device-store.ts` (SecureStore y AsyncStorage con JSON), `local-pin.ts` (hash con sal) y `biometrics.ts`; sus pruebas
- Modificar: `src/lib/errors.ts` (los errores de red de supabase-js son `offline`)

**Interfaces:**
- `api/session.ts`: `getSession(): Promise<Session | null>`, `onSessionChange(listener): () => void`, `signOutHere(): Promise<void>` (`scope: 'local'`).
- `api/pin.ts`: `signInWithPin(phone, pin): Promise<SignInResult>` llama a `sign-in-with-pin` y, si responde `ok`, `supabase.auth.setSession`. `changePin(current, next): Promise<ChangePinResult>`. Las respuestas se validan con Zod (`schema/sign-in.ts`); una respuesta con otra forma es `unexpected`.
- `SignInResult`: `{ status: "ok" } | { status: "wrong_pin"; attemptsLeft: number } | { status: "locked"; retryAt: Date } | { status: "hard_locked" }`. `ChangePinResult` suma `same_pin` y `obvious_pin`.
- `queries/session.ts`: `sessionQuery` (`staleTime: Infinity` y `meta: { persist: false }`: la sesión nunca va a la caché guardada) y `followSessionChanges(queryClient): () => void`, que pone cada cambio en la caché.
- `src/lib/local-pin.ts`: `hashPin(pin, salt?): Promise<{ hash, salt }>` y `pinMatches(pin, stored): Promise<boolean>` (SHA-256 con una sal de 16 bytes al azar, de expo-crypto).
- `src/lib/biometrics.ts`: `biometricsAvailable(): Promise<boolean>` (sensor y huella registrada) y `confirmWithBiometrics(prompt): Promise<boolean>` (`disableDeviceFallback: true`).
- `useUnlock()`: `{ locked, lockedOut, phone, biometricsEnabled, autoLockMinutes, unlockWithPin, unlockWithBiometrics, rememberSignIn, setBiometricsEnabled, setAutoLockMinutes, lock }`.
  - `rememberSignIn(phone, pin)`: guarda en SecureStore el hash del PIN, el número y los errores en cero, y desbloquea.
  - `unlockWithPin(pin)`: si coincide, desbloquea y pone los errores en cero. Si no, suma uno en SecureStore; con 5, cierra la sesión del celular, borra lo guardado y pone `lockedOut`.
  - Un hook no importa `api/`: cerrar la sesión pasa por la mutación `signOutHere` de `queries/mutations.ts`.
  - Al abrir la app con sesión, empieza bloqueada.
  - `autoLockMinutes` (5 por defecto) y `biometricsEnabled` van en AsyncStorage: no son secretos.
- `useAutoLock()`: guarda la hora al pasar a segundo plano y, al volver, bloquea si `shouldAskUnlock` lo pide.
- `toAppError` reconoce por su nombre `FunctionsFetchError`, `AuthRetryableFetchError` y el `TypeError` de red como `offline`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

Con `api/` simulado (`jest.mock`), SecureStore en memoria y un reloj fijo:
- `use-unlock.test.tsx`: después de `rememberSignIn("+51900000101", "197346")`, `unlockWithPin("197346")` desbloquea; cinco PIN equivocados llaman a `signOutHere`, borran lo guardado y ponen `lockedOut`; con 3 errores, montar el hook de nuevo (como al reabrir la app) mantiene la cuenta en 3; sin huella registrada, `unlockWithBiometrics` devuelve `false` y sigue bloqueada.
- `use-auto-lock.test.tsx`: con 5 minutos, volver a los 4 no bloquea y a los 5 sí; con 0, bloquea siempre.
- `queries/session.test.ts`: un evento `SIGNED_OUT` deja la sesión en `null` en la caché.
- `api/pin.test.ts`: `ok` llama a `setSession` con los dos tokens; `wrong_pin` no la llama; una respuesta sin `status` es `unexpected`; un `FunctionsFetchError` es `offline`.
- `local-pin.test.ts`: el mismo PIN coincide y otro no; dos hashes del mismo PIN tienen sales distintas.
- `errors.test.ts`: los tres errores de red de supabase-js dan `offline`.

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/features/auth src/lib`
Esperado: FALLAN porque los archivos no existen.

- [ ] **Paso 3: Escribir el código y ver que pasan**

Corre: `pnpm test:coverage && pnpm lint && pnpm typecheck`
Esperado: todo pasa.

- [ ] **Paso 4: Commit**

```bash
git add -A
git commit -m "feat: add the session, the local PIN, biometrics and the auto-lock"
```

---

### Task 7: Las piezas de la pantalla

**Archivos:**
- Crear: `src/components/ui/pin-dots.tsx`, `pin-keypad.tsx`, `button.tsx`, `notice.tsx` y sus pruebas; en `src/features/auth/components/`: `sign-in-form.tsx`, `unlock-pin.tsx`, `unlock-biometrics.tsx`, `offer-biometrics.tsx`, `locked-out.tsx`, `wait-notice.tsx`, `account-section.tsx`, `change-pin-flow.tsx` y sus pruebas

**Interfaces:**
- `PinDots({ filled, error })`: seis puntos; para el lector de pantalla, «N de 6 números».
- `PinKeypad({ onDigit, onDelete, left?, disabled? })`: del 1 al 9, `left` (la tecla de la huella o nada), 0 y borrar («Borrar»). Apagado, no responde.
- Los textos son los de la maqueta:
  - **Ingresar:** «Ingresa a tu app», «Con tu número y el PIN que te dio el equipo.», «Tu número», «Tu PIN», «Comprobando…», «PIN incorrecto. Te quedan N intentos.», «Sin conexión. Para ingresar la primera vez necesitas internet.» y «Olvidé mi PIN».
  - **La espera:** «Espera 15 minutos», «Hubo 5 intentos con un PIN equivocado. Por seguridad, podrás intentarlo otra vez a las HH:mm.», «Pedir un PIN nuevo al equipo» y «Con 10 intentos fallidos, la cuenta queda bloqueada hasta que el equipo la revise.».
  - **La huella después de ingresar:** «¿Entrar con tu huella?», «Es lo más rápido. Si la huella falla, entras con tu PIN.», «Usar mi huella» y «Ahora no».
  - **Entrar:** «Hola de nuevo», «Toca el sensor para entrar.», «Usar mi PIN», «Escribe tu PIN» y «Para entrar a Don Pipos.».
  - **Cerramos la sesión:** «Cerramos la sesión», «Hubo 5 intentos con un PIN equivocado, así que la app se cerró en este celular. Tus pedidos y datos siguen guardados.», «Ingresar de nuevo» y «Con tu número y tu PIN, como la primera vez.».
  - **Más → Cuenta:** «Cuenta», «Tu número», «Entrar con huella», «Pedir huella o PIN» (hoja: «Cuánto tiempo puede quedar la app en segundo plano antes de pedirlos otra vez.» y «Aunque el celular esté desbloqueado, la app pide tu huella o PIN al volver.»), «Cambiar PIN» y «Cerrar sesión en este celular».
- **Lo que la maqueta no dibuja**, con el mismo estilo:
  - la cuenta bloqueada: «Tu cuenta está bloqueada» y «Hubo 10 intentos con un PIN equivocado. Escribe al equipo para revisarla.»;
  - cambiar el PIN, en tres pasos con el mismo teclado: «Tu PIN actual», «Tu PIN nuevo» y «Repite tu PIN nuevo»; los avisos «Ese PIN es fácil de adivinar. Elige otro.», «Es el mismo PIN que ya tienes.», «Los dos PIN no coinciden.» y, al terminar, «Listo, cambiaste tu PIN».
- Los botones de WhatsApp del equipo solo se muestran si existe `EXPO_PUBLIC_SUPPORT_WHATSAPP`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

- `pin-keypad.test.tsx`: tocar «7» llama a `onDigit("7")`; «Borrar» llama a `onDelete`; apagado no llama a nada.
- `sign-in-form.test.tsx`: al sexto número llama a ingresar una sola vez y muestra «Comprobando…»; con `wrong_pin` y 3, «PIN incorrecto. Te quedan 3 intentos.» y los puntos vacíos; con `locked`, la espera con la hora en Lima; sin señal, el aviso y el teclado apagado; sin `EXPO_PUBLIC_SUPPORT_WHATSAPP`, no hay «Olvidé mi PIN».
- `change-pin-flow.test.tsx`: los dos PIN nuevos distintos muestran «Los dos PIN no coinciden.» sin llamar al servidor; un PIN fácil se avisa sin llamar al servidor (usa `pinIsObvious`); `ok` muestra «Listo, cambiaste tu PIN».
- `account-section.test.tsx`: muestra el número; el interruptor cambia `biometricsEnabled`; «Cerrar sesión en este celular» llama a `signOutHere`.

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/components src/features/auth/components`
Esperado: FALLAN porque los componentes no existen.

- [ ] **Paso 3: Escribir las piezas con las clases del tema y ver que pasan**

Corre: `pnpm test:coverage && pnpm lint && pnpm typecheck`
Esperado: todo pasa.

- [ ] **Paso 4: Commit**

```bash
git add -A
git commit -m "feat: add the PIN keypad and the access screens' pieces"
```

---

### Task 8: Las pantallas y la navegación

**Archivos:**
- Crear: `src/app/(auth)/_layout.tsx`, `(auth)/sign-in.tsx`, `src/app/unlock.tsx`, `src/app/(main)/_layout.tsx` (pestañas), `(main)/index.tsx` (Inicio), `(main)/orders/index.tsx`, `(main)/stock/index.tsx`, `(main)/more/index.tsx`, `(main)/more/change-pin.tsx`
- Modificar: `src/app/_layout.tsx` (sesión, desbloqueo y `Stack.Protected`), `src/app/index.tsx` (se borra: Inicio pasa a `(main)/index.tsx`)
- Prueba: `src/test/routes/navigation.test.tsx`, `src/test/routes/home.test.tsx` (pasa a probar Inicio)

**Interfaces:**
- El layout raíz:
  - mientras no sabe si hay sesión, deja la pantalla de carga;
  - si `appEnv` no es válido, muestra «Falta configurar la app» con los problemas, en vez de fallar;
  - sin sesión → `(auth)`; con sesión y bloqueada → `unlock`; con sesión y desbloqueada → `(main)`. Se hace con `Stack.Protected` y `guard`.
- Las pestañas: Inicio, Pedidos, +, Stock y Más. El + se ve pero está apagado hasta la fase 4. Inicio muestra la fecha de hoy en Lima.
- Más muestra la sección Cuenta; «Cambiar PIN» abre `more/change-pin`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`src/test/routes/navigation.test.tsx`, con el router de pruebas de Expo Router (`renderRouter` de `expo-router/testing-library`) y la sesión simulada:
- sin sesión, se ve «Ingresa a tu app»;
- con sesión y bloqueada, se ve «Escribe tu PIN» (o «Hola de nuevo» con la huella activa);
- desbloqueada, se ven las pestañas y la fecha de hoy en Inicio;
- cuando la sesión pasa a `null` (vence o se cierra desde el servidor), vuelve a «Ingresa a tu app»;
- con `appEnv` inválido, se ve «Falta configurar la app».

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/test/routes`
Esperado: FALLAN porque las rutas no existen.

- [ ] **Paso 3: Escribir las rutas y ver que pasan**

Corre: `pnpm test:coverage && pnpm lint && pnpm typecheck && pnpm exec expo export --platform android --output-dir dist`
Esperado: todo pasa y el paquete de Android compila.

- [ ] **Paso 4: Commit**

```bash
git add -A
git commit -m "feat: add the sign-in, unlock and tab screens with protected navigation"
```

---

### Task 9: En el celular, y el cierre de la fase

**Archivos:**
- Modificar: `docs/plan/README.md`, `docs/PROJECT_CONTEXT.md` (§14: Errores y Entrega; §16), `docs/spec/auth.md` (lo que cambió), `docs/glossary.md`, `CLAUDE.md`

- [ ] **Paso 1: Probar en el celular (lo hace el dueño del proyecto)**

```bash
cd /home/javier/var-mar/app && pnpm start --tunnel
```

Con Expo Go, con el número y el PIN DEMO de `.env.local` (`DEMO_OWNER_PHONE` y `DEMO_OWNER_PIN`):
1. Ingresar con el número y el PIN.
2. Aceptar la huella y entrar con ella.
3. Dejar la app 5 minutos en segundo plano y volver: pide huella o PIN.
4. Escribir mal el PIN local cinco veces: «Cerramos la sesión».
5. Ingresar de nuevo y cambiar el PIN en Más → Cuenta.

- [ ] **Paso 2: Anotar el resultado**

- `docs/plan/README.md`: la fila de la fase 2 sin la APK ni Sentry; el riesgo «Que la APK compile» pasa a la fase de entrega; en «Lo que hace falta de tu parte», la cuenta de Expo pasa a la entrega; la fase 2, «Construida».
- `docs/PROJECT_CONTEXT.md` §14: la fila de Errores (Sentry con la APK) y la de Entrega.
- Al final de este archivo, «Resultado» y «Lo que cambió respecto de este plan».

- [ ] **Paso 3: Commit**

```bash
git add -A
git commit -m "docs: record phase 2 results and move the APK and Sentry to delivery"
```

Con esto, la fase 2 está terminada. Sigue el plan de la fase 3.

---

## Resultado (2026-11-19)

La fase 2 quedó construida en la rama `fase-2`, con un commit por tarea.

| Comprobación | Resultado |
|---|---|
| `pnpm test:coverage` | 236 pruebas; 100 % en `lib/{money,dates,errors}`, `theme/tokens` y `features/auth/rules` |
| `pnpm test:db` | 176 pruebas de la base en 13 archivos, incluidas las dos de dos conexiones |
| `pnpm test:auth` | 6 pruebas contra las funciones subidas, con un dueño temporal que se borra al terminar |
| `pnpm db:check` | Pasa entera |
| `pnpm lint`, `pnpm lint:rules`, `pnpm typecheck`, `pnpm test:scripts` | Pasan |
| Android | El paquete compila (6.7 MB); dentro va la llave publicable y ningún secreto |

En el proyecto de desarrollo quedaron: las funciones `sign-in-with-pin` y `change-pin`, el registro público cerrado y el dueño DEMO «Don Pipos (DEMO)», con el número 900 000 101.

### Lo que falta: probar en el celular

Con Expo Go, desde tu terminal:

```bash
cd /home/javier/var-mar/app && pnpm start --tunnel
```

El PIN de prueba está en tu `.env.local`, en la línea `DEMO_OWNER_PIN`. El número es el 900 000 101.

1. Ingresa con el número y el PIN. Al sexto número se comprueba solo.
2. Acepta la huella y entra con ella.
3. Deja la app más de 5 minutos en segundo plano y vuelve: pide huella o PIN.
4. En Más → Cuenta, cambia «Pedir huella o PIN» a «Al salir», sal de la app y vuelve.
5. Escribe mal el PIN cinco veces: «Cerramos la sesión». Ingresa de nuevo.
6. Cambia el PIN en Más → Cuenta y entra con el nuevo.
7. Mira que Inicio muestre la fecha de hoy en español. Así se comprueban también las fechas de la fase 0 en el celular.
8. Tras más de una hora sin usarla, pon el modo avión y abre la app: pide el PIN, no Ingresar. Sin escribirlo, quita el modo avión y espera unos segundos: sigue pidiendo el PIN. Con el PIN, entras.

Si el PIN de prueba se bloquea, `pnpm owner reset-pin --phone 900000101 --demo` pone uno nuevo en `.env.local`.

### Lo que cambió respecto de este plan

**Antes de empezar**
- Se trabajó en una copia aparte de la rama `fase-2`, mientras se revisaban las fases 0 y 1. Después se juntaron las tres.

**Tarea 2**
- Los intentos se cuentan por número en su propia tabla (`private.sign_in_attempts`), y no en la del PIN. Ya estaba en el plan; se anotó primero en `auth.md`.
- Un número o un PIN mal formados no cuentan como intento: responden `invalid`. `retryAt` va en UTC con milisegundos.

**Tarea 3**
- El cliente de la base vive en cada función; `_shared/` tiene solo código que corre igual en Node y en Deno, y su propio revisor de tipos.
- `@supabase/supabase-js` se instaló en esta tarea y no en la 5: lo necesitan los scripts del equipo.

**Tarea 4**
- La prueba del registro cerrado revisa la configuración del proyecto: un intento real de registro choca primero con el límite de correos de Supabase.
- `pnpm db:advisors` acepta a conciencia un solo aviso (la revisión de contraseñas filtradas: las contraseñas son internas), con su motivo en `scripts/lib/advisors.mjs`.
- Las pruebas de la base ya no cuentan tablas enteras, y usan números 900 000 9xx: los 1xx son de los datos DEMO.

**Tarea 5**
- `supabase` es una función que crea el cliente la primera vez. Los plugins de SecureStore y de la huella se agregaron a mano a `app.config.ts`.

**Tarea 6**
- El candado vive en un hook (`use-unlock-state.ts`) y el proveedor solo lo conecta. La app no pasa por Entrar justo después de ingresar.
- Una sesión sin PIN guardado en el celular pide ingresar de nuevo.
- Los errores de red de supabase-js se leen como «Sin conexión» (el pendiente I13 de la fase 0).

**Tarea 7**
- Los íconos son de `@expo/vector-icons` (vienen en Expo Go), con colores del tema.
- La huella se ofrece en su propia pantalla, recién ingresado.
- Textos que la maqueta no dibuja, con su estilo: el número incompleto, «Volver» en la espera, sin señal al cambiar el PIN, el final del cambio y el mensaje de WhatsApp.

**Tarea 8**
- La entrada `/` (sin protección) lleva a donde corresponde, e Inicio quedó en `/home`.
- El «+» de las pestañas se ve apagado hasta la fase 4.

## Después de la revisión final (2026-11-19)

Una revisión independiente de toda la rama encontró sólido el lado del servidor (el PIN, el conteo de intentos, las funciones, los permisos y los scripts) y un hueco en el candado del celular. Se corrigió todo, cada arreglo con su prueba primero:

- **El candado ya no se abre solo.** Sin señal y con la sesión vencida, Supabase no puede renovarla pero la guarda; la app la tomaba por «sin sesión», y cuando la sesión volvía (al recuperar la señal) abría las pestañas sin pedir el PIN. Ahora hay sesión si está guardada en el celular, la app abre siempre bloqueada y solo la abre el dueño: al ingresar, con su PIN o con su huella. Si la sesión se pierde, vuelve a bloquearse.
- **Sin señal, Entrar con el PIN.** Con la sesión vencida y sin internet, la app pedía Ingresar («Sin conexión»); ahora pide el PIN local y entra.
- **Al ingresar, directo a la huella.** Mientras se guarda el PIN local la app sigue en Ingresar: ya no se ve Inicio un instante antes de «¿Entrar con tu huella?».
- **Con el reloj atrasado** también pide huella o PIN.
- **Cerrar sesión borra todo lo de este celular:** el PIN, el número, los ajustes y la caché guardada (desde la fase 3 tendrá datos de clientes, Ley 29733). Sin señal también termina.
- **Solo huellas fuertes:** la cara por la cámara de muchos Android se engaña con una foto y no cuenta.
- **«Tu cuenta está bloqueada» tiene «Volver»,** por si el número estaba mal escrito.
- **Guardar el dueño DEMO** ya no puede dejar `.env.local` a medias: se escribe en un archivo aparte y después se cambia de nombre.

La sesión ahora se guarda con otro nombre: si ya habías ingresado en tu celular, la app te pide ingresar una vez más.

Queda una decisión tuya: hoy, 10 PIN equivocados bloquean la cuenta hasta que el equipo la revise, y como el número es público, un extraño podría bloquearla a propósito.

Lo menor quedó anotado para después: un despliegue de funciones fallido deja el secreto en un archivo temporal; crear un dueño puede dejar una cuenta huérfana si falla a medias; sin límite de tiempo, «Comprobando…» puede quedarse girando con una conexión colgada; con las huellas borradas del celular, Entrar abre en modo huella y hay que tocar «Usar mi PIN»; un número de más de 9 cifras se corta sin avisar; una caída del servidor de Supabase se lee como «Sin conexión»; el correo interno debería ser más largo; y el costo de cada número nuevo y la limpieza de 30 días quedan para la fase 8.

**Total de pruebas:** 248 de la app (Jest) y 42 de los scripts.
