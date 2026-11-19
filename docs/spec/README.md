# Especificación

Un archivo por módulo de `src/features/`. Esto es lo que se construye. Se lee junto con tres fuentes:

- `PROJECT_CONTEXT.md`: el porqué, las decisiones y las reglas;
- `glossary.md`: los nombres;
- la maqueta aprobada en `design/pantallas/`.

Si algo cambia, se cambia aquí primero y después en el código.

## Cómo está escrito cada módulo

1. **Qué resuelve** y qué pantallas de la maqueta cubre.
2. **Datos:** tablas, columnas y restricciones.
3. **Funciones de la base:** lo que el servidor guarda y cuenta, con lo que recibe y devuelve.
4. **Permisos.**
5. **Cuentas en el celular** (`rules/`): solo vistas previas, con ejemplos que son sus pruebas.
6. **Pantallas y estados:** qué muestra cada pantalla en cada vista de la maqueta.
7. **Con otros módulos:** qué usa de otros (por su `index.ts`) y qué expone.
8. **Pruebas que deben pasar:** base (pgTAP), cuentas, pantallas y recorridos.
9. **Fuera de esta versión.**

## Lo común a todos los módulos

Esto no se repite en cada archivo.

- **Cada tabla:**
  - columnas: `id` (uuid), `business_id`, `created_at` y `updated_at` (con un trigger común);
  - reglas de acceso activadas (regla 9).
- **Se lee con RLS; se escribe solo por funciones.**
  - **Lectura:** el dueño lee las filas de su negocio.
  - **Escritura:** solo con funciones `security definer`. Cada función comprueba que el negocio sea del usuario y fija su `search_path`.
  - La app no puede insertar ni cambiar filas directo, así ningún total, número o stock queda mal guardado.
- **Nada se borra.** Lo que se equivoca se anula o se corrige con un movimiento (§6 de `PROJECT_CONTEXT.md`).
- **Que una señal mala no duplique nada (idempotencia):**
  - Cada función que crea algo recibe un `request_id`: pedidos, ventas, pagos, gastos, ingresos, producción, mermas, conteos y cierres de caja.
  - El celular lo genera una vez por intención del usuario (`crypto.randomUUID()`) y lo repite en cada reintento.
  - La función lo anota en `private.idempotency_keys` con su respuesta. Si el mismo código vuelve, devuelve lo que ya creó, sin crear otro.
  - Las claves se borran a los 7 días (pg_cron).
- **Permisos cerrados de base,** en la primera migración:
  - se revoca todo a `anon` y a `PUBLIC`, incluido el `EXECUTE` que Postgres da a todas las funciones;
  - `authenticated` solo lee las tablas que la app lee (con RLS) y ejecuta solo las funciones de la app;
  - los permisos por defecto (`alter default privileges`) quedan igual de cerrados para lo que se cree después.
- **Lo interno, en el esquema `private`,** que la API no expone: `idempotency_keys`, `business_counters`, `pin_credentials`, `web_sync_outbox`, `audit_log` y las funciones internas (revisar el PIN, sumar o quitar un sello, los negocios del usuario).
- **Llaves foráneas con el negocio:**
  - Cada tabla padre tiene `unique (business_id, id)`.
  - Cada hija apunta con `(business_id, x_id)`, así la base impide que un pedido apunte al producto o al cliente de otro negocio.
  - El índice de esa llave empieza por `business_id`.
- **Tipos reutilizables** para los valores que se repiten (dominios de Postgres):
  - `payment_method`: `cash`, `yape`, `plin` o `transfer`;
  - `cents`: entero ≥ 0;
  - `positive_cents`: entero > 0;
  - `phone_pe`: `+51` y 9 dígitos. Así no se duplica un cliente por cómo se escribió su número.
- **Las cuentas también como reglas de la tabla** (`CHECK`). Por ejemplo, en `orders`: total = subtotal + delivery − descuento, y lo pagado ≤ total. Aunque una función tuviera un error, la base no guarda una cuenta mal hecha.
- **Datos del momento:** como el precio congelado (D9), se guarda cómo era cada cosa al momento del pedido: el nombre del alfajor en la línea y el nombre del cliente en el pedido (`orders.md`).
- **Dos ediciones a la vez:**
  - lo que se edita lleva `version` (productos, ajustes, pedidos, clientes, plantillas, fidelidad);
  - la función recibe `expected_version` y responde `conflict` si alguien cambió la fila antes.
- **Registro de cambios delicados** (`private.audit_log`, con un trigger):
  - qué se registra: cambios de precio y de «se ve en la web», de ajustes, de fidelidad y de plantillas, y cada anulación (pedidos, pagos, gastos, ingresos);
  - qué guarda: la fecha, el valor anterior y el nuevo.
  - Sirve para responder «¿cuándo subí el precio?». En esta versión no tiene pantalla.
- **La base organizada por módulos, igual que la app:**
  - `supabase/schemas/<módulo>.sql` tiene las tablas, índices, funciones y permisos de cada módulo;
  - las migraciones se generan con `supabase db schema declarative sync` y no se escriben a mano;
  - la versión 2.0 (pg-delta) está en alfa pública; si da problemas, se usa el motor anterior (migra).
- **Montos:**
  - en céntimos enteros, mayores que cero salvo que se diga otra cosa;
  - lo guardado lo calcula la base (§14.3).
- **Fechas:** en `timestamptz`. El día del negocio es el de `America/Lima`.
- **Listas largas:** funciones con página por cursor que devuelven `{ items, meta: { limit, total, hasMore, nextCursor } }`. `limit` es 20 por defecto y 50 como máximo (§14.3).
- **Errores:**
  - las funciones de la base avisan con un código propio: `invalid`, `not_found`, `forbidden` o `conflict`;
  - `api/` los convierte en `AppError`, y una red caída es `offline` (regla 16).
- **Respuesta al instante:**
  - las ediciones se ven en el momento y vuelven atrás si fallan;
  - lo que crea un número espera con «Guardando…» (§14.2).

## Rendimiento de la base

Pensada desde el primer día para varios negocios y años de datos.

- **Cada consulta tiene su índice.** Son compuestos y empiezan por `business_id`, porque toda consulta filtra por negocio; después van las columnas por las que filtra y ordena (por ejemplo, `orders (business_id, number desc)`). Cada módulo lista los suyos y qué consulta sirve cada uno.
- **Índices parciales para lo que se mira a diario:** los pedidos en curso, los que tienen saldo, los próximos. Quedan chicos aunque la tabla crezca.
- **Toda llave foránea tiene su índice:** Postgres no lo crea solo.
- **Listas con cursor, nunca con OFFSET:** la página 50 cuesta lo mismo que la primera.
- **Lo que se lee mucho se guarda ya calculado,** en la misma operación que lo cambia: el stock de cada producto (`stock_levels`) y los totales y lo pagado de cada pedido. Los movimientos siguen siendo la fuente de verdad, y una prueba confirma que lo guardado coincide con su suma.
- **Búsqueda por nombre con trigramas** (`pg_trgm`, índice GIN): encuentra «ana» dentro de «Ana Q.» sin recorrer la tabla.
- **Fechas por rango:** los reportes calculan el inicio y el fin del día de Lima y filtran con `>=` y `<` sobre `timestamptz`, así usan índices simples.
- **Reglas de acceso rápidas,** como recomienda Supabase:
  - las políticas usan `(select auth.uid())`, que se evalúa una sola vez por consulta;
  - una función `security definer` devuelve los negocios del usuario, sin uniones dentro de la política;
  - `businesses.owner_id` tiene índice.
- **Índices que cubren la consulta** (`INCLUDE`): la lista de pedidos se lee solo del índice (`orders.md`).
- **Espacio libre en las tablas que cambian a cada rato** (`fillfactor`): 70 en `stock_levels` y 85 en `orders`. Postgres actualiza la fila en el mismo bloque sin reescribir sus índices (actualizaciones HOT): es más rápido y la tabla no se hincha.
- **Funciones en una sola consulta:** cada función arma su respuesta trabajando por conjuntos, sin bucles fila por fila ni una consulta por pedido, y devuelve solo lo que muestra la pantalla.
- **Cómo se comprueba:**
  - Un script carga datos de prueba de varios negocios y años (cientos de miles de pedidos). Con `EXPLAIN` revisa que las funciones principales usen sus índices y respondan en menos de 50 ms. Corre en GitHub cuando cambia una migración.
  - Cada noche, pg_cron corre `private.check_consistency()`. Compara el stock guardado con sus movimientos, los totales y lo pagado con sus líneas y pagos, y los sellos con sus movimientos. Si algo no coincide, avisa al equipo (Sentry) antes de que el dueño lo note.
  - Una vez al mes, en producción, `supabase inspect db seq-scans` y `supabase inspect db unused-indexes` muestran las lecturas sin índice y los índices que sobran.
- **Lo que todavía no hace falta:** particionar tablas o guardar resúmenes diarios precalculados. Con estos índices, un negocio con 50 pedidos al día pasa años sin notarlo. Se agregan solo si una función pasa de su tiempo en la prueba de arriba.

## Buenas prácticas 2026–2027

Revisadas el 2026-11-18. Las que dependen de una versión dicen cómo confirmarla.

### Supabase y Postgres

- **Las llaves nuevas de Supabase:** la app usa la publicable (`sb_publishable_…`) y el servidor la secreta (`sb_secret_…`). Las llaves anon y service_role se retiran a fines de 2026, así que no se usan nunca.
- **Los ids:**
  - `gen_random_uuid()` por ahora.
  - Postgres 18 trae `uuidv7()`, ordenado por tiempo, que hace más rápidos los índices al insertar. Supabase todavía no confirma Postgres 18; cuando lo tenga, se usa en las tablas que más crecen (pedidos, pagos, movimientos de stock, gastos).
  - Los ids de los usuarios de Supabase Auth siguen siendo v4.
- **Índices que cubren** (`INCLUDE`) en las listas más usadas, como la de pedidos con su total y estado, para responderlas solo con el índice.
- **Funciones:** `stable` cuando solo leen. `security definer` con `set search_path = ''` y los nombres con su esquema.
- **Lo que sale del sistema pasa por un outbox:** se guarda en la misma operación y se envía con reintentos (pg_net y pg_cron). Así un cambio para la web nunca se pierde (`products.md`).
- **Para encontrar lo lento:**
  - `pg_stat_statements`, que viene activo en Supabase;
  - el Performance Advisor y el Security Advisor del panel;
  - `supabase inspect db` (§ Rendimiento de la base).
- **Realtime solo cuando haga falta,** con los pedidos de la web (fase 2): cada suscripción cuesta.

### En el celular (React Native y Expo SDK 58)

- **Solo la nueva arquitectura:** desde SDK 55 es la única. Cada librería que se agregue tiene que soportarla.
- **React Compiler activado:** memoriza solo, sin `useMemo` ni `useCallback` a mano. Es estable y Expo lo trae activado en las apps nuevas desde SDK 54; se confirma al crear el proyecto.
- **Listas largas con FlashList v2,** hecha para la nueva arquitectura y sin calcular tamaños a mano: Pedidos, Clientes, movimientos, gastos e ingresos.
- **Imágenes con expo-image,** con caché en disco y en memoria, para las fotos de los alfajores.
- **Abre al instante:** la caché guardada de TanStack Query muestra lo último (§14.2), y la pantalla de carga se quita cuando ya hay datos.
- **Pedir antes de abrir:** al apretar una fila, se pide el detalle antes de soltar el dedo (`onPressIn` + prefetch).
- **Cada pantalla se repinta solo con lo que usa,** con `select` en las consultas.
- **Animaciones:** las nativas de la interfaz, y Reanimated solo si hace falta. Nada pesado en el hilo de JavaScript.
- **APK liviana:**
  - R8 achica el código en producción. Las notas de SDK 58 dicen que viene activado; se confirma con `expo-build-properties`.
  - Una APK universal para que instale en cualquier celular. Si pesa mucho, solo `arm64-v8a`, que usan casi todos los Android actuales.
- **Fotos de boletas achicadas antes de subir** (`lib/images.ts`): 1600 px de lado mayor, JPEG 0,7.
- **La sesión, cifrada** con `LargeSecureStore` (`auth.md`).
- **Medir en un Android económico:** React Native DevTools, y Sentry con trazas a muestreo bajo.

## Módulos

La fase de cada módulo es la sugerida; el plan de trabajo la confirma.

| Archivo | Módulo | Fase |
|---|---|---|
| `businesses.md` | Negocio, ajustes y puesta en marcha | 1 y 2 |
| `auth.md` | PIN, huella y bloqueo | 2 |
| `products.md` | Productos, precios y copia a la web | 3 |
| `stock.md` | Stock, producción, merma, conteo y sugerencia | 3 |
| `customers.md` | Clientes (en la fase 4, el registro por teléfono; en la 7, ficha y «no vuelven») | 4 y 7 |
| `orders.md` | Pedidos, pagos, venta de mostrador y demorados | 4 |
| `messages.md` | Plantillas de WhatsApp (en la fase 4, los textos por defecto; en la 7, editarlos) | 4 y 7 |
| `expenses.md` | Gastos | 5 |
| `income.md` | Ingresos | 5 |
| `cash.md` | Cuadre de caja | 5 |
| `reports.md` | Inicio y reportes | 6 |
| `loyalty.md` | Fidelidad | 7 |
| `reminders.md` | Recordatorios | 7 |
