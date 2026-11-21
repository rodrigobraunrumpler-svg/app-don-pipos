# Fase 8: Web y entrega — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** dejar la app lista para entregarla: la copia de precios y «Agotado» a la web, la copia de seguridad diaria con su estado en Ajustes, las esperas del PIN y la APK con sus íconos. La fase va en dos partes: la **parte 1** no necesita cuentas nuevas y es la que construye este plan; la **parte 2** (al final) necesita tus cuentas.

**Arquitectura:**
- **La base** anota cada copia de seguridad (`private.backup_runs`) y le dice a la app solo cuándo fue la última buena (`backup_status`).
- **Un script del VPS** hace la copia cada noche con `pg_dump`, la sube a Cloudflare R2 con `rclone`, la anota con `psql` y avisa a un monitor de latidos.
- **La copia a la web** lee el outbox que existe desde la fase 3 (`private.web_sync_outbox`):
  - un trigger con pg_net llama al momento a la Edge Function `sync-to-web`, y pg_cron la vuelve a llamar cada minuto mientras quede algo pendiente;
  - la función manda a Sanity un cambio por producto y anota lo enviado o el error.
- **Las esperas del PIN** cambian solo en `private.attempt_pin` y en el texto de la espera.
- **La APK:** íconos y `eas.json`. Compilarla, EAS Update y Sentry van en la parte 2: necesitan cuentas e instalar librerías, que te toca a ti.

**Stack:** Postgres (pg_net, pg_cron, Vault), Edge Functions en Deno con `npm:postgres`, bash para el VPS, Expo SDK 58. No se suma ninguna librería a la app.

**Especificación:**
- `docs/spec/products.md` §3 («El envío a la web») y §8;
- `docs/spec/businesses.md` (`private.backup_runs`, `record_backup`, `backup_status`, «Ajustes, arriba»);
- `docs/spec/auth.md` (los intentos);
- `docs/PROJECT_CONTEXT.md` §11 (infraestructura) y §12 (acceso).

## Decisiones de esta fase

1. **Esperas del PIN (la decisión I3 de la fase 2):** cada 5 errores seguidos hay una espera: 15 minutos, después 1 hora y después 24 horas (de ahí en adelante, 24 horas cada 5). Ningún error bloquea la cuenta: con el número del dueño, que es público, cualquiera podría dejarlo sin entrar. El bloqueo que pone el equipo a mano (`hard_locked_at`) sigue funcionando.
2. **La copia se anota con la conexión de la base que ya usa `pg_dump`,** no con la llave secreta: el script necesita esa conexión igual, y así el VPS guarda un secreto menos. `record_backup` se queda en `private`.
3. **Sin ninguna copia todavía, Ajustes no muestra nada.** Decir «atrasada, el equipo ya está avisado» sería falso en desarrollo, donde nunca hay copias.
4. **La función `sync-to-web` no usa JWT:** las llaves anon y service_role se retiran a fines de 2026. La llama la base con un secreto propio (`x-web-sync-secret`), guardado en Vault (`web_sync_url`, `web_sync_secret`) y en los secretos de la función. Sin esos secretos, el trigger y el cron no hacen nada: la migración se puede subir a desarrollo sin encender nada.
5. **Un pedido a Sanity por producto:** si un `sanity_id` está mal, los demás productos igual se copian. Se manda solo el estado más nuevo de cada producto; las filas anteriores del mismo producto quedan como enviadas.
6. **Un producto que ya no está enlazado** (`sanity_id` vacío) cierra sus filas pendientes sin mandar nada.
7. **Con 10 intentos fallidos,** la función lo escribe en sus registros. El aviso por Sentry llega con la parte 2.
8. **El dataset de Sanity sale de los secretos de la función.** En desarrollo es `development`: los datos DEMO nunca van a `production` (regla de la web).
9. **El ícono de los avisos** es «DP» en Manrope ExtraBold dentro de un anillo, blanco sobre transparente, porque el logo completo no se lee en 24 dp. Si el cliente tiene un símbolo propio, se cambia.

## Restricciones globales

- **Solo el proyecto de desarrollo** `kemtlrjeyteplyjmojts`.
- **Secretos:** nunca se imprimen ni se piden; la contraseña de la base y la llave secreta viven en `.env.local`.
- **Sin librerías nuevas en la app** hasta la parte 2.
- **Una migración subida no se edita;** los nombres de migración van con la hora UTC.
- **Código:** un componente por archivo, hasta 250 líneas por archivo y colores solo del tema. Los textos van en español de Perú.
- **Commits** en inglés, hasta 100 caracteres, sin cuerpo.

## Foco de revisión

1. **El trigger y el cron a la vez:** dos llamadas a `sync-to-web` al mismo tiempo no mandan dos veces las mismas filas (`for update skip locked`).
2. **«Hoy» y «ayer» de la copia** se cuentan con los días de Lima: la copia de las 03:00 de Lima es a las 08:00 UTC.
3. **Una espera del PIN que termina mañana** dice «mañana a las …».
4. **Un error de la copia con comillas o saltos de línea** no rompe el SQL que lo anota (variables de `psql`).
5. **Sin los secretos de Vault o de Sanity, nada se rompe:** no hay llamadas ni intentos gastados.

---

### Task 1: Las esperas del PIN

**Archivos:**
- Migración nueva `supabase/migrations/<UTC>_pin_waits.sql`: `create or replace function private.attempt_pin`.
- `supabase/tests/060_pin.test.sql`.
- `src/features/auth/components/wait-notice.tsx` y su prueba.
- Las pruebas de `sign-in-form` y `change-pin-flow` que esperan «Espera 15 minutos».
- Se actualizan `auth.md`, `PROJECT_CONTEXT.md` §12 y la fila I3 de `docs/plan/README.md`.

**La regla:**
- El error que deja `failed_attempts` en un múltiplo de 5 pone la espera: 15 minutos con 5, 1 hora con 10 y 24 horas con 15 o más. Responde `locked` con `retryAt`.
- Los demás errores responden `wrong_pin` con `attemptsLeft = 5 - failed_attempts % 5`.
- `hard_locked` sale solo si el equipo puso `hard_locked_at`.

**El texto:**
- El título dice hasta cuándo esperar: «Espera hasta las 10:55», o «Espera hasta mañana a las 10:40» si la espera termina otro día de Lima.
- Debajo: «Hubo varios intentos con un PIN equivocado. Por seguridad, cada vez la espera es más larga.», y «Pedir un PIN nuevo al equipo» como hoy.

- [ ] **Paso 1:** las pruebas que fallan.
  - pgTAP:
    - el error 10 da `locked` en una hora;
    - el 15 y el 20, en 24 horas;
    - después de la espera quedan 4 intentos;
    - el PIN correcto reinicia el contador;
    - un `hard_locked_at` del equipo sigue bloqueando.
  - Jest: `WaitNotice` con una espera de hoy y con una de mañana.
- [ ] **Paso 2:** implementar. Correr `pnpm test:db`, `pnpm test`, `pnpm lint` y `pnpm typecheck`; después, `pnpm db:push`.
- [ ] **Paso 3: Commit** — `feat: replace the hard lock after 10 wrong PINs with waits that grow to 24 hours`.

### Task 2: La copia de seguridad en la base y en Ajustes

**Archivos:**
- Migración nueva `<UTC>_backups.sql`.
- `supabase/tests/140_backups.test.sql`.
- En `src/features/businesses/`:
  - `api/backup.ts`, con `getBackupStatus()`;
  - `schema/backup.ts`, con `backupStatusSchema`: `{ lastBackupAt: Date | null, late: boolean }`;
  - `queries/backup.ts`, con `backupStatusQuery` y la llave `["businesses", "backup"]`;
  - `components/backup-status.tsx` y su prueba;
  - el índice.
- `src/app/(main)/settings/index.tsx` y la prueba de ruta `settings`.

**La base:**
- `private.backup_runs`: `id` (identity), `started_at`, `finished_at`, `ok`, `size_bytes ≥ 0` y `error`.
  - Una copia fallida lleva su error.
  - `finished_at` no puede ser anterior a `started_at`.
  - Índice `(finished_at desc) where ok`.
- `private.record_backup(p_started_at timestamptz, p_finished_at timestamptz, p_ok boolean, p_size_bytes bigint, p_error text) returns void`.
- `private.backup_status() returns jsonb`, `security definer`, con su envoltorio en `public`.
  - Devuelve `{ "lastBackupAt": "…Z" | null, "late": bool }`.
  - `late` es verdadero cuando la última copia buena tiene más de 26 horas.
  - Solo `authenticated` lo ejecuta, y nadie de la API lee `private.backup_runs`.

**Ajustes, arriba:**
- Bien: «Tus datos están respaldados. Última copia de seguridad: hoy, 03:00». La fecha sale de `formatWhen`, con la primera letra en minúscula.
- Atrasada, en ámbar: «La copia de seguridad está atrasada. El equipo ya está avisado.»
- Sin ninguna copia, cargando o con error: nada.

- [ ] **Paso 1:** las pruebas que fallan.
  - pgTAP:
    - anotar una copia buena y una fallida;
    - el estado toma la última buena;
    - pasa a atrasada con 27 horas;
    - sin copias, `null`;
    - `authenticated` no lee la tabla y `anon` no ejecuta `backup_status`.
  - Jest: hoy, ayer, atrasada y sin copias.
  - Ruta: Ajustes muestra la línea arriba.
- [ ] **Paso 2:** implementar. Correr `pnpm test:db`, `pnpm db:push` y `pnpm db:types`; después, `pnpm test`, `pnpm lint` y `pnpm typecheck`.
- [ ] **Paso 3: Commit** — `feat: record each backup and show its status at the top of Ajustes`.

### Task 3: El programa de la copia del VPS

**Archivos:**
- `scripts/backup/donpipos-backup.sh` (bash, `set -euo pipefail`).
- `scripts/backup/donpipos-backup.cron`.
- `scripts/backup/backup.test.mjs` (`node:test`, entra en `pnpm test:scripts`).

**El script:**
- Lee `${BACKUP_ENV_FILE:-/etc/donpipos-backup.env}`:
  - obligatorios: `DATABASE_URL`, `RCLONE_REMOTE` (por ejemplo `r2:donpipos-backups`) y `HEARTBEAT_URL`;
  - opcionales: `KEEP_DAYS=30` y `BACKUP_DIR=/var/backups/donpipos`.
- Los programas se pueden cambiar para las pruebas: `PG_DUMP`, `PG_RESTORE`, `PSQL`, `RCLONE` y `CURL`.
- **Los pasos:**
  1. `pg_dump --format=custom --no-owner --no-privileges` a `donpipos-<UTC>.dump`;
  2. `pg_restore --list` del archivo, para revisar que se puede leer;
  3. `rclone copyto` al remoto;
  4. borrar en el remoto lo que tiene más de `KEEP_DAYS` días y, en el VPS, lo que tiene más de 3;
  5. `psql` con `select private.record_backup(...)`, pasando los valores como variables (`-v`);
  6. `curl` a `HEARTBEAT_URL`.
- **Si un paso falla:**
  - anota la copia fallida con su error (si la base responde);
  - llama a `HEARTBEAT_URL/fail` (como healthchecks.io);
  - sale con 1.
- **El cron:** todos los días a las 08:00 UTC, que son las 03:00 de Lima.

- [ ] **Paso 1:** las pruebas que fallan, con programas falsos que anotan cómo los llamaron.
  - Todo bien: los seis pasos en orden, `true` en `record_backup` y el latido.
  - Falla la subida: se anota `false` con el error y llega `/fail`, con salida 1.
  - Un error con comillas llega entero a `psql` como variable.
  - Sin `DATABASE_URL`: lo dice, sale con 1 y no corre nada.
- [ ] **Paso 2:** implementar. Correr `pnpm test:scripts`.
- [ ] **Paso 3: Commit** — `feat: add the nightly backup script for the VPS with its tests`.

### Task 4: La copia a la web

**Archivos:**
- Migración nueva `<UTC>_web_sync.sql`.
- `supabase/tests/150_web_sync.test.sql`.
- En `supabase/functions/sync-to-web/`: `index.ts`, `sanity.ts` y `sanity.test.ts`.
- `supabase/config.toml`: `[functions.sync-to-web] verify_jwt = false`.

**La base:**
- `create extension if not exists pg_net`.
- `private.claim_web_sync(p_limit integer default 20) returns jsonb`.
  - Toma las filas pendientes con `for update skip locked`, agrupadas por producto.
  - Devuelve `[{ "ids": [..], "sanityId": "…", "payload": {…} }]`, con el payload de la fila más nueva.
  - Las filas de un producto sin `sanity_id` se cierran como enviadas, con `last_error = 'not_linked'`.
- `private.finish_web_sync(p_ids bigint[], p_error text) returns void`.
  - Sin error: `sent_at = now()`.
  - Con error: suma un intento y guarda `last_error`, hasta 500 caracteres.
- `private.link_product(p_product_id uuid, p_sanity_id text, p_image_url text) returns void`: enlaza el producto y anota su estado completo (`queue_web_sync`).
- `private.kick_web_sync() returns void` (`security definer`).
  - Lee `web_sync_url` y `web_sync_secret` de `vault.decrypted_secrets`.
  - Si faltan o no hay nada pendiente, no hace nada.
  - Si no, llama a `net.http_post` con el encabezado `x-web-sync-secret`.
- Un trigger `after insert … for each statement` en el outbox llama a `kick_web_sync`.
- Un cron, `web-sync-retry`, corre `* * * * *`.

**La función:**
- Responde 401 sin el secreto correcto (comparación de tiempo constante).
- Responde 503 `not_configured` si faltan `SANITY_PROJECT_ID`, `SANITY_DATASET` o `SANITY_WRITE_TOKEN`, sin tomar filas.
- En una transacción:
  1. `claim_web_sync(20)`;
  2. por cada producto, `sendToSanity`;
  3. `finish_web_sync` con el resultado.
- Con 10 intentos fallidos o más, lo escribe en sus registros.
- **`sanity.ts`:**
  - `sanityMutation(item)` arma `{ mutations: [{ patch: { id: sanityId, set: payload } }] }`;
  - `sendToSanity(fetch, config, item): Promise<string | null>` hace el POST a `https://<projectId>.api.sanity.io/v2025-02-19/data/mutate/<dataset>` con `Authorization: Bearer <token>` y 10 segundos de límite;
  - devuelve `null` si salió bien, o el error: «HTTP 401: …» (recortado), o el mensaje si falló la red.

- [ ] **Paso 1:** las pruebas que fallan.
  - pgTAP:
    - dos cambios del mismo producto: sale uno, con el estado más nuevo y los dos ids;
    - un producto desenlazado cierra sus filas;
    - `finish_web_sync` con y sin error;
    - `link_product` anota el estado completo;
    - sin Vault, `kick_web_sync` no llama a nada.
  - `node:test`: la mutación, la URL y el token, un 2xx, un 4xx y un error de red.
- [ ] **Paso 2:** implementar. Correr `pnpm test:db`, `pnpm db:push`, `pnpm test:scripts`, `pnpm typecheck` y `pnpm functions:deploy` (en desarrollo responde `not_configured` hasta la parte 2).
- [ ] **Paso 3: Commit** — `feat: send price, stock and visibility changes to Sanity from the outbox`.

### Task 5: La APK: íconos y configuración

**Archivos:**
- En `assets/`:
  - `icon.png`: el logo, 1024 px;
  - `adaptive-icon.png`: el logo redondo recortado, en 640 px dentro de un lienzo transparente de 1024;
  - `notification-icon.png`: 96 px, blanco sobre transparente;
  - `splash-icon.png`: el logo redondo, transparente.
- `app.config.ts`:
  - el ícono adaptable sobre crema `#FAF7E9`;
  - `android.versionCode: 1`;
  - la pantalla de carga con el logo redondo sobre `#354b2e`;
  - `expo-notifications` con `icon` y `color: "#354b2e"`.
- `eas.json`: los perfiles `preview` (APK, canal `prueba`) y `production` (APK, canal `produccion`).
- `scripts/app-assets.test.mjs`.

- [ ] **Paso 1:** la prueba que falla: cada imagen existe con su tamaño, las que van sobre transparente son RGBA, y `app.config.ts` las usa.
- [ ] **Paso 2:** generar las imágenes, configurar y revisar con `pnpm exec expo config --type public`.
- [ ] **Paso 3: Commit** — `feat: add the launcher, notification and splash icons and the APK build profiles`.

### Task 6: Cierre de la parte 1

- [ ] **Documentos:**
  - las especificaciones (`products.md`, `businesses.md` y `auth.md`), el glosario y el README del plan;
  - en este plan, «Resultado» y «Lo que falta» (la parte 2, paso a paso).
- [ ] **Verificar:**
  - `pnpm test`, `pnpm lint`, `pnpm typecheck` y `prettier --check`;
  - `pnpm lint:rules`, `pnpm test:scripts`, `pnpm test:db` y `pnpm db:check`.
- [ ] **Commit** — `docs: record phase 8 part 1 and what part 2 needs`.

## Parte 2: con tus cuentas (fuera de este plan)

1. **Supabase de producción:**
   - el proyecto, con el plan que elijas;
   - las migraciones, las funciones y sus secretos;
   - el dueño real con su PIN;
   - sus 5 alfajores y sus ajustes;
   - la vista «servidor en pausa», cuando se pueda ver cómo responde un proyecto pausado.
2. **Sanity:**
   - el token de escritura;
   - `pnpm web connect` (los secretos de la función y de Vault) y `pnpm web link` para enlazar cada alfajor con su documento;
   - primero en el dataset `development`.
3. **El VPS:**
   - `postgresql-client-17`, `rclone` con R2, `/etc/donpipos-backup.env` (con `chmod 600`) y el cron;
   - un monitor de latidos (healthchecks.io gratis, cada 24 horas con 2 de gracia);
   - restaurar una copia de verdad una vez.
4. **Expo y Sentry:**
   - `eas init`;
   - instalar `expo-updates` y `@sentry/react-native`, con `beforeSend` sin datos personales;
   - compilar la APK `preview` y probarla en un Android de verdad;
   - después, la de `production`.
   - Pendiente: ¿el celular del cliente es Android?
5. **La revisión nocturna** (`private.check_consistency`), que avisa por Sentry.
6. **El cierre:**
   - tus pruebas en el celular de las fases 3 a 7c;
   - la verificación de Google;
   - una guía corta de uso para el dueño;
   - la entrega.

## Resultado de la parte 1 (2026-11-21)

La parte 1 quedó construida en la rama `fase-8`, con un commit por tarea. Pasan:
- 779 pruebas de Jest;
- 56 de los scripts y las funciones;
- 806 de la base, en 39 archivos, y los 50 casos de velocidad;
- lint, tipos y formato.

En el proyecto de desarrollo ya están las migraciones (`pin_waits`, `backups`, `web_sync` y `pg_net_schema`) y la función `sync-to-web`. La función responde 401 a quien no trae el secreto, y hasta la parte 2 no tiene secreto: está apagada.

### Lo que falta: probar en el celular

```bash
cd /home/javier/var-mar/app && pnpm start --tunnel
```

1. **Las esperas del PIN** (opcional: deja ese número 15 minutos sin entrar). Cierra sesión y entra con el número DEMO y un PIN equivocado 5 veces. Sale «Espera hasta las …», con la hora de Lima y sin «bloqueada».
2. **Ajustes no cambia todavía:** la línea de la copia de seguridad aparece con la primera copia del VPS.
3. **Los íconos** se ven recién en la APK (parte 2): en Expo Go la app sigue con los de Expo Go.

### Lo que cambió respecto de este plan

- **Las funciones de Sanity viven en `supabase/functions/_shared/sanity.ts`:** la configuración de tipos de las funciones solo revisa `_shared`, como `owner-password.ts`.
- **`supabase/config.toml` no cambió:** `pnpm functions:deploy` ya sube todas las funciones sin JWT, y `sync-to-web` se sumó a su lista.
- **Con 10 intentos fallidos, el cron llama solo a la hora en punto** (`private.web_sync_due`): un `sanity_id` mal escrito o un token vencido no insisten cada minuto. Un cambio nuevo del mismo alfajor igual llama al momento.
- **La llave de la consulta de la copia es `["backup"]`,** fuera de la del negocio: guardar un ajuste no la cancela ni la vuelve a pedir.
- **`pg_net` se volvió a crear en el esquema `extensions`** (migración `pg_net_schema`): el revisor de Supabase no la quería en `public`, y no se puede mover. Sus funciones siguen en `net`.
