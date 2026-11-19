# Fase 3: productos y stock — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que el dueño vea y cambie sus productos y precios, vea su stock con el estado de cada alfajor, registre la producción (y la deshaga), anote mermas y cuente el stock. Todo se guarda con funciones de la base, sin duplicarse con mala señal, y lo que la web tendrá que copiar queda anotado.

**Arquitectura:** tres migraciones: las tablas, las funciones de productos y las del stock. El stock es la suma de los movimientos; `stock_levels` guarda esa suma en la misma operación, con un ayudante privado (`private.move_stock`) que también anota en el outbox de la web cuando el stock cruza el cero. Lo apartado para pedidos sale de `private.reserved_stock`, que en esta fase no devuelve nada y en la fase 4 lee los pedidos. En el celular, dos módulos (`products` y `stock`) y sus pantallas: Más → Productos y precios, Stock, Registrar producción y Un alfajor.

**Stack:** Postgres (plpgsql, pgTAP), `@supabase/supabase-js` 2 (`rpc`), TanStack Query 5 (`queryOptions`, `infiniteQueryOptions`, mutaciones con vuelta atrás), Zod, NativeWind, expo-image, `@shopify/flash-list` 2.3.2 y expo-haptics ~58.0.8 (los dos vienen en Expo Go 58; versiones de `node_modules/expo/bundledNativeModules.json`).

**Especificación:** `docs/spec/products.md`, `docs/spec/stock.md`, `docs/spec/README.md`, `docs/PROJECT_CONTEXT.md` (D9, D12, D13, §6, §14.2, §14.3, §14.4), `docs/glossary.md` y la maqueta (`docs/design/pantallas/`, `assets/donpipos.js`: `stock`, `produccion`, `historial`, `hojaMerma`, `hojaConteo`; `assets/donpipos-2.js`: `productos`).

## Cambios respecto de la especificación

Se escriben en `products.md`, `stock.md` y `docs/plan/README.md` en la tarea 2, antes de tocar la base.

1. **La sugerencia de producción pasa a la fase 4,** con todo lo que sale de la venta esperada: «Por qué 36», «alcanza hasta», el estado `low` por días, el gráfico «Cómo se vende» (`product_sales_by_weekday`) y la sugerencia de Inicio. La venta esperada se calcula con las líneas de los pedidos, que llegan en la fase 4. En esta fase, el estado sale del stock y del mínimo, y Registrar producción muestra «Anota cuántos hiciste».
2. **Deshacer es por registro, no por movimiento:** `revert_stock_change(request_id)` deshace todos los movimientos de una producción, una merma o un conteo (una producción tiene un movimiento por alfajor). Cada movimiento guarda su `request_id`, y el movimiento contrario apunta al original (`reverts_movement_id`, único): nada se deshace dos veces. Reemplaza a `revert_movement(movement_id)`.
3. **El outbox anota solo productos enlazados a la web** (`sanity_id` con valor). Lo que no está en la web no se puede copiar; al enlazar un producto (fase 8), se anota su estado completo.
4. **Motivos:** de merma, los cuatro de la maqueta: `broken` (Rota), `expired` (Vencida), `gift` (Regalo) y `other` (Otro). De ajuste: `count` (conteo), `initial` (stock inicial, fase 7) y `undo` (deshacer).
5. **Sin señal, guardar se apaga** y la pantalla lo dice (§14.2: guardar sin señal falla al momento; no queda en espera). Reemplaza «los cambios esperan a que vuelva la señal».
6. **Los textos sobre la web salen solo para productos enlazados:** «Se copian solos a la web», «En la web se ve en unos segundos», «En la web» u «Oculto», «Agotado en la web» y «vuelve a aparecer disponible en la web». Sin enlazar, la app no promete nada de la web.
7. **`list_products` no trae el stock:** Productos y precios no lo muestra, y el stock llega con `stock_overview`. Si Nuevo pedido lo necesita junto, la fase 4 lo suma.
8. **`order_id` en los movimientos llega en la fase 4,** con su llave foránea a `orders`.
9. **`stock_levels` tiene llave `(business_id, product_id)`:** la regla 5 de la prueba de estructura pide un índice que empiece por las columnas de la llave foránea.
10. **Desactivar un producto:** la función de la base, sí (`set_product_active`); el botón en la app, más adelante (la maqueta no lo tiene). Desactivar un producto enlazado anota `isVisible: false` en el outbox; activarlo, su `show_on_web`.

## Restricciones globales

- **Siguen las de las fases 1 y 2:** un solo proyecto (el de desarrollo), la CLI por `pnpm sb`, primero la prueba, una migración enviada no se edita, `private.fail` para los errores de la base.
- **Cada migración:** se prueba con `pnpm test:db` (corre las pendientes dentro de la transacción), se envía con `pnpm db:push` y después se regeneran los tipos con `pnpm db:types`.
- **Funciones que escriben:** la lógica en `private.<nombre>` (`security definer`, `set search_path = ''`, nombres con su esquema); en `public.<nombre>`, una envoltura en `language sql` que la llama. Cada función nueva para la app se agrega a la lista de la regla 8 de `900_structure.test.sql`.
- **Funciones que leen:** en `public`, `stable`, con las reglas de acceso del usuario. Eligen el negocio con `private.current_business_id()` (a la app se le da `execute` sobre ella).
- **Lo aprendido en la fase 1:** las reglas de la tabla repiten las de la función (`CHECK`), cada `CHECK` se prueba también con el valor vacío, y una función que busca una fila comprueba que la encontró (`not_found`).
- **El JSON de las funciones va en camelCase,** como el glosario: `priceCents`, `minStock`, `onHand`, `linkedToWeb`.
- **Idempotencia:** `register_production`, `register_waste` y `register_stock_count` reciben `p_request_id` y usan `private.claim_request` / `private.complete_request`. El celular genera el código una vez por intención y lo repite en cada reintento.
- **Montos:** `public.positive_cents` (precio y costo), hasta 1,000,000 céntimos. **Cantidades:** de 1 a 10,000 por movimiento; un conteo, de 0 a 100,000.
- **Índices de llaves foráneas sin condición** (`where`): la regla 5 no cuenta los parciales.
- **Solo librerías que Expo Go ya trae.** Se instalan con `pnpm add` y la versión exacta de `bundledNativeModules.json` (`expo install` falla con `app.config.ts` dinámico).
- **Textos:** los de la maqueta, en español. Los que la maqueta no tiene, en su estilo, y cada uno con su `Ruling:` en el registro.
- **Teléfonos de prueba:** `+51 900 000 9xx` en las pruebas; los `1xx` son de los datos DEMO.
- **Commits:** en inglés, hasta 100 caracteres y sin cuerpo. Un commit por tarea.

## Fuera de esta fase

- La sugerencia y todo lo que sale de la venta esperada (cambio 1): fase 4.
- Lo apartado de verdad, las ventas y las anulaciones: fase 4, con los pedidos.
- La copia a la web (`sync-to-web`, pg_net y pg_cron) y enlazar los productos: fase 8.
- La bandeja de Inicio (`StockTray`): fase 6, con Inicio.
- El stock inicial de la puesta en marcha: fase 7.
- El botón para desactivar un producto (cambio 10).
- La revisión nocturna (`private.check_consistency`): fase 8, porque avisa por Sentry.

## Foco de revisión

1. **El mismo registro dos veces** (un toque doble, o una respuesta que se perdió y el celular reintenta): con el mismo `request_id`, una sola producción, merma o conteo, y la misma respuesta. → Tarea 4 (base) y tarea 9 (el celular conserva el código hasta que se guarda).
2. **El stock cruza el cero** con un solo movimiento, en los dos sentidos (−3 → +2, 1 → 0, 2 → −1): una fila en el outbox justo en cada cruce, y ninguna si queda del mismo lado (0 → −2, 5 → 3). → Tarea 4.
3. **Deshacer después de otro movimiento** (una producción y después una merma del mismo alfajor): el stock sigue siendo la suma; deshacer otra vez no hace nada; pasados 10 minutos, no se deja. → Tarea 4.
4. **Precios escritos de cualquier forma:** «12,5», «12.50», «0», «0,00», «-5», «abc», «12,345» y vacío. Solo los mayores que cero pasan, en el celular y en la base. → Tareas 1 y 3.
5. **Sin señal** en Stock, Productos y Registrar producción: se ve lo último cargado, con su hora, y los botones de guardar se apagan. → Tareas 7, 8 y 10.

---

### Task 1: Las cuentas de productos y stock

**Archivos:**
- Crear: `src/features/products/` y `src/features/stock/` con `pnpm new:feature products` y `pnpm new:feature stock`.
- Crear: `products/rules/price.ts`, `products/rules/margin.ts`; `stock/schema/stock.ts`; `stock/rules/coverage.ts`, `stock/rules/count.ts`, `stock/rules/production.ts`, `stock/rules/movement.ts`; `stock/constants.ts`. Cada regla con su prueba al lado.
- Modificar: `src/lib/dates.ts` (+ prueba): `formatWeekday` y `formatShortDate`.

**Interfaces:**
- `parsePrice(text: string): number | null`: `parseSoles` y mayor que cero.
- `margin(priceCents: number, costCents: number | null): { cents: number; percent: number } | null`. `percent` redondeado a un decimal.
- `marginLabel(value: { cents: number; percent: number }): string`.
- `stock/schema/stock.ts`: `stockStateSchema = z.enum(["check", "owed", "out", "low", "ok"])`, `type StockState`; `movementKindSchema = z.enum(["production", "sale", "cancellation", "waste", "adjustment"])`, `type MovementKind`; `wasteReasonSchema = z.enum(["broken", "expired", "gift", "other"])`, `type WasteReason`.
- `stockLine(item: { state: StockState; onHand: number; physical: number; minStock: number }): string`. En la fase 4 se le suman las fechas («Alcanza hasta…»).
- `differenceLabel(counted: number, physical: number): string`; `expectedLabel(onHand: number, reserved: number): string`; `countSaveLabel(changes: number): string`.
- `productionTotal(amounts: Record<string, number>): number`; `productionSaveLabel(total: number): string`; `productionSavedText(total: number, backOnWeb: string[]): string`.
- `movementLabel(kind: MovementKind, reason: string | null): string`; `movementTime(happenedAt: Date, now: Date): string`.
- `lib/dates.ts`: `formatWeekday(instant: Date): string` («Lunes») y `formatShortDate(instant: Date): string` («11 nov»), en hora de Lima.
- `stock/constants.ts`: `STOCK_STATE_LABELS: Record<StockState, string>` = check «Revisar», owed «Faltan», out «Agotado», low «Poco», ok «Alcanza»; `WASTE_REASONS` = `[["broken", "Rota"], ["expired", "Vencida"], ["gift", "Regalo"], ["other", "Otro"]] as const`.
- Salen por los `index.ts`: `parsePrice`, `margin`, `marginLabel` (products); las reglas de stock y sus tipos (stock).

- [ ] **Paso 1: Escribir las pruebas que fallan**

`products/rules/price.test.ts`:

```ts
test.each([["12,5", 1250], ["12.50", 1250], ["13", 1300], [" 9,90 ", 990]])("«%s» es %i céntimos", (text, cents) =>
  expect(parsePrice(text)).toBe(cents),
);
test.each(["0", "0,00", "-5", "abc", "12,345", "", "  "])("«%s» no es un precio", (text) => expect(parsePrice(text)).toBeNull());
```

`products/rules/margin.test.ts`:

```ts
test("1200 − 510 → 690, un 57,5 %", () => expect(margin(1200, 510)).toEqual({ cents: 690, percent: 57.5 }));
test("sin costo, no hay dato", () => expect(margin(1200, null)).toBeNull());
test("el texto de la ganancia", () => expect(marginLabel({ cents: 690, percent: 57.5 })).toBe("Ganas S/ 6.90 por alfajor (57,5 %)"));
test("si cuesta más de lo que vale", () => expect(marginLabel(margin(1000, 1200)!)).toBe("Pierdes S/ 2.00 por alfajor"));
```

(`S/ 6.90` lleva el espacio sin corte de `formatCents`.)

`stock/rules/coverage.test.ts`:

```ts
test("en la nevera −2", () => expect(stockLine({ state: "check", onHand: -2, physical: -2, minStock: 6 })).toBe("2 vendidos de más: cuenta y ajusta"));
test("libre −14 y en la nevera 10", () => expect(stockLine({ state: "owed", onHand: -14, physical: 10, minStock: 6 })).toBe("Faltan 14 para pedidos: produce"));
test("stock 0", () => expect(stockLine({ state: "out", onHand: 0, physical: 0, minStock: 6 })).toBe("Sin stock"));
test("poco o alcanza: el mínimo", () => {
  expect(stockLine({ state: "low", onHand: 4, physical: 4, minStock: 6 })).toBe("Mínimo 6");
  expect(stockLine({ state: "ok", onHand: 21, physical: 21, minStock: 6 })).toBe("Mínimo 6");
});
```

`stock/rules/count.test.ts`:

```ts
// Con 11 libres y 2 apartados, debería haber 13 en la nevera
test("se contaron 13: igual", () => expect(differenceLabel(13, 13)).toBe("Igual"));
test("se contaron 12: −1", () => expect(differenceLabel(12, 13)).toBe("−1"));
test("se contaron 15: +2", () => expect(differenceLabel(15, 13)).toBe("+2"));
test("lo que debería haber", () => {
  expect(expectedLabel(11, 2)).toBe("Deberías tener 13 en la nevera (11 libres y 2 apartados para pedidos)");
  expect(expectedLabel(1, 1)).toBe("Deberías tener 2 en la nevera (1 libre y 1 apartado para pedidos)");
  expect(expectedLabel(11, 0)).toBe("Deberías tener 11 en la nevera");
});
test("el botón", () => {
  expect(countSaveLabel(0)).toBe("Sin diferencias");
  expect(countSaveLabel(1)).toBe("Guardar 1 ajuste");
  expect(countSaveLabel(3)).toBe("Guardar 3 ajustes");
});
```

El signo menos es U+2212, como en `lib/money`.

`stock/rules/production.test.ts`:

```ts
test("el total es la suma de lo puesto", () => expect(productionTotal({ a: 36, b: 0, c: 109 })).toBe(145));
test("el botón", () => {
  expect(productionSaveLabel(145)).toBe("Guardar producción: 145 alfajores");
  expect(productionSaveLabel(1)).toBe("Guardar producción: 1 alfajor");
  expect(productionSaveLabel(0)).toBe("Guardar producción");
});
test("lo que dice al guardar", () => {
  expect(productionSavedText(145, [])).toBe("Sumaste 145 alfajores y el stock ya está al día.");
  expect(productionSavedText(20, ["Limon Kiss"])).toBe("Sumaste 20 alfajores y el stock ya está al día. Limon Kiss vuelve a aparecer disponible en la web.");
  expect(productionSavedText(30, ["Coqueta", "Limon Kiss", "Pipo Crush"])).toBe(
    "Sumaste 30 alfajores y el stock ya está al día. Coqueta, Limon Kiss y Pipo Crush vuelven a aparecer disponibles en la web.",
  );
});
```

`stock/rules/movement.test.ts` (hoy es miércoles 18 de noviembre de 2026, 11:40 en Lima = 16:40 UTC):

```ts
const NOW = new Date("2026-11-18T16:40:00Z");
test.each([
  ["2026-11-18T13:10:00Z", "Hoy 08:10"],
  ["2026-11-17T22:30:00Z", "Ayer 17:30"],
  ["2026-11-16T23:00:00Z", "Lunes 18:00"],
  ["2026-11-12T22:30:00Z", "Jueves 17:30"],
  ["2026-11-11T22:30:00Z", "11 nov 17:30"],
  ["2026-11-19T04:59:00Z", "Hoy 23:59"],
])("%s → %s", (iso, text) => expect(movementTime(new Date(iso), NOW)).toBe(text));

test.each([
  ["production", null, "Producción"],
  ["waste", "broken", "Merma: rota"],
  ["waste", "expired", "Merma: vencida"],
  ["waste", "gift", "Merma: regalo"],
  ["waste", "other", "Merma: otro"],
  ["adjustment", "count", "Conteo"],
  ["adjustment", "initial", "Stock inicial"],
  ["adjustment", "undo", "Deshacer"],
  ["sale", null, "Venta"],
  ["cancellation", null, "Pedido anulado"],
])("%s %s → %s", (kind, reason, text) => expect(movementLabel(kind as MovementKind, reason)).toBe(text));
```

La última fila de `movementTime` cuida el día de Lima: 04:59 UTC del 19 todavía es el 18 en Lima. Un día de hasta 6 días atrás se nombra por su día de la semana; desde 7, con su fecha.

En `lib/dates.test.ts`: `formatWeekday(new Date("2026-11-16T23:00:00Z"))` → «Lunes»; `formatShortDate(new Date("2026-11-11T22:30:00Z"))` → «11 nov».

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/features/products src/features/stock src/lib/dates`
Esperado: FALLAN con «Cannot find module» para cada regla, y `formatWeekday is not a function`.

- [ ] **Paso 3: Escribir las reglas, las dos funciones de fechas, `constants.ts` y las exportaciones**

`movementTime` compara los días con `businessDate`; la hora sale de `formatTime`. `expectedLabel` y `differenceLabel` usan el singular cuando el número es 1.

- [ ] **Paso 4: Ver que pasan, con 100 % de cobertura**

Corre: `pnpm test:coverage && pnpm lint && pnpm typecheck`
Esperado: todo pasa; `features/*/rules` y `lib/dates` al 100 %.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add the product and stock rules for prices, margins, counts and production"
```

---

### Task 2: Las tablas de productos y stock

**Archivos:**
- Modificar primero: `docs/spec/products.md`, `docs/spec/stock.md`, `docs/plan/README.md` (filas de las fases 3 y 4, sus días y «Qué pruebas tú») y `docs/glossary.md` (motivos de merma y de ajuste, «Deshacer»): los cambios de arriba.
- Crear: `supabase/migrations/<fecha>_products_stock.sql` (con `pnpm sb migration new products_stock`).
- Prueba: `supabase/tests/070_products_stock_tables.test.sql`.

**Interfaces:**
- `public.products`: `id uuid` llave (`gen_random_uuid()`), `business_id uuid not null` → `businesses`, `name text not null` (`length(btrim(name)) between 1 and 40`), `price_cents public.positive_cents not null` (≤ 1,000,000), `cost_cents public.positive_cents` (≤ 1,000,000), `min_stock integer not null default 0` (0 a 9,999), `show_on_web boolean not null default true`, `is_active boolean not null default true`, `sort_order integer not null default 0`, `sanity_id text` (1 a 100 caracteres), `image_url text` (empieza con `https://`), `version integer not null default 1`, `created_at`, `updated_at`. `unique (business_id, id)`. Índices: único `(business_id, lower(name))`; `(business_id, sort_order) where is_active`; único `(sanity_id) where sanity_id is not null`.
- `public.stock_levels` (`with (fillfactor = 70)`): `business_id`, `product_id`, `on_hand integer not null default 0`, `created_at`, `updated_at`. Llave `(business_id, product_id)`, llave foránea `(business_id, product_id)` → `products (business_id, id)`.
- `public.stock_movements`: `id uuid` llave, `business_id`, `product_id`, `kind text not null`, `quantity integer not null`, `reason text`, `request_id uuid`, `reverts_movement_id uuid`, `happened_at timestamptz not null default now()`, `created_at`, `updated_at`. `unique (business_id, id)`. Llaves foráneas `(business_id, product_id)` → `products` y `(business_id, reverts_movement_id)` → `stock_movements (business_id, id)`. Reglas (`CHECK`):
  - `kind` es uno de los cinco;
  - el signo: positivo en `production` y `cancellation`, negativo en `sale` y `waste`, distinto de cero en `adjustment`;
  - el motivo: en `waste`, uno de `broken`, `expired`, `gift`, `other`; en `adjustment`, uno de `count`, `initial`, `undo`; en los demás, vacío;
  - `reverts_movement_id` con valor si y solo si el motivo es `undo`.
- Índices: `(business_id, product_id, happened_at desc, id desc)` (el historial y su cursor); único `(business_id, reverts_movement_id)` (la llave foránea, y nada se deshace dos veces; los vacíos no chocan); `(business_id, request_id)` (deshacer un registro).
- `private.web_sync_outbox`: `id bigint generated always as identity` llave, `business_id`, `product_id`, `payload jsonb not null` (tiene `priceMinor`, `isAvailable` e `isVisible`, y nada más), `attempts integer not null default 0` (≥ 0), `last_error text`, `sent_at timestamptz`, `created_at timestamptz not null default now()`. Llave foránea `(business_id, product_id)` → `products`. Índices: `(business_id, product_id)` y `(created_at) where sent_at is null`.
- Reglas de acceso: el dueño lee `products`, `stock_levels` y `stock_movements` (como `business_settings_owner_reads`); `grant select` de las tres a `authenticated`. El outbox: reglas activadas, sin políticas ni permisos.
- Triggers: `set_updated_at` en las tres de `public`; `audit_changes('price_cents', 'show_on_web')` después de cada `update` en `products`.
- **El pendiente de la fase 1:** `private.audit_changes()` se reemplaza para que falle (`errcode = 'XX000'`) si le pasan una columna que la fila no tiene.

- [ ] **Paso 1: Escribir la especificación nueva** (los cambios 1 a 10, en sus archivos)

- [ ] **Paso 2: Escribir la prueba que falla**

`070_products_stock_tables.test.sql`, con un negocio de prueba (usuarios `00000000-0000-4000-8000-0000000009a1` y `…9a2`):
- Cada `CHECK` rechaza su caso y también el valor vacío: precio 0, precio vacío, costo 0, nombre «   », nombre de 41 letras, mínimo −1, `image_url` con `http://`; un `waste` positivo, un `production` negativo, un `adjustment` en 0, un `waste` sin motivo, un `waste` con motivo `count`, un `production` con motivo, un `undo` sin `reverts_movement_id`, un `reverts_movement_id` con motivo `count`; un payload sin `isVisible` y uno con una clave de más.
- «Coqueta» y «coqueta» en el mismo negocio chocan; en dos negocios, no.
- El mismo movimiento no se deshace dos veces (dos filas con el mismo `reverts_movement_id` chocan).
- Cambiar el precio deja una fila en `private.audit_log` con el valor de antes y el de después; cambiar el mínimo, ninguna.
- Un trigger `audit_changes('no_existe')` sobre una tabla de prueba falla al actualizar.
- Como el dueño A: lee sus productos, su stock y sus movimientos, y ninguno del negocio B; no puede insertar en ninguna de las tres (`42501`) ni leer el outbox.

- [ ] **Paso 3: Correrla y ver que falla**

Corre: `pnpm test:db`
Esperado: FALLA `070` (`relation "public.products" does not exist`).

- [ ] **Paso 4: Escribir la migración**

- [ ] **Paso 5: Ver que pasan todas las de la base**

Corre: `pnpm test:db`
Esperado: todas pasan, también `900_structure` (reglas de acceso, `updated_at`, índices de las llaves foráneas) y `910_plpgsql_check`.

- [ ] **Paso 6: Enviar la migración y regenerar los tipos**

Corre: `pnpm db:push && pnpm db:types && pnpm typecheck`
Esperado: la migración queda enviada y `src/types/database.ts` trae las tres tablas.

- [ ] **Paso 7: Commit**

```bash
git add -A
git commit -m "feat: add the products, stock levels, stock movements and web outbox tables"
```

---

### Task 3: Las funciones de productos

**Archivos:**
- Crear: `supabase/migrations/<fecha>_product_functions.sql`
- Prueba: `supabase/tests/071_products.test.sql`
- Modificar: `supabase/tests/900_structure.test.sql` (regla 8)

**Interfaces:**
- `private.product_json(p public.products) returns jsonb` (`stable`, `sql`): `{ id, name, priceCents, costCents, minStock, showOnWeb, isActive, sortOrder, imageUrl, linkedToWeb, version }`. `linkedToWeb` es `sanity_id is not null`; el `sanity_id` no sale.
- `public.list_products() returns jsonb`: los activos del negocio, en una lista, por `sort_order`, `lower(name)` e `id`. Sin productos, `[]`.
- `public.save_product(p_id uuid, p_expected_version integer, p_name text, p_price_cents integer, p_cost_cents integer, p_min_stock integer, p_show_on_web boolean) returns jsonb` → `private.save_product(…)`. Devuelve `product_json`.
  - Crear: `p_id` y `p_expected_version` vacíos; `sort_order` = el mayor del negocio + 1.
  - Cambiar: busca la fila con `for update` (si no está en el negocio, `not_found`); sin versión, `invalid`; con otra versión, `conflict`; `version + 1`.
  - Valida antes de guardar (`invalid`): nombre (sin espacios a los lados) de 1 a 40 letras, precio de 1 a 1,000,000, costo vacío o de 1 a 1,000,000, mínimo de 0 a 9,999 y `p_show_on_web` con valor.
  - Un nombre repetido (sin importar mayúsculas) responde `conflict`.
  - Si cambió el precio o `show_on_web`, y el producto está enlazado, una fila en el outbox: `{ priceMinor: precio, isAvailable: stock > 0, isVisible: show_on_web }` (el stock, de `stock_levels`; sin fila, 0).
- `public.set_product_active(p_id uuid, p_active boolean) returns jsonb` → `private.set_product_active(…)`. `not_found` y `invalid` como arriba. Si está enlazado: desactivar anota `isVisible: false`; activar, su `show_on_web`.
- La app ejecuta: `list_products()`, `save_product(…)`, `set_product_active(…)`, `private.product_json(products)`, `private.current_business_id()` y las dos privadas de escritura (como `update_settings`).

- [ ] **Paso 1: Escribir la prueba que falla**

`071_products.test.sql`, como el dueño de un negocio de prueba:
- Crear «Coqueta» a 1200: versión 1, `sortOrder` 1, `linkedToWeb` falso; «Morenita» queda con `sortOrder` 2.
- Rechazos (`invalid`): precio 0, −5 y vacío; costo 0; nombre «  » y de 41 letras; mínimo −1; `p_show_on_web` vacío; cambiar sin versión.
- «coqueta» otra vez → `conflict`. Cambiar con una versión vieja → `conflict`. Cambiar el producto de otro negocio → `not_found`.
- Precio a 1300 en un producto enlazado (el `sanity_id` se pone como `postgres`): una fila en el outbox con `{"priceMinor": 1300, "isAvailable": false, "isVisible": true}`. Solo el mínimo: ninguna fila más. El mismo cambio en un producto sin enlazar: ninguna.
- `list_products()` no trae los desactivados ni los de otro negocio; desactivar un producto enlazado deja `isVisible: false`, y activarlo, `true`.
- La app no escribe en `products` directo (`42501`).

- [ ] **Paso 2: Correrla y ver que falla**

Corre: `pnpm test:db`
Esperado: FALLA `071` (`function public.save_product(…) does not exist`) y `900` sigue pasando.

- [ ] **Paso 3: Escribir la migración y sumar las funciones a la regla 8**

- [ ] **Paso 4: Ver que pasan todas**

Corre: `pnpm test:db`
Esperado: todas pasan.

- [ ] **Paso 5: Enviar, regenerar los tipos y commit**

```bash
pnpm db:push && pnpm db:types && pnpm typecheck
git add -A
git commit -m "feat: add the product functions with versions, the web outbox and the audit log"
```

---

### Task 4: Las funciones del stock

**Archivos:**
- Crear: `supabase/migrations/<fecha>_stock_functions.sql`
- Prueba: `supabase/tests/080_stock.test.sql`, `supabase/tests/081_stock_random.test.sql`
- Modificar: `supabase/tests/900_structure.test.sql` (regla 8)

**Interfaces:**
- `private.reserved_stock(p_business_id uuid) returns table (product_id uuid, reserved integer)` (`stable`, `sql`). En esta fase no devuelve filas (`where false`), con el comentario «fase 4: los alfajores de los pedidos sin entregar ni anular».
- `private.move_stock(p_business_id uuid, p_product_id uuid, p_kind text, p_quantity integer, p_reason text, p_request_id uuid, p_reverts uuid) returns integer`: crea el movimiento, suma a `stock_levels` (`insert … on conflict … do update … returning on_hand`) y devuelve el stock nuevo. Si el stock pasó de ≤ 0 a > 0, o al revés, y el producto está enlazado: una fila en el outbox con `{ priceMinor, isAvailable: nuevo > 0, isVisible: show_on_web and is_active }`. La app no la ejecuta.
- `public.stock_overview() returns jsonb`: una lista con un objeto por producto activo, por `sort_order`: `{ productId, name, imageUrl, linkedToWeb, minStock, onHand, reserved, physical, state }`. `physical = onHand + reserved`. El estado: `check` si `physical < 0`; `owed` si `onHand < 0`; `out` si `onHand = 0`; `low` si `onHand <= minStock`; si no, `ok`.
- `public.register_production(p_request_id uuid, p_items jsonb) returns jsonb` → `private.…`. `p_items`: de 1 a 50 objetos `{ productId, quantity }`, sin productos repetidos, cada uno activo y del negocio (si no, `not_found`), `quantity` de 1 a 10,000. Devuelve `{ total, items: [{ productId, onHand }], backOnWeb: [{ productId, name }] }`; `backOnWeb` lleva solo los enlazados que pasaron de ≤ 0 a > 0.
- `public.register_waste(p_request_id uuid, p_product_id uuid, p_quantity integer, p_reason text) returns jsonb` → `{ productId, onHand, outOnWeb }`. `outOnWeb`: enlazado y pasó de > 0 a ≤ 0.
- `public.register_stock_count(p_request_id uuid, p_counts jsonb) returns jsonb`. `p_counts`: de 1 a 50 objetos `{ productId, counted }`, `counted` de 0 a 100,000. Por cada uno: ajuste = contado − (libre + apartado), con motivo `count`, solo si no es cero. Devuelve `{ adjustments, items: [{ productId, onHand }], backOnWeb, outOnWeb }` (las dos listas como arriba).
- Los tres registros procesan los productos ordenados por `productId`: así dos operaciones a la vez bloquean las filas en el mismo orden.
- `public.revert_stock_change(p_request_id uuid) returns jsonb`: deshace los movimientos de ese registro que no se deshicieron (`for update` sobre ellos), con un `adjustment` contrario de motivo `undo` que apunta a cada uno. Sin movimientos de ese registro en el negocio, `not_found`; si alguno se creó hace más de 10 minutos, `invalid`. Devuelve `{ reverted, items: [{ productId, onHand }] }`; la segunda vez, `reverted: 0`.
- `public.list_product_movements(p_product_id uuid, p_limit integer default 20, p_cursor text default null) returns jsonb`: `{ items: [{ id, kind, quantity, reason, happenedAt }], meta: { limit, total, hasMore, nextCursor } }`, del más nuevo al más viejo (`happened_at desc, id desc`). `limit` vacío es 20; mayor que 50 queda en 50; menor que 1, `invalid`. El cursor es opaco: `happened_at` e `id` en base64; uno que no se puede leer, `invalid`.
- La app ejecuta las seis públicas, las privadas de escritura que llaman y `private.reserved_stock`.

- [ ] **Paso 1: Escribir las pruebas que fallan**

`080_stock.test.sql`, como el dueño de un negocio de prueba con «Coqueta» (enlazada), «Morenita» y «Limon Kiss» (sin enlazar):
- **Producción:** 10 Coqueta y 5 Morenita → `total` 15; Coqueta pasa de 0 a 10 y sale en `backOnWeb`, con una fila del outbox `isAvailable: true`; Morenita no sale (sin enlazar).
- **El mismo `request_id` dos veces:** una sola producción, la misma respuesta, el mismo stock.
- **Rechazos:** cantidad 0, un producto repetido en la lista, un producto de otro negocio (`not_found`), una lista vacía.
- **Merma:** sin motivo y con `perdida` → `invalid`; con 2 de stock, una merma de 3 deja −1 (D12); Coqueta de 1 a 0 → `outOnWeb` y una fila `isAvailable: false`; de 2 a −1, también; de 0 a −2, ninguna.
- **Cruces:** de −3, una producción de 5 → una fila; de 5, una merma de 2 → ninguna.
- **Conteo:** con 11, contar 11 → 0 ajustes; contar 12 → un ajuste +1 (`count`); contar 0 → −11.
- **Lo apartado:** como `postgres`, `private.reserved_stock` se reemplaza dentro de la prueba para devolver 2 apartados de Coqueta; con 11 libres, contar 13 no crea ningún ajuste.
- **Estados** (con `reserved_stock` reemplazada cuando hace falta): en la nevera −2 → `check`; libre −14 con 24 apartados → `owed`; 0 → `out`; 5 y 6 con mínimo 6 → `low`; 7 con mínimo 6 → `ok`; 3 con mínimo 0 → `ok`.
- **Deshacer:** producir 10 y deshacer → el stock vuelve; deshacer otra vez → `reverted: 0`; un `request_id` desconocido → `not_found`; un registro de hace 11 minutos (su `created_at` se cambia como `postgres`) → `invalid`; producir 10, anotar una merma de 3 y deshacer la producción → −3, la suma de los tres movimientos.
- **Historial:** con 25 movimientos de un alfajor, la primera página trae 20, `hasMore` y `total` 25; la segunda, con su cursor, 5 y `nextCursor` vacío; `p_limit` 100 trae 25 con `limit` 50; `p_limit` 0 y el cursor «zzz» → `invalid`.
- **Permisos:** la app no ejecuta `private.move_stock` (`42501`).

`081_stock_random.test.sql`: con `setseed(0.42)`, 300 operaciones al azar (producción, merma, conteo y deshacer) sobre 4 productos, por las funciones públicas y como el dueño; al final, para cada producto, `stock_levels.on_hand` es igual a la suma de sus movimientos.

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test:db`
Esperado: FALLAN `080` y `081` (`function public.register_production(…) does not exist`).

- [ ] **Paso 3: Escribir la migración y sumar las funciones a la regla 8**

- [ ] **Paso 4: Ver que pasan todas**

Corre: `pnpm test:db`
Esperado: todas pasan.

- [ ] **Paso 5: Enviar, regenerar los tipos y commit**

```bash
pnpm db:push && pnpm db:types && pnpm typecheck
git add -A
git commit -m "feat: add the stock functions for production, waste, counts, undo and history"
```

---

### Task 5: El medidor, con productos y años de movimientos

**Archivos:**
- Modificar: `supabase/perf/seed.sql`, `supabase/perf/cases.mjs`

**Interfaces:**
- **Datos:** 5 productos en cada uno de los 5,000 negocios; 20 movimientos por producto en todos, y el negocio medido con 3 años de movimientos diarios (dos por día y por producto: unos 11,000). `stock_levels` = la suma de los movimientos. `analyze` de las tablas nuevas.
- **Casos** (50 ms y sin leer enteras `products`, `stock_levels` ni `stock_movements`): `stock_overview`, `list_products`, la primera página de `list_product_movements` y una página con cursor, `register_production` de los 5 productos, y leer cada una de las tres tablas con las reglas de acceso.

- [ ] **Paso 1: Sumar los datos y los casos**

- [ ] **Paso 2: Medir**

Corre: `pnpm db:perf && pnpm db:perf --self-test`
Esperado: todos los casos por debajo de 50 ms y sin lecturas enteras; el caso hecho para fallar, falla.

Si un caso pasa del tiempo o lee una tabla entera, se agrega el índice que falta en una migración nueva, con su prueba.

- [ ] **Paso 3: Commit**

```bash
git add -A
git commit -m "test: measure the product and stock functions with years of movements"
```

---

### Task 6: Las piezas comunes de la pantalla

**Archivos:**
- Instalar: `pnpm add @shopify/flash-list@2.3.2 expo-haptics@~58.0.8`
- Crear (cada uno con su prueba): `src/components/ui/sheet.tsx`, `stepper.tsx`, `toast.tsx`, `chip.tsx`, `skeleton.tsx`, `load-error.tsx`; `src/lib/haptics.ts`, `src/lib/page.ts`.
- Modificar: `jest.setup.js` (simular expo-haptics; FlashList, si en Jest no pinta sus filas, se simula con `FlatList` y un comentario que diga por qué).

**Interfaces:**
- `Sheet({ visible, title, onClose, children })`: un `Modal` de React Native (`transparent`, `animationType="slide"`), con el fondo como botón «Cerrar» y el título como encabezado. Respeta el borde de abajo del celular.
- `Stepper({ value, onChange, label, min = 0, max = 10_000 })`: «−», el número y «+», con los nombres «Menos {label}» y «Más {label}»; en el límite, el botón se apaga.
- `Toast({ message, actionLabel, onAction, onHide, duration = 6000 })`: `accessibilityRole="alert"`; se oculta solo a los `duration` ms; si tiene acción, la muestra a la derecha.
- `Chip({ label, selected, onPress })`, con `accessibilityState={{ selected }}`.
- `SkeletonRows({ rows })`.
- `LoadError({ what, onRetry })`: «No se pudo cargar {what}», «Revisa tu conexión y vuelve a intentar. Si sigue igual, escribe a soporte.» y «Reintentar» (la maqueta, `pantallaError`).
- `lib/haptics.ts`: `confirmTap(): void`, una vibración corta de éxito; si falla, no hace nada.
- `lib/page.ts`: `pageSchema<T>(item: z.ZodType<T>)` y `type Page<T> = { items: T[]; meta: { limit: number; total: number; hasMore: boolean; nextCursor: string | null } }` (§14.3).

- [ ] **Paso 1: Escribir las pruebas que fallan**

Lo que prueban: la hoja se cierra con «Cerrar»; el contador suma, resta y se apaga en 0 y en el máximo; el aviso llama a la acción y se oculta a los 6 s (temporizadores falsos); el chip avisa si está elegido; el error llama a «Reintentar»; `pageSchema` acepta una página y rechaza una sin `meta`.

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/components/ui src/lib`
Esperado: FALLAN con «Cannot find module» para cada pieza nueva.

- [ ] **Paso 3: Escribir las piezas**

- [ ] **Paso 4: Ver que pasan**

Corre: `pnpm test && pnpm lint && pnpm typecheck`
Esperado: todo pasa.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add the sheet, stepper, toast, chip, skeleton and load error pieces"
```

---

### Task 7: Productos y precios

**Archivos:**
- Crear en `src/features/products/`: `schema/product.ts`, `api/products.ts`, `queries/keys.ts`, `queries/products.ts`, `queries/mutations.ts`, `components/product-avatar.tsx`, `product-row.tsx`, `product-sheet.tsx`, `new-product-sheet.tsx`, `product-list.tsx`, `products-link.tsx`, con sus pruebas.
- Crear: `src/app/(main)/more/products.tsx`. Modificar: `src/app/(main)/more/index.tsx` (el grupo «Ajustes» con la fila de productos).

**Interfaces:**
- `productSchema` (Zod, los nombres de `product_json`) y `type Product`.
- `listProducts(): Promise<Product[]>`; `saveProduct(input: { id: string | null; expectedVersion: number | null; name: string; priceCents: number; costCents: number | null; minStock: number; showOnWeb: boolean }): Promise<Product>`. Validan la respuesta con Zod y convierten los errores con `toAppError`.
- `productKeys = { all: ["products"], list: ["products", "list"] }`; `productsQuery` (`staleTime: STALE_TIME.catalog`); `saveProductMutation` (`meta: { invalidates: [productKeys.all] }`). Cambiar un precio espera la respuesta con «Guardando…» (§14.2: se copia a la web).
- `ProductAvatar({ product, size })`: la foto con expo-image si hay `imageUrl`; si no, las iniciales sobre un color del tema elegido por el nombre.
- `ProductList()`: la pantalla entera. `ProductsLink({ onPress })`: la fila «Productos y precios» con «{n} alfajores».
- Salen por `index.ts`: `ProductAvatar`, `ProductList`, `ProductsLink`, `productsQuery` y el tipo `Product`.
- **Textos** (maqueta, `productos`):
  - la fila: el precio y «Mínimo 6, cuesta S/ 5.10» o «Mínimo 6, cuesta sin definir»; «En la web» u «Oculto» solo si está enlazado;
  - si hay alguno enlazado: el subtítulo «Se copian solos a la web» y el aviso «El precio y si está disponible se ven en la web en unos segundos. Las fotos y descripciones se cambian en el panel de la web.»;
  - la hoja: el nombre, «Precio», «Costo aproximado» (con «Para ver tu ganancia» de ejemplo), y debajo `marginLabel` si hay costo; «Stock mínimo» con el contador; «Mostrar en la web» con «Si lo apagas, desaparece de la web.»; «Los pedidos ya anotados mantienen su precio.»; «Guardar»;
  - al guardar: «Coqueta guardado: S/ 12.00.» y, si está enlazado, « En la web se ve en unos segundos.»;
  - «Agregar producto»: una hoja con «Nombre» y «Precio»; al guardar, «Coqueta agregado: S/ 12.00.»; con `conflict`, «Ya tienes un producto con ese nombre.»;
  - un precio que no sirve: «Escribe un precio mayor que cero.»;
  - sin señal: «Sin conexión. Para cambiar precios, espera la señal.» y «Guardar» apagado;
  - cargando: `SkeletonRows`; error: `LoadError` con «tus productos».

- [ ] **Paso 1: Escribir las pruebas que fallan**

Con la `api` simulada: la lista muestra cada producto con su línea; «En la web» solo en el enlazado; cambiar el precio a «12,50» llama `saveProduct` con `priceCents: 1250` y la versión, y muestra el aviso de guardado; «0» muestra «Escribe un precio mayor que cero.» y no guarda; `conflict` al agregar muestra «Ya tienes un producto con ese nombre.»; sin señal, «Guardar» está apagado; la fila de Más dice «5 alfajores» y lleva a `/more/products` (con las rutas de verdad, en `src/test/routes/products.test.tsx`).

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/features/products src/test/routes/products`
Esperado: FALLAN con «Cannot find module».

- [ ] **Paso 3: Escribir el módulo, la pantalla y la fila de Más**

- [ ] **Paso 4: Ver que pasan**

Corre: `pnpm test && pnpm lint && pnpm typecheck`
Esperado: todo pasa.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add the products and prices screen with its edit and new product sheets"
```

---

### Task 8: La pantalla de Stock

**Archivos:**
- Crear en `src/features/stock/`: `schema/stock.ts` (sumar `stockItemSchema`), `api/stock.ts`, `queries/keys.ts`, `queries/stock.ts`, `components/state-chip.tsx`, `stock-row.tsx`, `stock-overview.tsx`, con sus pruebas.
- Crear: `src/app/(main)/stock/_layout.tsx` (un `Stack` sin encabezado). Modificar: `src/app/(main)/stock/index.tsx` y `src/app/(main)/_layout.tsx` (con su `_layout`, la pestaña pasa a llamarse `stock`, como `more`).

**Interfaces:**
- `stockItemSchema` (los nombres de `stock_overview`) y `type StockItem`.
- `getStockOverview(): Promise<StockItem[]>`.
- `stockKeys = { all: ["stock"], overview: ["stock", "overview"], movements: (productId: string) => ["stock", "movements", productId] }`; `stockOverviewQuery` (`staleTime: STALE_TIME.live`). La pantalla recarga al volver a ella (`useFocusEffect`) y al tirar hacia abajo (`RefreshControl`).
- `StockOverview()`: la pantalla entera. La fila usa `ProductAvatar` (por el `index.ts` de products), `stockLine`, el número grande y `StateChip`; si está enlazada, «Agotado en la web» con stock ≤ 0 o «Ya disponible en la web» si volvió con la última producción. Tocarla lleva a `/stock/<productId>`.
- **Textos** (maqueta, `stock`): «Stock», «Actualizado a las 11:40» (la hora en que llegaron los datos), «Contar stock», «Anotar merma» y «Registrar producción»; sin productos: «Todavía no hay productos», «Agrega tus alfajores con su precio en Ajustes para empezar a llevar el stock.» e «Ir a Ajustes» (lleva a `/more/products`); sin señal: «Sin conexión. Ves el stock de las 11:32; para registrar, espera la señal.», con los tres botones apagados; error: `LoadError` con «el stock».

- [ ] **Paso 1: Escribir las pruebas que fallan**

Con la `api` simulada: cada fila muestra su línea y su estado («Revisar», «Faltan», «Agotado», «Poco», «Alcanza»); «Agotado en la web» solo en la enlazada sin stock; sin productos, el vacío con «Ir a Ajustes»; sin señal, el aviso con la hora y los botones apagados; tocar una fila navega a su alfajor (rutas de verdad, `src/test/routes/stock.test.tsx`).

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/features/stock src/test/routes/stock`
Esperado: FALLAN con «Cannot find module».

- [ ] **Paso 3: Escribir la consulta, las piezas y la pantalla**

- [ ] **Paso 4: Ver que pasan**

Corre: `pnpm test && pnpm lint && pnpm typecheck`
Esperado: todo pasa.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add the stock screen with each product's state and web status"
```

---

### Task 9: Anotar merma y contar el stock

**Archivos:**
- Crear en `src/features/stock/`: en `api/stock.ts`, `registerWaste`, `registerStockCount` y `revertStockChange`; `queries/mutations.ts`; `hooks/use-request-id.ts`; `components/waste-sheet.tsx`, `count-sheet.tsx`, con sus pruebas.
- Modificar: `components/stock-overview.tsx` (abre las hojas y muestra el aviso con «Deshacer»).

**Interfaces:**
- `registerWaste(input: { requestId: string; productId: string; quantity: number; reason: WasteReason }): Promise<{ productId: string; onHand: number; outOnWeb: boolean }>`; `registerStockCount(input: { requestId: string; counts: { productId: string; counted: number }[] }): Promise<{ adjustments: number; items: { productId: string; onHand: number }[] }>`; `revertStockChange(requestId: string): Promise<{ reverted: number }>`.
- `useRequestId(): { requestId: string; renew: () => void }`: un código por intención (`randomUUID` de expo-crypto). Se renueva solo después de guardar bien; si falla, el reintento usa el mismo.
- Mutaciones con respuesta al instante (§14.2): `onMutate` cambia `onHand` en `stockKeys.overview` (y recalcula `physical`), `onError` vuelve atrás, `onSettled` refresca `stockKeys.all`. `scope: { id: "stock" }`: van en fila. Al guardar bien, `confirmTap()`.
- `WasteSheet({ productId, onDone })`: desde Stock, `productId` vacío y chips con los alfajores; cantidad con el contador (empieza en 1); el motivo es obligatorio: «Guardar merma» se apaga hasta elegir uno.
- `CountSheet({ productIds, onDone })`: una fila por alfajor con `expectedLabel`, `differenceLabel` y el contador (empieza en lo que debería haber, nunca menos de 0); el botón dice `countSaveLabel(cambios)` y se apaga sin cambios. Se envían todos los contados.
- **Textos** (maqueta, `hojaMerma` y `hojaConteo`): «Anotar merma», «Alfajor», «Motivo» (Rota, Vencida, Regalo, Otro), «Guardar merma»; «Contar stock», «Pon lo que hay de verdad. La diferencia queda anotada como ajuste.». Los avisos (no están en la maqueta): «Merma anotada: 2 Coqueta.», «Conteo guardado: 3 ajustes.» y, después de «Deshacer», «Listo, se deshizo.».

- [ ] **Paso 1: Escribir las pruebas que fallan**

- `use-request-id`: el código no cambia entre renders ni tras un error; cambia con `renew`.
- La hoja de merma: sin motivo, «Guardar merma» está apagado; con Coqueta, 2 y «Rota», llama `registerWaste` con `reason: "broken"`; el stock baja al instante y vuelve si la API falla; si la primera vez falla por red, el reintento manda el mismo `requestId`.
- La hoja de conteo: con 11 libres, poner 12 dice «+1» y «Guardar 1 ajuste»; guarda con `counted: 12`.
- El aviso: «Deshacer» llama `revertStockChange` con el `requestId` de la merma.
- Los recorridos con las rutas de verdad (en `src/test/routes/stock.test.tsx`, el de la tarea 8): anotar una merma y contar el stock desde Stock.

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/features/stock`
Esperado: FALLAN con «Cannot find module» para las hojas y el hook.

- [ ] **Paso 3: Escribir la API, las mutaciones, el hook y las hojas**

- [ ] **Paso 4: Ver que pasan**

Corre: `pnpm test && pnpm lint && pnpm typecheck`
Esperado: todo pasa.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add the waste and stock count sheets with instant updates and undo"
```

---

### Task 10: Registrar producción

**Archivos:**
- Crear en `src/features/stock/`: en `api/stock.ts`, `registerProduction`; en `queries/mutations.ts`, su mutación; `components/production-form.tsx`, `production-saved.tsx`, con sus pruebas.
- Crear: `src/app/(main)/stock/production.tsx`.

**Interfaces:**
- `registerProduction(input: { requestId: string; items: { productId: string; quantity: number }[] }): Promise<{ total: number; items: { productId: string; onHand: number }[]; backOnWeb: { productId: string; name: string }[] }>`. Espera la respuesta («Guardando…»): la pantalla de después necesita saber qué vuelve a la web.
- `ProductionForm()`: una fila por alfajor del stock con «Anota cuántos hiciste» y el contador (empieza en 0); arriba, el aviso «Todavía no hay ventas suficientes para sugerir. Anota lo que hiciste y desde la próxima semana la app sugiere sola.»; abajo, fijo, `productionSaveLabel(total)`, apagado en 0 y sin señal. Solo se envían los alfajores con más de 0.
- `ProductionSaved({ total, backOnWeb, onUndo })`: «Producción guardada», `productionSavedText(total, nombres)`, «Ver stock» y «Deshacer». Deshacer vuelve al formulario vacío con el aviso «Producción deshecha.».
- El encabezado: «Registrar producción» y «Hoy, miércoles 18 de noviembre» (`formatLongDate`).
- El código del registro sale de `useRequestId` (tarea 9): el mismo en cada reintento, y para «Deshacer».

- [ ] **Paso 1: Escribir las pruebas que fallan**

Con la `api` simulada: poner 10 en Coqueta y 5 en Morenita dice «Guardar producción: 15 alfajores» y guarda solo esos dos; la pantalla de después dice «Sumaste 15 alfajores y el stock ya está al día. Coqueta vuelve a aparecer disponible en la web.» cuando `backOnWeb` trae a Coqueta; «Deshacer» llama `revertStockChange` con el mismo `requestId`; sin señal, el botón está apagado. El recorrido con las rutas de verdad (`src/test/routes/production.test.tsx`): Stock → Registrar producción → guardar → Deshacer.

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/features/stock src/test/routes/production`
Esperado: FALLAN con «Cannot find module».

- [ ] **Paso 3: Escribir la mutación, las piezas y la pantalla**

- [ ] **Paso 4: Ver que pasan**

Corre: `pnpm test && pnpm lint && pnpm typecheck`
Esperado: todo pasa.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add the production screen with its saved summary and undo"
```

---

### Task 11: Un alfajor

**Archivos:**
- Crear en `src/features/stock/`: en `api/stock.ts`, `listProductMovements`; en `queries/stock.ts`, `productMovementsQuery`; `components/movement-row.tsx`, `movement-list.tsx`, `product-stock.tsx`, con sus pruebas.
- Crear: `src/app/(main)/stock/[productId].tsx`.

**Interfaces:**
- `listProductMovements(input: { productId: string; cursor: string | null }): Promise<Page<Movement>>`, con `movementSchema` (`happenedAt` como `Date`).
- `productMovementsQuery(productId)`: `infiniteQueryOptions` con `getNextPageParam: (last) => (last.meta.hasMore ? last.meta.nextCursor : undefined)` y `maxPages: 10`.
- `ProductStock({ productId })`: arriba, `ProductAvatar` grande, `StateChip` y la línea de la web (si está enlazado: «Agotado en la web» o «Disponible en la web»); los números «en stock» y «mínimo», tomados de `stockOverviewQuery` con `select`; «Movimientos» en una `FlashList` que pide la página siguiente al llegar al final, con una fila de skeleton mientras carga y «Mostrando 20 de 148»; abajo, «Contar stock» y «Anotar merma», con las hojas de la tarea 9 solo para este alfajor.
- `MovementRow`: el ícono por tipo, `movementLabel`, `movementTime` y la cantidad con signo («+20», «−1»).
- El encabezado: el nombre y el precio (el precio sale de `productsQuery`, por el `index.ts` de products: la pantalla une los dos módulos).

- [ ] **Paso 1: Escribir las pruebas que fallan**

Con la `api` simulada: la primera página muestra 20 movimientos con su texto y su hora, y «Mostrando 20 de 25»; al llegar al final pide la segunda con el cursor; «Anotar merma» abre la hoja con el alfajor ya elegido; un alfajor que no está en el stock muestra `LoadError`.

- [ ] **Paso 2: Correrlas y ver que fallan**

Corre: `pnpm test src/features/stock`
Esperado: FALLAN con «Cannot find module».

- [ ] **Paso 3: Escribir la consulta, las piezas y la pantalla**

- [ ] **Paso 4: Ver que pasan**

Corre: `pnpm test && pnpm lint && pnpm typecheck`
Esperado: todo pasa.

- [ ] **Paso 5: Commit**

```bash
git add -A
git commit -m "feat: add the single product screen with its paged movements"
```

---

### Task 12: Los datos DEMO, la revisión completa y el cierre

**Archivos:**
- Crear: `scripts/demo-data.mjs` (`pnpm demo:data`) y `scripts/lib/demo-catalog.mjs` con su prueba.
- Modificar: `package.json`, `CLAUDE.md` (el comando nuevo), `docs/plan/README.md` (estado), este plan («Resultado», «Lo que falta» y «Lo que cambió»).

**Interfaces:**
- `DEMO_CATALOG`: los cinco alfajores confirmados (`PROJECT_CONTEXT.md` §7), con los nombres cortos de la maqueta: Coqueta 1200, Morenita 1200, Limon Kiss 1200, Manteadita 1200 y Pipo Crush 1300. Mínimos DEMO 6, 6, 5, 6 y 4; costo vacío (no está confirmado); stock DEMO 13, 4, 0, 21 y 3.
- `pnpm demo:data`: solo contra el proyecto de desarrollo (la protección de `scripts/lib/guard.mjs`). Busca al dueño DEMO por `DEMO_OWNER_PHONE` y, como él (como `tests.login_as`), crea los productos que falten con `save_product` y, si todo su stock está en 0, cuenta el stock DEMO con `register_stock_count`. Correrlo dos veces no duplica nada.

- [ ] **Paso 1: Escribir la prueba del catálogo** (cinco productos, precios positivos, nombres sin repetir) **y verla fallar**

Corre: `node --test scripts/lib/demo-catalog.test.mjs`
Esperado: FALLA con «Cannot find module».

- [ ] **Paso 2: Escribir el catálogo y el script, y cargar los datos**

Corre: `pnpm demo:data && pnpm demo:data`
Esperado: la primera vez, «5 productos creados y el stock DEMO contado»; la segunda, «Nada que hacer».

- [ ] **Paso 3: La revisión completa**

Corre: `pnpm lint && pnpm lint:rules && pnpm typecheck && pnpm test:coverage && pnpm test:scripts && pnpm db:check`
Esperado: todo pasa.

- [ ] **Paso 4: Documentar y commit**

```bash
git add -A
git commit -m "docs: record phase 3 results, the demo catalog and the phone test"
```

**Lo que pruebas tú en el celular** (va en «Lo que falta»):
1. Más → Productos y precios: cambia Coqueta a S/ 12.50 y guarda; la lista muestra el precio nuevo.
2. Stock: cada alfajor con su estado; Limon Kiss, «Agotado».
3. Registrar producción: pon 10 en Limon Kiss y guarda; mira «Producción guardada» y toca «Deshacer».
4. Anotar merma: 1 Morenita, «Rota»; en el aviso, toca «Deshacer».
5. Contar stock: cambia un número; el botón dice «Guardar 1 ajuste».
6. Toca Coqueta: sus movimientos, del más nuevo al más viejo.
7. Con el modo avión: Stock dice «Sin conexión…» con la hora, y los botones se apagan.
