# Fase 1: los cimientos de la base de datos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** dejar la base de datos lista para que cada módulo traiga después sus tablas: permisos cerrados, el esquema `private`, los tipos comunes, la idempotencia, el registro de cambios y el negocio con sus ajustes. Y las herramientas que lo comprueban: pruebas de la base, medidor de rendimiento y tipos generados.

**Arquitectura:** PostgreSQL 17 en Supabase. Se lee con reglas de acceso (RLS) y se escribe solo por funciones. No hay Docker, así que las migraciones se escriben a mano y las pruebas (pgTAP) corren contra el proyecto de desarrollo, dentro de una transacción que siempre se deshace y que primero aplica las migraciones que todavía no se enviaron. Una migración se envía recién cuando sus pruebas pasan.

**Stack:** Supabase CLI 3.2 (siempre por `pnpm sb`), PostgreSQL 17.12, pgTAP 1.3, pg_cron, node-postgres 8 (`pg`) y `node --test`.

**Especificación:** `docs/spec/README.md`, `docs/spec/businesses.md` (§2 a §4 y §8, sin la puesta en marcha ni la copia de seguridad), `docs/PROJECT_CONTEXT.md` (§10, §12 y §14.3) y `docs/glossary.md`.

## Lo que ya se comprobó (2026-11-19)

Antes de escribir este plan se probó cada pieza contra el proyecto de desarrollo:

- **La CLI 3.2 cambió:** cada comando actúa sobre una base local salvo que lleve `--remote`, que apunta al proyecto enlazado. Todo cambio en la nube pide `--yes`.
- **Funcionan sin Docker:** `migration list --remote`, `db push --remote --dry-run`, `db lint --remote`, `db advisors --remote` y `gen types --remote`.
- **Piden Docker y no se usan:** la base local (`supabase start`), `supabase test db` y los esquemas declarativos (`db schema declarative sync`).
- **Conexión directa:** el pooler en modo sesión (`supabase/.temp/pooler-url`, puerto 5432), con el usuario `postgres.<ref>` y TLS verificado con el certificado «Supabase Root 2021 CA».
- **Dentro de una transacción que se deshizo** funcionaron: crear la extensión pgTAP y correr una prueba, `create schema private`, revocar permisos y permisos por defecto, crear un dominio, insertar un usuario en `auth.users`, `set local role authenticated` con `auth.uid()`, y las extensiones pg_cron y plpgsql_check. Al deshacer no quedó nada.
- **La sesión de la CLI de esta app vive aparte** (`SUPABASE_HOME=~/.supabase-varmar-app`): la sesión guardada en `~/.supabase` es de otra cuenta y no se toca.

## Restricciones globales

- **Un solo proyecto:** todo corre contra el proyecto de desarrollo (`SUPABASE_DEV_PROJECT_REF` en `.env.local`). El dueño del proyecto autorizó el 2026-11-19 crear, cambiar y reiniciar esa base sin preguntar cada vez. Las herramientas se niegan a correr con `--yes`, a probar o a medir en cualquier otro proyecto.
- **La CLI, solo por `pnpm sb`:** carga `.env.local` y usa la sesión propia de esta app. Nunca `supabase` directo.
- **Secretos:** `.env.local` nunca se imprime ni entra al repositorio. `SUPABASE_DB_PASSWORD` nunca lleva `EXPO_PUBLIC_`.
- **Primero la prueba:** el archivo pgTAP falla, se escribe la migración, la prueba pasa dentro de la transacción, se envía con `pnpm db:push` y la prueba vuelve a pasar.
- **Una migración enviada no se edita:** lo que haya que corregir va en una migración nueva. Antes de enviarla se edita libremente.
- **Versión de Postgres:** 17. Los ids salen de `gen_random_uuid()`; `uuidv7()` llega con Postgres 18.
- **SQL:** palabras clave en minúscula y nombres en snake_case. Toda función fija `set search_path = ''` y escribe cada nombre con su esquema. `security definer` solo en las funciones que escriben y en las que usan las reglas de acceso.
- **Parámetros y JSON:** los parámetros de las funciones llevan el prefijo `p_`. El JSON que reciben y devuelven usa los nombres del código, en camelCase (`deliveryFeeCents`), como manda el glosario.
- **Errores:** siempre `private.fail('<código>')`, con `invalid`, `not_found`, `forbidden` o `conflict`.
- **Cada tabla de `public`:** `id` (o `business_id` como llave), `created_at`, `updated_at` con el trigger común, y las reglas de acceso activadas. Toda llave foránea tiene su índice.
- **Las pruebas no dejan nada:** ningún archivo de prueba abre ni cierra transacciones; el corredor lo impide y deshace siempre.
- **Commits:** Conventional Commits en inglés, hasta 100 caracteres, sin cuerpo. Un commit por tarea.

## Fuera de esta fase

- `complete_setup` y la puesta en marcha: fase 7.
- `private.backup_runs`, `record_backup` y `backup_status`: fase 8.
- `private.pin_credentials` y la Edge Function del PIN: fase 2.
- El negocio DEMO de desarrollo: fase 2, junto con la cuenta del dueño.
- El módulo `src/features/businesses` de la app: necesita `lib/supabase.ts`, que es de la fase 2.
- `private.check_consistency()`: fase 3, cuando haya stock que comparar.
- **El trabajo de la base en GitHub Actions:** no hay repositorio remoto ni Docker para probarlo. Se escribe cuando exista el repositorio; hasta entonces el control es `pnpm db:check`.

## Foco de revisión

1. **Un usuario sin negocio, o con sesión de otro negocio,** que llama a una función: recibe `not_found` o no ve filas, nunca datos ajenos. → Tareas 3 y 6.
2. **Una tabla o función creada en una fase futura sin permisos explícitos:** nace cerrada, y la prueba de estructura falla si le faltan las reglas de acceso. → Tareas 2 y 7.
3. **Dos reintentos a la vez con el mismo `request_id`:** el segundo espera al primero y no crea otra cosa. → Tarea 4, prueba con dos conexiones.
4. **Un cambio de ajustes mal armado** (claves desconocidas, textos donde van números, `null`, medios de pago repetidos): responde `invalid` y no guarda nada. → Tarea 6.
5. **Una prueba que deje datos en la base compartida:** el corredor rechaza `commit` y, al terminar, comprueba que no quedó ningún usuario de prueba. → Tarea 1.

---

### Task 1: Las herramientas: `pnpm sb`, la conexión y el corredor de pruebas

**Archivos:**
- Crear: `scripts/supabase.mjs`, `scripts/lib/guard.mjs`, `scripts/lib/guard.test.mjs`, `scripts/lib/sql.mjs`, `scripts/lib/sql.test.mjs`, `scripts/lib/db.mjs`, `scripts/db-test.mjs`, `supabase/certs/supabase-root-2021-ca.crt`, `supabase/tests/_prelude.sql`, `supabase/tests/000_runner.test.sql`
- Modificar: `package.json`, `.env.example`, `.gitignore` (agrega `.supabase/`), `supabase/config.toml` (`project_id = "varmar-app"`)
- Ya hecho en la prueba corta y entra en el commit de esta tarea: `supabase` 3.2 y `pg` 8 como dependencias de desarrollo, y `supabase init`.

**Interfaces:**
- `pnpm sb <argumentos>`: corre la CLI con `.env.local` cargado y `SUPABASE_HOME=~/.supabase-varmar-app` (si la variable no viene ya puesta).
- `scripts/lib/guard.mjs`:
  - `linkedRef(): string | null` lee `supabase/.temp/project-ref`.
  - `assertDevProject(ref: string | null, devRef: string | undefined, what: string): void` lanza «<what> solo corre en el proyecto de desarrollo» si `ref` no es `devRef` o si falta alguno.
  - El envoltorio la llama cuando los argumentos traen `--yes`; `db.mjs`, al conectar.
- `scripts/lib/sql.mjs`:
  - `statements(sql: string): string[]` devuelve cada sentencia sin comentarios y con el contenido de las comillas y de los `$$…$$` vaciado.
  - `assertIsolated(sql: string, file: string): void` lanza «<file>: una prueba no abre ni cierra transacciones (<palabra>)» si alguna sentencia empieza con `begin`, `start`, `commit`, `end`, `rollback`, `abort` o `prepare`.
  - `parseTap(lines: string[]): { planned: number | null; passed: number; failed: string[] }`.
- `scripts/lib/db.mjs`:
  - `connect(): Promise<pg.Client>` usa el pooler de `supabase/.temp/pooler-url`, la contraseña de `SUPABASE_DB_PASSWORD` y TLS verificado con el certificado del repositorio.
  - `pendingMigrations(client): Promise<{ file: string; sql: string }[]>` devuelve los archivos de `supabase/migrations` cuya versión no está en `supabase_migrations.schema_migrations`, en orden.
  - `inTestTransaction<T>(client, run: () => Promise<T>): Promise<T>` hace `begin`, aplica las migraciones pendientes, crea pgTAP, corre `_prelude.sql`, llama a `run` y siempre termina en `rollback`.
- `pnpm test:db [texto]`: corre cada `supabase/tests/*.test.sql` (en orden, o solo los que contienen `texto`) en su propia transacción. Después corre los `supabase/tests/*.concurrent.mjs`, solo si no quedan migraciones pendientes; si quedan, lo avisa. Sale con 1 si una prueba falla, si un archivo no declara su plan, si el plan no coincide o si quedó un usuario `@prueba.invalid`.
- `supabase/tests/_prelude.sql` crea, dentro de la transacción, el esquema `tests`:
  - `tests.make_user(p_id uuid) returns uuid` inserta un usuario en `auth.users` con el correo `<id>@prueba.invalid`;
  - `tests.login_as(p_id uuid) returns void` pone la sesión de ese usuario y el rol `authenticated`;
  - `tests.login_as_anon() returns void`;
  - `tests.logout() returns void` vuelve a `postgres` y borra la sesión;
  - y da a `authenticated` y a `anon` permiso de ejecutar las funciones de `tests` y de pgTAP (se deshace con la transacción).
- Scripts nuevos en `package.json`: `sb`, `test:db`, `db:push` (`sb db push --remote --yes`), `db:lint` (`sb db lint --remote --fail-on warning`) y `db:advisors` (`sb db advisors --remote --fail-on warn`). `test:scripts` pasa a `node --test "scripts/**/*.test.mjs"`.

- [ ] **Paso 1: Escribir las pruebas de lo que no toca la base**

`scripts/lib/sql.test.mjs`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";

import { assertIsolated, parseTap } from "./sql.mjs";

test("una prueba con commit, begin o rollback se rechaza", () => {
  for (const sql of ["select 1; commit;", "BEGIN;\nselect 1;", "select 1;\n  rollback ;", "start transaction; select 1;", "select 1; end;"]) {
    assert.throws(() => assertIsolated(sql, "x.test.sql"), /x\.test\.sql: una prueba no abre ni cierra transacciones/);
  }
});

test("las mismas palabras dentro de un bloque, un texto o un comentario no cuentan", () => {
  const sql = "do $$ begin perform 1; end $$;\nselect 'commit; begin';\n-- rollback\n/* commit; */ select 1;\ncreate function f() returns int language plpgsql as $body$ begin return 1; end; $body$;";
  assert.doesNotThrow(() => assertIsolated(sql, "x.test.sql"));
});

test("lee el plan y cuenta lo que pasa y lo que falla", () => {
  const result = parseTap(["1..3", "ok 1 - uno", "not ok 2 - dos", "# Failed test 2: \"dos\"", "ok 3 - tres", "otra fila cualquiera"]);
  assert.deepEqual(result, { planned: 3, passed: 2, failed: ["2 - dos"] });
});

test("sin plan, planned es null", () => {
  assert.equal(parseTap(["ok 1 - uno"]).planned, null);
});
```

`scripts/lib/guard.test.mjs`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";

import { assertDevProject } from "./guard.mjs";

test("deja pasar al proyecto de desarrollo", () => {
  assert.doesNotThrow(() => assertDevProject("abcdefghijklmnopqrst", "abcdefghijklmnopqrst", "db push --yes"));
});

test("se niega con otro proyecto, sin enlace o sin la variable", () => {
  for (const [ref, dev] of [["zzzzzzzzzzzzzzzzzzzz", "abcdefghijklmnopqrst"], [null, "abcdefghijklmnopqrst"], ["abcdefghijklmnopqrst", undefined], ["", ""]]) {
    assert.throws(() => assertDevProject(ref, dev, "db push --yes"), /db push --yes solo corre en el proyecto de desarrollo/);
  }
});
```

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test:scripts`
Esperado: FALLA con «Cannot find module … sql.mjs» y «… guard.mjs».

- [ ] **Paso 3: Crear `scripts/lib/sql.mjs` y `scripts/lib/guard.mjs`, y ver que pasan**

Corre: `pnpm test:scripts`
Esperado: pasan las 5 pruebas del generador y las 6 nuevas.

- [ ] **Paso 4: Traer el certificado**

```bash
mkdir -p supabase/certs
curl -fsSL https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt -o supabase/certs/supabase-root-2021-ca.crt
openssl x509 -in supabase/certs/supabase-root-2021-ca.crt -noout -subject -fingerprint -sha256
```

Esperado: `CN = Supabase Root 2021 CA` y la huella `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`. Es un certificado público, no un secreto.

- [ ] **Paso 5: Escribir la prueba de la base que falla**

`supabase/tests/000_runner.test.sql`:

```sql
select plan(5);

select pass('pgTAP corre dentro de la transacción de prueba');

select tests.make_user('00000000-0000-4000-8000-000000000001');
select tests.login_as('00000000-0000-4000-8000-000000000001');
select is(auth.uid(), '00000000-0000-4000-8000-000000000001'::uuid, 'la sesión de prueba es la del usuario');
select is(current_user::text, 'authenticated', 'y corre con el rol authenticated');

select tests.logout();
select is(current_user::text, 'postgres', 'al salir vuelve a postgres');
select is(auth.uid(), null::uuid, 'y ya no hay sesión');

select * from finish();
```

Agrega a `.env.local` (sin leerlo ni mostrarlo) la línea `SUPABASE_DEV_PROJECT_REF=kemtlrjeyteplyjmojts`, y a `.env.example` las líneas vacías `SUPABASE_DB_PASSWORD=` y `SUPABASE_DEV_PROJECT_REF=` con su comentario.

- [ ] **Paso 6: Correrla y ver que falla**

Corre: `pnpm test:db`
Esperado: FALLA: el script `test:db` no existe.

- [ ] **Paso 7: Crear el envoltorio, la conexión, el preludio y el corredor**

- `connect()` se niega (`assertDevProject`) si el proyecto del pooler no es el de desarrollo.
- El corredor manda cada archivo como una sola consulta y junta el texto de todas las filas que vuelven; lo que no es TAP se ignora.
- Si un archivo lanza un error de SQL, lo muestra con su mensaje y cuenta como falla.

- [ ] **Paso 8: Correr y comprobar que el corredor también sabe fallar**

Corre: `pnpm test:db`
Esperado: «000_runner.test.sql: 5 de 5» y salida 0.

Después, con dos archivos temporales en `supabase/tests/` (se borran al terminar el paso):
- uno con `select plan(1); select fail('rota'); select * from finish();` → salida 1 y el nombre de la prueba rota;
- otro con `select plan(1); commit; select pass('x'); select * from finish();` → salida 1 con «una prueba no abre ni cierra transacciones (commit)».

Y `pnpm sb db push --remote --yes --dry-run` con `SUPABASE_DEV_PROJECT_REF=otro` puesto delante → se niega con «solo corre en el proyecto de desarrollo».

- [ ] **Paso 9: Commit**

```bash
git add -A
git commit -m "chore: add the Supabase CLI wrapper, the dev-only guard and a database test runner"
```

---

### Task 2: Permisos cerrados, el esquema `private` y lo común

**Archivos:**
- Crear: `supabase/migrations/<fecha>_foundations.sql` (con `pnpm sb migration new foundations`)
- Prueba: `supabase/tests/010_privileges.test.sql`, `supabase/tests/011_domains.test.sql`, `supabase/tests/012_common.test.sql`

**Interfaces (lo que deja la migración):**
- Nada para `anon` ni para `PUBLIC` en `public`: sin `usage` en el esquema, sin tablas, sin funciones y sin secuencias.
- Permisos por defecto del rol `postgres` cerrados: lo que se cree después en `public` nace sin permisos para `anon`, `authenticated` y `service_role`, y ninguna función nueva, en ningún esquema, es ejecutable por `PUBLIC`.
- El esquema `private`, sin acceso para nadie.
- Dominios en `public`: `payment_method` (`cash`, `yape`, `plin`, `transfer`), `cents` (entero ≥ 0), `positive_cents` (entero > 0) y `phone_pe` (`^\+51[0-9]{9}$`).
- `private.set_updated_at() returns trigger`: pone `updated_at = now()`.
- `private.fail(p_code text) returns void`: lanza `P0001` con el código como mensaje; con un código que no sea de los cuatro, lanza `XX000`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`supabase/tests/010_privileges.test.sql`:

```sql
select plan(9);

select ok(not has_schema_privilege('anon', 'public', 'usage'), 'anon no entra al esquema public');
select ok(has_schema_privilege('authenticated', 'public', 'usage'), 'authenticated sí entra al esquema public');
select ok(not has_schema_privilege('anon', 'private', 'usage'), 'anon no entra al esquema private');

create table public.zz_probe (id integer);
create function public.zz_probe_fn() returns integer language sql as 'select 1';
create sequence public.zz_probe_seq;

select ok(not has_table_privilege('anon', 'public.zz_probe', 'select, insert, update, delete'), 'una tabla nueva nace cerrada para anon');
select ok(not has_table_privilege('authenticated', 'public.zz_probe', 'select, insert, update, delete'), 'y para authenticated');
select ok(not has_table_privilege('service_role', 'public.zz_probe', 'select, insert, update, delete'), 'y para service_role');
select ok(not has_function_privilege('anon', 'public.zz_probe_fn()', 'execute'), 'una función nueva no la ejecuta anon ni PUBLIC');
select ok(not has_function_privilege('authenticated', 'public.zz_probe_fn()', 'execute'), 'ni authenticated');
select ok(not has_sequence_privilege('authenticated', 'public.zz_probe_seq', 'usage, select, update'), 'una secuencia nueva nace cerrada');

select * from finish();
```

`supabase/tests/011_domains.test.sql`:

```sql
select plan(10);

select lives_ok($$select 'yape'::public.payment_method$$, 'yape es un medio de pago');
select throws_ok($$select 'card'::public.payment_method$$, '23514', null, 'tarjeta no lo es');
select lives_ok($$select 0::public.cents$$, 'cero céntimos vale');
select throws_ok($$select (-1)::public.cents$$, '23514', null, 'un monto negativo no');
select lives_ok($$select 1::public.positive_cents$$, 'un céntimo es un monto positivo');
select throws_ok($$select 0::public.positive_cents$$, '23514', null, 'cero no es positivo');
select lives_ok($$select '+51987654321'::public.phone_pe$$, 'un celular con +51 y 9 dígitos vale');
select throws_ok($$select '987654321'::public.phone_pe$$, '23514', null, 'sin +51 no');
select throws_ok($$select '+5198765432'::public.phone_pe$$, '23514', null, 'con 8 dígitos no');
select throws_ok($$select '+51 987654321'::public.phone_pe$$, '23514', null, 'con un espacio no');

select * from finish();
```

`supabase/tests/012_common.test.sql`:

```sql
select plan(6);

select throws_ok($$select private.fail('invalid')$$, 'P0001', 'invalid', 'fail avisa invalid');
select throws_ok($$select private.fail('not_found')$$, 'P0001', 'not_found', 'fail avisa not_found');
select throws_ok($$select private.fail('forbidden')$$, 'P0001', 'forbidden', 'fail avisa forbidden');
select throws_ok($$select private.fail('conflict')$$, 'P0001', 'conflict', 'fail avisa conflict');
select throws_ok($$select private.fail('otro')$$, 'XX000', null, 'un código que no existe es un error interno');
select has_function('private', 'set_updated_at', 'existe el trigger común de updated_at');

select * from finish();
```

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test:db 01`
Esperado: FALLAN las tres: `anon` todavía entra a `public`, y no existen los dominios ni `private.fail`.

- [ ] **Paso 3: Escribir la migración**

En este orden:
1. `revoke all on schema public from public, anon;` y, sobre lo que ya exista en `public`, `revoke all on all tables`, `on all sequences` y `on all functions` a `public`, `anon`, `authenticated` y `service_role`.
2. `alter default privileges for role postgres in schema public revoke all on tables … on sequences … on functions` a esos cuatro, y `alter default privileges for role postgres revoke execute on functions from public;` para todos los esquemas.
3. `create schema private;` con `revoke all on schema private from public;`.
4. Los cuatro dominios.
5. `private.set_updated_at()` y `private.fail(text)`, en `plpgsql` y con `set search_path = ''`.

- [ ] **Paso 4: Ver que pasan, enviar y revisar**

```bash
pnpm test:db 01       # pasa con la migración aplicada dentro de la transacción
pnpm db:push          # la envía al proyecto de desarrollo
pnpm test:db          # pasa otra vez, ya sin migraciones pendientes
pnpm db:lint && pnpm db:advisors
```

Esperado: 30 pruebas en 4 archivos, todo pasa; el lint y los consejos no reportan nada de nivel `warn` o mayor.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: close default privileges and add the private schema, domains and shared helpers"
```

---

### Task 3: El negocio, su dueño y las reglas de acceso

**Archivos:**
- Crear: `supabase/migrations/<fecha>_businesses.sql`
- Prueba: `supabase/tests/020_businesses.test.sql`

**Interfaces:**
- `public.businesses`: `id uuid` (llave, `gen_random_uuid()`), `owner_id uuid not null` → `auth.users (id)`, `name text not null` (de 1 a 60 caracteres sin contar espacios de los lados), `modules text[] not null default '{}'` (solo `orders`, `stock`, `products`, `expenses`, `income`, `cash`, `reports`, `customers`, `loyalty`, `messages` o `reminders`), `setup_done_at timestamptz`, `created_at`, `updated_at`. Índice `(owner_id)`.
- `public.business_settings`: `business_id uuid` (llave) → `businesses (id)`, `active_payment_methods public.payment_method[] not null default '{cash,yape,plin,transfer}'` (de 1 a 4), `delivery_fee_cents public.cents not null default 0`, `delivery_zone text` (hasta 120 caracteres), `production_interval_days integer not null default 7` (de 1 a 14), `lapsed_after_days integer not null default 30` (de 7 a 120), `reminders jsonb not null default '{"scheduled": true, "stock": true, "balances": true}'` (exactamente esas tres claves, las tres booleanas), `version integer not null default 1`, `created_at`, `updated_at`.
- `private.business_counters`: `business_id uuid` (llave) → `businesses (id)`, `next_order_number integer not null default 1` (≥ 1).
- Las tres con las reglas de acceso activadas y el trigger `set_updated_at` (el contador no lleva `updated_at`: solo avanza).
- `private.owned_business_ids() returns uuid[]`: `stable`, `security definer`. Los negocios cuyo `owner_id` es `(select auth.uid())`; sin negocios, `'{}'`.
- `private.current_business_id() returns uuid`: `stable`, `security definer`. El primer negocio del usuario por `created_at`; si no tiene, `private.fail('not_found')`. La usan las funciones que escriben.
- Reglas de lectura para `authenticated`: en `businesses`, `id = any ((select private.owned_business_ids())::uuid[])`; en `business_settings`, lo mismo con `business_id`. Así el índice se puede usar.
- Un trigger `after insert` en `businesses` (`private.init_business()`) crea la fila de ajustes y la del contador.
- Permisos: `authenticated` lee `businesses` y `business_settings`, entra al esquema `private` y ejecuta solo `private.owned_business_ids()`. Nada más.

- [ ] **Paso 1: Escribir la prueba que falla**

`supabase/tests/020_businesses.test.sql`. Los usuarios son `…000a` (A), `…000b` (B) y `…000c` (C, sin negocio); los negocios, `…00a1` y `…00b1`. Los ids completos siguen la forma `00000000-0000-4000-8000-00000000000a`.

```sql
select plan(24);

select tests.make_user('00000000-0000-4000-8000-00000000000a');
select tests.make_user('00000000-0000-4000-8000-00000000000b');
select tests.make_user('00000000-0000-4000-8000-00000000000c');
insert into public.businesses (id, owner_id, name, modules) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', 'Don Pipos (DEMO)', '{orders,stock}'),
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000000b', 'Otro negocio (DEMO)', '{}');

-- Al crear un negocio
select results_eq(
  $$select active_payment_methods::text[], delivery_fee_cents::integer, delivery_zone, production_interval_days, lapsed_after_days, reminders, version
    from public.business_settings where business_id = '00000000-0000-4000-8000-0000000000a1'$$,
  $$values (array['cash', 'yape', 'plin', 'transfer'], 0, null::text, 7, 30, '{"scheduled": true, "stock": true, "balances": true}'::jsonb, 1)$$,
  'un negocio nuevo nace con sus ajustes por defecto');
select is((select next_order_number from private.business_counters where business_id = '00000000-0000-4000-8000-0000000000a1'), 1, 'y su contador empieza en 1');

-- El dueño A
select tests.login_as('00000000-0000-4000-8000-00000000000a');
select is(private.owned_business_ids(), array['00000000-0000-4000-8000-0000000000a1']::uuid[], 'A es dueño solo de su negocio');
select results_eq('select id from public.businesses', $$values ('00000000-0000-4000-8000-0000000000a1'::uuid)$$, 'A lee solo su negocio');
select results_eq('select business_id from public.business_settings', $$values ('00000000-0000-4000-8000-0000000000a1'::uuid)$$, 'y solo sus ajustes');
select throws_ok($$insert into public.businesses (owner_id, name) values ('00000000-0000-4000-8000-00000000000a', 'Otro')$$, '42501', null, 'A no crea negocios');
select throws_ok($$update public.business_settings set delivery_fee_cents = 500$$, '42501', null, 'A no cambia los ajustes directo');
select throws_ok($$delete from public.businesses$$, '42501', null, 'A no borra negocios');
select throws_ok($$select * from private.business_counters$$, '42501', null, 'A no lee el contador');
select throws_ok($$select private.current_business_id()$$, '42501', null, 'ni llama a las funciones internas');
select tests.logout();

-- C, sin negocio
select tests.login_as('00000000-0000-4000-8000-00000000000c');
select is(private.owned_business_ids(), '{}'::uuid[], 'C no es dueño de nada');
select is_empty('select id from public.businesses', 'C no ve ningún negocio');
select is_empty('select business_id from public.business_settings', 'ni ningún ajuste');
select tests.logout();

-- Sin sesión
select tests.login_as_anon();
select throws_ok('select id from public.businesses', '42501', null, 'sin sesión no se lee nada');
select tests.logout();

-- Las reglas de las tablas
select throws_ok($$insert into public.businesses (owner_id, name) values ('00000000-0000-4000-8000-00000000000a', '   ')$$, '23514', null, 'un negocio necesita nombre');
select throws_ok($$update public.businesses set modules = '{ventas}' where id = '00000000-0000-4000-8000-0000000000a1'$$, '23514', null, 'un módulo desconocido no entra');
select throws_ok($$update public.business_settings set production_interval_days = 0$$, '23514', null, 'producir cada 0 días no vale');
select throws_ok($$update public.business_settings set production_interval_days = 15$$, '23514', null, 'ni cada 15');
select throws_ok($$update public.business_settings set lapsed_after_days = 6$$, '23514', null, '«no vuelve» a los 6 días no vale');
select throws_ok($$update public.business_settings set lapsed_after_days = 121$$, '23514', null, 'ni a los 121');
select throws_ok($$update public.business_settings set active_payment_methods = '{}'$$, '23514', null, 'tiene que quedar un medio de pago');
select throws_ok($$update public.business_settings set reminders = '{"scheduled": true}'$$, '23514', null, 'los recordatorios llevan sus tres claves');

-- updated_at
update public.business_settings set delivery_zone = 'Centro', updated_at = '2020-01-01' where business_id = '00000000-0000-4000-8000-0000000000a1';
select ok((select updated_at > '2020-01-02' from public.business_settings where business_id = '00000000-0000-4000-8000-0000000000a1'), 'updated_at lo pone la base, no quien escribe');
select is((select count(*)::integer from public.business_settings), 2, 'cada negocio tiene una sola fila de ajustes');

select * from finish();
```

- [ ] **Paso 2: Correrla y ver que falla**

Corre: `pnpm test:db 020`
Esperado: FALLA con «relation "public.businesses" does not exist».

- [ ] **Paso 3: Escribir la migración** (`pnpm sb migration new businesses`)

Las tablas, sus reglas, índices, triggers, políticas, funciones y permisos de las Interfaces. `private.init_business()` es `security definer`.

- [ ] **Paso 4: Ver que pasa, enviar y revisar**

```bash
pnpm test:db 020 && pnpm db:push && pnpm test:db && pnpm db:lint && pnpm db:advisors
```

Esperado: 54 pruebas en 5 archivos, todo pasa.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add businesses, their settings and counter with owner-only access rules"
```

---

### Task 4: Que un reintento no duplique nada

**Archivos:**
- Crear: `supabase/migrations/<fecha>_idempotency.sql`
- Prueba: `supabase/tests/030_idempotency.test.sql`, `supabase/tests/030_idempotency.concurrent.mjs`

**Interfaces:**
- `private.idempotency_keys`: `business_id uuid not null`, `request_id uuid not null`, `function_name text not null`, `response jsonb`, `created_at timestamptz not null default now()`; llave `(business_id, request_id)`; índice `(created_at)`; reglas de acceso activadas y sin políticas.
  - `business_id` no lleva llave foránea, a propósito: la tabla es interna y efímera, solo la escriben funciones que ya comprobaron el negocio, y así la prueba con dos conexiones corre sin dejar datos guardados.
- `private.claim_request(p_business_id uuid, p_request_id uuid, p_function text) returns jsonb`: primero inserta la clave (`on conflict do nothing`). Si la insertó, devuelve `null` y la función que llama sigue. Si ya existía, devuelve su `response`; si era de otra función, `conflict`. Con `p_request_id` vacío, `invalid`.
- `private.complete_request(p_business_id uuid, p_request_id uuid, p_response jsonb) returns jsonb`: guarda la respuesta y la devuelve.
- `private.purge_idempotency_keys() returns integer`: borra las claves de más de 7 días y dice cuántas.
- pg_cron: el trabajo `purge-idempotency-keys`, cada día a las `15 8 * * *` (03:15 de Lima).
- Nadie fuera de las funciones de la base lee la tabla ni ejecuta estas funciones.

Insertar primero es lo que protege: si dos reintentos llegan a la vez, el segundo espera en el índice único hasta que el primero termina.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`supabase/tests/030_idempotency.test.sql`:

```sql
select plan(12);

select tests.make_user('00000000-0000-4000-8000-00000000000a');

select is(private.claim_request('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000101', 'create_order'), null, 'la primera vez no hay nada guardado');
select is(private.complete_request('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000101', '{"id": "x"}'), '{"id": "x"}'::jsonb, 'guarda la respuesta y la devuelve');
select is(private.claim_request('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000101', 'create_order'), '{"id": "x"}'::jsonb, 'el reintento recibe lo que ya se creó');
select is((select count(*)::integer from private.idempotency_keys), 1, 'y no se guarda una segunda clave');
select throws_ok($$select private.claim_request('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000101', 'add_payment')$$, 'P0001', 'conflict', 'el mismo código en otra función es un conflicto');
select throws_ok($$select private.claim_request('00000000-0000-4000-8000-0000000000a1', null, 'create_order')$$, 'P0001', 'invalid', 'sin código no se acepta');
select is(private.claim_request('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-000000000101', 'create_order'), null, 'otro negocio puede usar el mismo código');

insert into private.idempotency_keys (business_id, request_id, function_name, created_at) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000201', 'create_order', now() - interval '8 days'),
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000202', 'create_order', now() - interval '6 days');
select is(private.purge_idempotency_keys(), 1, 'la limpieza borra las claves de más de 7 días');
select is((select count(*)::integer from private.idempotency_keys where request_id = '00000000-0000-4000-8000-000000000202'), 1, 'y deja las recientes');
select is((select schedule from cron.job where jobname = 'purge-idempotency-keys'), '15 8 * * *', 'la limpieza corre cada día a las 03:15 de Lima');

select tests.login_as('00000000-0000-4000-8000-00000000000a');
select throws_ok('select * from private.idempotency_keys', '42501', null, 'la app no lee las claves');
select throws_ok($$select private.claim_request('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-000000000301', 'create_order')$$, '42501', null, 'ni las crea por su cuenta');
select tests.logout();

select * from finish();
```

`supabase/tests/030_idempotency.concurrent.mjs` exporta por defecto `async function ({ openSession, assert })`:
1. Abre dos sesiones, cada una con su transacción.
2. En la primera, `claim_request(<negocio>, <código>, 'create_order')` devuelve `null`.
3. En la segunda, con `set local lock_timeout = '400ms'`, la misma llamada no termina: falla con el código `55P03`. Eso prueba que espera a la primera.
4. La primera deshace. La segunda deshace, abre otra transacción y repite la llamada: ahora devuelve `null`.
5. Las dos sesiones terminan en `rollback`: no queda nada.

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test:db 030`
Esperado: FALLA con «function private.claim_request(…) does not exist», y avisa que la prueba de dos conexiones espera a que no haya migraciones pendientes.

- [ ] **Paso 3: Escribir la migración** (`pnpm sb migration new idempotency`)

Incluye `create extension if not exists pg_cron with schema pg_catalog;` y `select cron.schedule('purge-idempotency-keys', '15 8 * * *', 'select private.purge_idempotency_keys()');`.

- [ ] **Paso 4: Ver que pasan, enviar y correr la prueba de dos conexiones**

```bash
pnpm test:db 030 && pnpm db:push && pnpm test:db && pnpm db:lint && pnpm db:advisors
```

Esperado: 66 pruebas en 6 archivos y 1 prueba de dos conexiones, todo pasa.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add idempotency keys so a retried request never creates twice"
```

---

### Task 5: El registro de cambios

**Archivos:**
- Crear: `supabase/migrations/<fecha>_audit_log.sql`
- Prueba: `supabase/tests/040_audit_log.test.sql`

**Interfaces:**
- `private.audit_log`: `id bigint generated always as identity` (llave), `business_id uuid not null` → `businesses (id)`, `table_name text not null`, `row_id uuid not null`, `action text not null` (`insert`, `update` o `delete`), `old_data jsonb`, `new_data jsonb`, `changed_by uuid`, `changed_at timestamptz not null default now()`. Índice `(business_id, changed_at desc)`. Reglas de acceso activadas y sin políticas.
- `private.audit_changes() returns trigger`: `security definer`. Recibe como argumentos las columnas que vigila. En un `update`, guarda en `old_data` y `new_data` solo las columnas vigiladas que cambiaron; si ninguna cambió, no guarda nada. `row_id` es el `id` de la fila o, si no tiene, su `business_id`. `changed_by` es `auth.uid()`.
- En `business_settings` queda el trigger `audit_changes('active_payment_methods', 'delivery_fee_cents', 'delivery_zone', 'production_interval_days', 'lapsed_after_days', 'reminders')`.

- [ ] **Paso 1: Escribir la prueba que falla**

`supabase/tests/040_audit_log.test.sql`:

```sql
select plan(8);

select tests.make_user('00000000-0000-4000-8000-00000000000a');
insert into public.businesses (id, owner_id, name) values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', 'Don Pipos (DEMO)');

select is((select count(*)::integer from private.audit_log), 0, 'crear el negocio no deja nada en el registro');

update public.business_settings set delivery_fee_cents = 500, production_interval_days = 7 where business_id = '00000000-0000-4000-8000-0000000000a1';
select results_eq(
  'select table_name, row_id, action, old_data, new_data from private.audit_log',
  $$values ('business_settings', '00000000-0000-4000-8000-0000000000a1'::uuid, 'update', '{"delivery_fee_cents": 0}'::jsonb, '{"delivery_fee_cents": 500}'::jsonb)$$,
  'guarda solo lo que cambió, con el valor de antes y el de después');
select is((select changed_by from private.audit_log), null::uuid, 'sin sesión no hay autor');

update public.business_settings set delivery_fee_cents = 500 where business_id = '00000000-0000-4000-8000-0000000000a1';
select is((select count(*)::integer from private.audit_log), 1, 'guardar lo mismo no deja otra fila');

update public.business_settings set version = version + 1 where business_id = '00000000-0000-4000-8000-0000000000a1';
select is((select count(*)::integer from private.audit_log), 1, 'una columna que no se vigila tampoco');

update public.business_settings set reminders = '{"scheduled": false, "stock": true, "balances": true}' where business_id = '00000000-0000-4000-8000-0000000000a1';
select is((select new_data from private.audit_log order by id desc limit 1), '{"reminders": {"scheduled": false, "stock": true, "balances": true}}'::jsonb, 'un cambio en los recordatorios queda entero');

select tests.login_as('00000000-0000-4000-8000-00000000000a');
select throws_ok('select * from private.audit_log', '42501', null, 'la app no lee el registro');
select tests.logout();

select has_index('private', 'audit_log', 'audit_log_business_id_changed_at_idx', 'tiene su índice por negocio y fecha');

select * from finish();
```

- [ ] **Paso 2: Correrla y ver que falla**

Corre: `pnpm test:db 040`
Esperado: FALLA con «relation "private.audit_log" does not exist».

- [ ] **Paso 3: Escribir la migración** (`pnpm sb migration new audit_log`)

- [ ] **Paso 4: Ver que pasa, enviar y revisar**

```bash
pnpm test:db 040 && pnpm db:push && pnpm test:db && pnpm db:lint && pnpm db:advisors
```

Esperado: 74 pruebas en 7 archivos y 1 de dos conexiones, todo pasa.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add the audit log and record every change to the business settings"
```

---

### Task 6: Leer el negocio y cambiar sus ajustes

**Archivos:**
- Crear: `supabase/migrations/<fecha>_settings_functions.sql`
- Prueba: `supabase/tests/050_settings.test.sql`

**Interfaces:**
- `public.get_business() returns jsonb`: `stable`, lee con las reglas de acceso. Sin negocio, `not_found`. Devuelve:

  ```json
  {
    "id": "…", "name": "Don Pipos (DEMO)", "modules": ["orders", "stock"], "setupDone": false,
    "settings": {
      "activePaymentMethods": ["cash", "yape", "plin", "transfer"], "deliveryFeeCents": 0, "deliveryZone": null,
      "productionIntervalDays": 7, "lapsedAfterDays": 30,
      "reminders": { "scheduled": true, "stock": true, "balances": true }, "version": 1
    }
  }
  ```

- `public.update_settings(p_expected_version integer, p_patch jsonb) returns jsonb`: `security definer`. Cambia los ajustes del negocio del usuario y devuelve el objeto `settings` nuevo, con `version` sumada en 1.
  - `p_patch` es un objeto con al menos una de estas claves, y ninguna otra: `activePaymentMethods`, `deliveryFeeCents`, `deliveryZone`, `productionIntervalDays`, `lapsedAfterDays`, `reminders`.
  - `activePaymentMethods`: lista de 1 a 4 medios válidos, sin repetir.
  - `deliveryFeeCents`: entero ≥ 0. `productionIntervalDays`: entero de 1 a 14. `lapsedAfterDays`: entero de 7 a 120.
  - `deliveryZone`: texto de hasta 120 caracteres o `null`; un texto vacío se guarda como `null`.
  - `reminders`: objeto con las tres claves booleanas.
  - Cualquier otra forma responde `invalid` y no guarda nada. Otra versión responde `conflict`. Sin negocio, `not_found`.
- `authenticated` ejecuta las dos.

- [ ] **Paso 1: Escribir la prueba que falla**

`supabase/tests/050_settings.test.sql`:

```sql
select plan(27);

select tests.make_user('00000000-0000-4000-8000-00000000000a');
select tests.make_user('00000000-0000-4000-8000-00000000000b');
select tests.make_user('00000000-0000-4000-8000-00000000000c');
insert into public.businesses (id, owner_id, name, modules) values
  ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', 'Don Pipos (DEMO)', '{orders,stock}'),
  ('00000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-00000000000b', 'Otro negocio (DEMO)', '{}');

select tests.login_as('00000000-0000-4000-8000-00000000000a');

select is(public.get_business(), '{
  "id": "00000000-0000-4000-8000-0000000000a1", "name": "Don Pipos (DEMO)", "modules": ["orders", "stock"], "setupDone": false,
  "settings": {"activePaymentMethods": ["cash", "yape", "plin", "transfer"], "deliveryFeeCents": 0, "deliveryZone": null,
    "productionIntervalDays": 7, "lapsedAfterDays": 30, "reminders": {"scheduled": true, "stock": true, "balances": true}, "version": 1}
}'::jsonb, 'get_business devuelve el negocio con sus ajustes');

select is(
  public.update_settings(1, '{"deliveryFeeCents": 500, "activePaymentMethods": ["cash", "yape"], "deliveryZone": "Centro de Huamanga", "productionIntervalDays": 3, "lapsedAfterDays": 45, "reminders": {"scheduled": false, "stock": true, "balances": true}}'),
  '{"activePaymentMethods": ["cash", "yape"], "deliveryFeeCents": 500, "deliveryZone": "Centro de Huamanga", "productionIntervalDays": 3, "lapsedAfterDays": 45, "reminders": {"scheduled": false, "stock": true, "balances": true}, "version": 2}'::jsonb,
  'update_settings cambia varios ajustes y sube la versión');
select is(public.get_business() -> 'settings' ->> 'deliveryFeeCents', '500', 'y get_business ya los muestra');
select is((select changed_by from private_audit_author()), '00000000-0000-4000-8000-00000000000a'::uuid, 'el cambio queda en el registro con su autor');

select throws_ok($$select public.update_settings(1, '{"deliveryFeeCents": 700}')$$, 'P0001', 'conflict', 'con una versión vieja responde conflict');
select is(public.update_settings(2, '{"deliveryZone": ""}') ->> 'deliveryZone', null, 'una zona vacía se guarda como null');

-- Todo esto es invalid y no guarda nada (la versión sigue en 3)
select throws_ok($$select public.update_settings(3, '{}')$$, 'P0001', 'invalid', 'un cambio vacío');
select throws_ok($$select public.update_settings(3, '[]')$$, 'P0001', 'invalid', 'una lista en vez de un objeto');
select throws_ok($$select public.update_settings(3, null)$$, 'P0001', 'invalid', 'null');
select throws_ok($$select public.update_settings(3, '{"precio": 1}')$$, 'P0001', 'invalid', 'una clave desconocida');
select throws_ok($$select public.update_settings(3, '{"deliveryFeeCents": 500, "version": 9}')$$, 'P0001', 'invalid', 'una clave válida junto a una que no');
select throws_ok($$select public.update_settings(3, '{"deliveryFeeCents": -1}')$$, 'P0001', 'invalid', 'un delivery negativo');
select throws_ok($$select public.update_settings(3, '{"deliveryFeeCents": "500"}')$$, 'P0001', 'invalid', 'un texto donde va un número');
select throws_ok($$select public.update_settings(3, '{"deliveryFeeCents": 5.5}')$$, 'P0001', 'invalid', 'un número con decimales');
select throws_ok($$select public.update_settings(3, '{"deliveryFeeCents": null}')$$, 'P0001', 'invalid', 'null donde va un número');
select throws_ok($$select public.update_settings(3, '{"productionIntervalDays": 0}')$$, 'P0001', 'invalid', 'producir cada 0 días');
select throws_ok($$select public.update_settings(3, '{"productionIntervalDays": 15}')$$, 'P0001', 'invalid', 'producir cada 15 días');
select throws_ok($$select public.update_settings(3, '{"lapsedAfterDays": 6}')$$, 'P0001', 'invalid', '«no vuelve» a los 6 días');
select throws_ok($$select public.update_settings(3, '{"lapsedAfterDays": 121}')$$, 'P0001', 'invalid', '«no vuelve» a los 121 días');
select throws_ok($$select public.update_settings(3, '{"activePaymentMethods": []}')$$, 'P0001', 'invalid', 'quedarse sin medios de pago');
select throws_ok($$select public.update_settings(3, '{"activePaymentMethods": ["cash", "card"]}')$$, 'P0001', 'invalid', 'un medio de pago que no existe');
select throws_ok($$select public.update_settings(3, '{"activePaymentMethods": ["cash", "cash"]}')$$, 'P0001', 'invalid', 'un medio de pago repetido');
select throws_ok($$select public.update_settings(3, '{"reminders": {"scheduled": true}}')$$, 'P0001', 'invalid', 'recordatorios a medias');
select throws_ok($$select public.update_settings(3, '{"deliveryZone": 5}')$$, 'P0001', 'invalid', 'una zona que no es texto');
select is(public.get_business() -> 'settings' ->> 'version', '3', 'después de todos los rechazos la versión no se movió');
select tests.logout();

select is((select delivery_fee_cents::integer from public.business_settings where business_id = '00000000-0000-4000-8000-0000000000b1'), 0, 'los ajustes del otro negocio no se tocaron');

select tests.login_as('00000000-0000-4000-8000-00000000000c');
select throws_ok('select public.get_business()', 'P0001', 'not_found', 'sin negocio, get_business responde not_found');
select tests.logout();

select * from finish();
```

La cuarta prueba lee el autor del último cambio. Como `authenticated` no lee el registro, hazla así: sal con `tests.logout()`, lee `(select changed_by from private.audit_log order by id desc limit 1)` y vuelve a entrar con `tests.login_as(…)`. El plan sigue siendo de 27.

- [ ] **Paso 2: Correrla y ver que falla**

Corre: `pnpm test:db 050`
Esperado: FALLA con «function public.get_business() does not exist».

- [ ] **Paso 3: Escribir la migración** (`pnpm sb migration new settings_functions`)

`update_settings` bloquea la fila (`for update`), compara la versión, valida todo el cambio y recién entonces actualiza una sola vez.

- [ ] **Paso 4: Ver que pasa, enviar y revisar**

```bash
pnpm test:db 050 && pnpm db:push && pnpm test:db && pnpm db:lint && pnpm db:advisors
```

Esperado: 101 pruebas en 8 archivos y 1 de dos conexiones, todo pasa.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add get_business and update_settings with validation and version checks"
```

---

### Task 7: La prueba que vigila la estructura

**Archivos:**
- Prueba: `supabase/tests/900_structure.test.sql`

**Interfaces:**
- Una sola prueba que revisa el catálogo entero y que las fases siguientes heredan. Cada regla se comprueba dos veces: primero contra un objeto hecho para romperla, que tiene que ser detectado, y después contra la base real, que tiene que salir limpia.

Las reglas, sobre los esquemas `public` y `private`:
1. Toda tabla tiene las reglas de acceso activadas.
2. Toda tabla de `public` tiene `created_at`, `updated_at` y un trigger que ejecuta `private.set_updated_at()`.
3. Toda tabla de `public` tiene `business_id` o es `businesses`.
4. Toda función fija su `search_path` vacío.
5. Toda llave foránea tiene un índice que empieza por sus columnas.
6. Nada es accesible para `anon`: ni tablas, ni secuencias, ni funciones.
7. `authenticated` no tiene `insert`, `update`, `delete` ni `truncate` en ninguna tabla.
8. `authenticated` ejecuta solo las funciones de una lista escrita en la prueba: `public.get_business()`, `public.update_settings(integer, jsonb)` y `private.owned_business_ids()`. Una función nueva para la app obliga a agregarla aquí a conciencia.

- [ ] **Paso 1: Escribir la prueba**

Cada regla es una función en `pg_temp` que devuelve los objetos que la rompen. Por cada una:
- se crea el objeto roto (por ejemplo, `create table public.zz_sin_rls (id integer)`), se comprueba con `isnt_empty` que la función lo encuentra y se borra;
- se comprueba con `is_empty` que en la base real no devuelve nada.

Son 16 pruebas: 8 de detección y 8 de la base real.

- [ ] **Paso 2: Correrla**

Corre: `pnpm test:db 900`
Esperado: pasan las 16. Si una regla encuentra algo real, se corrige con una migración nueva antes de seguir.

Para ver que la prueba sabe fallar, quita de la lista de la regla 8 a `public.get_business()` y vuelve a correr: tiene que fallar nombrándola. Después devuélvela.

- [ ] **Paso 3: Commit**

```bash
git add -A
git commit -m "test: guard the database structure with a catalog-wide test"
```

---

### Task 8: El medidor de rendimiento

**Archivos:**
- Crear: `scripts/db-perf.mjs`, `scripts/lib/perf.mjs`, `scripts/lib/perf.test.mjs`, `supabase/perf/seed.sql`, `supabase/perf/cases.mjs`
- Modificar: `package.json` (script `db:perf`)

**Interfaces:**
- `scripts/lib/perf.mjs`: `evaluate(result: { name: string; ms: number; seqScans: Record<string, number> }, maxMs: number): string[]` devuelve los problemas: «<name>: tardó <ms> ms (máximo <maxMs>)» y «<name>: leyó <tabla> entera, sin índice».
- `supabase/perf/seed.sql`: dentro de la transacción de prueba crea 5,000 usuarios con su negocio (correos `@prueba.invalid`) y termina con `analyze`. Cada fase suma aquí sus datos.
- `supabase/perf/cases.mjs` exporta la lista de casos: `{ name, as, sql, tables, maxMs? }`. `as` es el usuario con el que corre (o `null`), `tables` las tablas que no pueden leerse enteras, y `maxMs` vale 50 si no se pone.
- `pnpm db:perf`: en una transacción que se deshace, carga los datos y corre cada caso dos veces. La primera calienta. En la segunda mide el tiempo con `explain (analyze, format json)` y cuenta las lecturas completas de cada tabla con `pg_stat_xact_user_tables`. Imprime una tabla y sale con 1 si `evaluate` devuelve algo.
- `pnpm db:perf --self-test`: corre un caso hecho para fallar (`select count(*) from public.businesses where name like '%7%'`) y sale con 0 solo si el medidor lo marca.

Casos de esta fase, todos con el dueño del negocio 2,500:
1. `select public.get_business()`: no lee enteras `businesses` ni `business_settings`.
2. `select * from public.businesses`: la regla de acceso usa el índice.
3. `select * from public.business_settings`.
4. `select public.update_settings(1, '{"deliveryFeeCents": 500}')`.

- [ ] **Paso 1: Escribir la prueba que falla**

`scripts/lib/perf.test.mjs`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";

import { evaluate } from "./perf.mjs";

test("un caso rápido y con índice no tiene problemas", () => {
  assert.deepEqual(evaluate({ name: "get_business", ms: 1.8, seqScans: { businesses: 0 } }, 50), []);
});

test("avisa cuando tarda más del máximo", () => {
  assert.deepEqual(evaluate({ name: "get_business", ms: 50.01, seqScans: {} }, 50), ["get_business: tardó 50.01 ms (máximo 50)"]);
});

test("avisa por cada tabla leída entera", () => {
  assert.deepEqual(evaluate({ name: "lista", ms: 3, seqScans: { businesses: 1, business_settings: 0 } }, 50), ["lista: leyó businesses entera, sin índice"]);
});
```

- [ ] **Paso 2: Correrla y ver que falla**

Corre: `pnpm test:scripts`
Esperado: FALLA con «Cannot find module … perf.mjs».

- [ ] **Paso 3: Crear `perf.mjs`, los datos, los casos y el script**

- [ ] **Paso 4: Correr el medidor**

```bash
pnpm test:scripts && pnpm db:perf --self-test && pnpm db:perf
```

Esperado: el caso hecho para fallar es marcado, y los cuatro casos reales pasan con menos de 50 ms y sin leer tablas enteras. Si un caso real falla, se corrige con una migración (el índice o la forma de la regla de acceso) antes de seguir.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "chore: add a performance meter that checks index use and response time"
```

---

### Task 9: Los tipos generados y la revisión completa

**Archivos:**
- Crear: `src/types/database.ts` (generado), `scripts/db-types.mjs`
- Modificar: `package.json` (scripts `db:types`, `db:types:check` y `db:check`), `.prettierignore` (agrega `src/types/database.ts`)

**Interfaces:**
- `pnpm db:types`: escribe `src/types/database.ts` con `sb gen types --remote --schema public`.
- `pnpm db:types:check`: genera otra vez y compara con el archivo; sale con 1 y dice «los tipos no están al día: corre pnpm db:types» si difieren.
- `pnpm db:check`: en orden, que no haya migraciones sin enviar (`db push --remote --dry-run` responde `upToDate`), `db:lint`, `db:advisors`, `db:types:check`, `test:db` y `db:perf`. Es el control de la base mientras no haya GitHub.
- El tipo `Database` exportado: lo usará `lib/supabase.ts` en la fase 2.

- [ ] **Paso 1: Ver que la comprobación falla sin el archivo**

Crea `scripts/db-types.mjs` con sus dos modos (`write` y `check`) y corre: `pnpm db:types:check`
Esperado: FALLA con «los tipos no están al día».

- [ ] **Paso 2: Generar y comprobar**

```bash
pnpm db:types && pnpm db:types:check && pnpm typecheck && pnpm lint
grep -c "get_business\|update_settings\|business_settings" src/types/database.ts
```

Esperado: todo pasa y el archivo nombra las dos funciones y la tabla.

Después cambia a mano una línea del archivo y corre `pnpm db:types:check`: tiene que fallar. Vuelve a generarlo.

- [ ] **Paso 3: La revisión completa**

Corre: `pnpm db:check && pnpm lint && pnpm lint:rules && pnpm typecheck && pnpm test:coverage && pnpm test:scripts`
Esperado: todo pasa.

- [ ] **Paso 4: Commit**

```bash
git add -A
git commit -m "chore: generate the database types and add a single command that checks the database"
```

---

### Task 10: Los documentos y el cierre de la fase

**Archivos:**
- Modificar: `docs/spec/README.md`, `docs/spec/businesses.md`, `docs/glossary.md`, `docs/PROJECT_CONTEXT.md` (§9, regla 8 de §10.1, §10.2, §14 y §16), `CLAUDE.md`, `docs/plan/README.md`

- [ ] **Paso 1: Poner la especificación al día**

- **`docs/spec/README.md`:**
  - «La base organizada por módulos»: mientras no haya base local, las migraciones se escriben a mano, una por módulo y fase; los esquemas declarativos quedan para cuando haya Docker.
  - Los parámetros con `p_` y el JSON en camelCase.
  - Las reglas de acceso con `= any ((select private.owned_business_ids())::uuid[])`.
  - `private.fail`, `private.current_business_id`, `claim_request` y `complete_request`, con el motivo de la clave sin llave foránea.
  - Cómo se prueba: `pnpm test:db`, la prueba de estructura y `pnpm db:perf`.
- **`docs/spec/businesses.md`:** la forma de lo que devuelve `get_business`, las claves de `update_settings` y que `owned_business_ids` devuelve una lista.
- **`docs/glossary.md`:** las filas de `activePaymentMethods`, `deliveryZone`, `lapsedAfterDays`, `reminders`, `modules`, `setupDone` y `expectedVersion`.
- **`docs/PROJECT_CONTEXT.md`:** el árbol de `supabase/` y `scripts/` tal como quedó, la regla 8, los renglones de §10.2 que cambian (tipos al día, base revisada, rendimiento medido) y la fila «Pruebas» de §14.
- **`CLAUDE.md`:** los comandos nuevos, que la CLI va siempre por `pnpm sb`, que `--yes` vale solo en el proyecto de desarrollo y que `.env.local` nunca se lee ni se muestra.

- [ ] **Paso 2: Anotar el resultado**

- En `docs/plan/README.md`: la fase 1 pasa a «Hecha», con la fecha, y la fila de la fase 2 dice que su plan se escribe ahora.
- Al final de este archivo, las secciones «Resultado» y «Lo que cambió respecto de este plan».

- [ ] **Paso 3: Commit**

```bash
git add -A
git commit -m "docs: record phase 1 results and bring the specification up to date"
```

Con esto, la fase 1 está terminada. Sigue escribir el plan de la fase 2.
