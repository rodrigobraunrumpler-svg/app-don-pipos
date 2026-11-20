# Fase 4a: pedidos, anotar y entregar — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que el dueño anote un pedido de punta a punta (alfajores, cliente por su teléfono, entrega, pago), lo siga por estado hasta entregarlo, cobre lo que falta, venda en el mostrador y avise al cliente por WhatsApp con un toque. El stock aparta los alfajores de los pedidos en curso.

**Arquitectura:** una migración de tablas (clientes, pedidos, líneas, estados, pagos y plantillas) y tres de funciones: crear (pedido y venta de mostrador), avanzar y cobrar, y leer. Todo pasa por funciones de la base con idempotencia y huella (fase 3); `create_order` asigna el número bloqueando el contador del negocio, congela precios y nombres, resta el stock con movimientos `sale` y mantiene los totales del cliente. En el celular, tres módulos nuevos (`orders`, `customers`, `messages`), la pestaña Pedidos con su propio Stack (lista, Nuevo pedido, Un pedido, Venta de mostrador) y el botón + con su menú.

**Stack:** Postgres (plpgsql, pgTAP, una prueba de dos conexiones), supabase-js `rpc`, TanStack Query 5 (`infiniteQueryOptions` para «Todos»), Zod, AsyncStorage (el borrador), `Linking` de React Native (el enlace `wa.me`).

**Especificación:** `docs/spec/orders.md`, `docs/spec/customers.md` (el registro por teléfono), `docs/spec/messages.md` (los textos por defecto), `docs/spec/businesses.md` (medios de pago y delivery), `docs/spec/stock.md` (lo apartado), `docs/spec/README.md`, `docs/PROJECT_CONTEXT.md` (D8–D12, D14, D17, §6, §14.2–14.4), `docs/glossary.md` y la maqueta: `assets/donpipos.js` (`filaPedido`, `pedido1`, `pedido2`, `guardado`, `hojaNuevo`) y `assets/donpipos-2.js` (`MENSAJES_BASE`, `contexto`, `PANTALLAS.pedidos`, `PANTALLAS.pedido`, `PANTALLAS.venta`).

## Lo que entra y lo que queda para la 4b

- **Entra:** clientes por teléfono (registro y «Repetir el último pedido»), Nuevo pedido en dos pasos con su borrador, Pedido guardado con el mensaje de confirmación, la lista de pedidos (filtros con su cantidad, búsqueda, «Hoy» en dos grupos, «Todos» por páginas), Un pedido (línea de tiempo, el siguiente estado con «Deshacer», pagos, el mensaje de cada estado), la venta de mostrador, los textos de WhatsApp por defecto, lo apartado real en el stock y el menú del botón +.
- **Queda para la 4b:** editar y anular (con devolución) y sus «Deshacer», el «Deshacer» de la venta de mostrador (es anularla), cambiar el medio de pago, Por cobrar (la pantalla y «Recordar»), y la sugerencia de producción con «alcanza hasta» y «Cómo se vende».
- **Más adelante:** los sellos al entregar (fidelidad, fase 7), editar los textos de WhatsApp y la ficha del cliente (fase 7), Inicio (fase 6).

## Cambios respecto de la especificación

Se escriben en `orders.md`, `customers.md`, `messages.md` y `docs/plan/README.md` en la tarea 2, antes de la base.

1. **Un pedido de delivery o recoge lleva cliente** (su teléfono); sin cliente, es venta de mostrador (D14). El mensaje de confirmación necesita a quién escribirle.
2. **Un solo pago al anotar** (todo, una parte o nada, con su medio), como la maqueta; después, los que hagan falta con «Registrar pago».
3. **El «Deshacer» de un estado no borra el evento:** lo marca deshecho (`reverted_at`) y la línea de tiempo lo oculta. Nada se borra.
4. **La venta resta el stock con movimientos `sale` que llevan `order_id` y no `request_id`:** así `revert_stock_change` nunca los toca; además, desde esta fase solo deshace producción, merma y conteo (lo pidió la revisión de la fase 3).
5. **El conteo manda solo los alfajores con diferencia:** con pedidos entrando, mandar todos con el número que había en pantalla podía pisar una venta (revisión de la fase 3).
6. **La búsqueda de pedidos es por número o por nombre, sin importar mayúsculas**; sin tildes queda para cuando se active `unaccent` (fase 7, con la búsqueda de clientes).
7. **`{sellos}` queda vacío** hasta la fidelidad (fase 7).

## Restricciones globales

- **Siguen las de las fases 1 a 3:** un solo proyecto (el de desarrollo), la CLI por `pnpm sb`, primero la prueba, una migración enviada no se edita, `private.fail` para los errores, reglas de la tabla que repiten las de la función (y su prueba con el valor vacío).
- **Cada migración:** `pnpm test:db`, `pnpm db:push` y `pnpm db:types`. Cada función nueva para la app va en la lista de la regla 8.
- **Idempotencia con huella** (`docs/spec/README.md`): `create_order`, `create_counter_sale` y `add_payment` reciben `p_request_id` y llaman a `private.claim_request(negocio, código, función, huella)` con un md5 de sus argumentos.
- **Funciones que leen:** eligen el negocio como `get_business` (con las reglas de acceso).
- **Montos** en céntimos; **días** de Lima (`America/Lima`): `due_date` es `scheduled_for` o el día de Lima en que se anotó.
- **El JSON va en camelCase:** `customerName`, `itemsSummary`, `totalCents`, `paidCents`, `promisedAt`, `dueDate`.
- **Número de pedido:** `#0042` (cuatro cifras), como la maqueta.
- **El resumen** («2 Coquetas, 1 Pipo Crush») usa el plural de la maqueta: un nombre de una palabra suma «s»; uno de dos o más queda igual.
- **Medios de pago:** solo los activos del negocio (`settings.activePaymentMethods`).
- **Solo librerías que Expo Go ya trae** (no hace falta ninguna nueva).
- **Textos:** los de la maqueta; los nuevos, en su estilo y con su `Ruling:`. Teléfonos de prueba `+51 900 000 9xx`.
- **Commits:** en inglés, hasta 100 caracteres, sin cuerpo; uno por tarea.

## Foco de revisión

1. **Dos pedidos a la vez:** los números siguen sin huecos ni repetidos, y el contador queda bien aunque una creación falle a medias. → Tarea 3 (prueba de dos conexiones y una que falla después del número).
2. **El mismo pedido dos veces** (toque doble o respuesta perdida): un solo pedido, un solo pago y un solo movimiento de stock; con otros datos y el mismo código, `conflict`. → Tareas 3 y 4.
3. **Un pago que pasa lo que falta, de cero, con un medio apagado o sobre un pedido entregado y pagado:** se rechaza en la base y el botón no lo deja en el celular. → Tareas 4 y 11.
4. **El día de Lima:** un pedido anotado a las 23:30 de Lima es de ese día, no del siguiente (UTC); un pedido para el jueves sale en «Próximos» hasta el jueves y después, si nadie lo entrega, como atrasado. → Tareas 1 y 5.
5. **Sin señal en Nuevo pedido:** el borrador no se pierde (ni al cerrar la app), «Guardar» se apaga y lo dice. → Tareas 9 y 10.

---

### Task 1: Las cuentas de pedidos, clientes y mensajes

**Archivos:**
- Crear: `src/features/orders/`, `src/features/customers/`, `src/features/messages/` con `pnpm new:feature`.
- Crear (cada uno con su prueba): `orders/rules/totals.ts`, `orders/rules/status.ts`, `orders/rules/lateness.ts`, `orders/rules/payment.ts`, `orders/rules/number.ts`; `orders/schema/order.ts` (los enums); `customers/rules/phone.ts`, `customers/rules/last-order.ts`; `messages/rules/fill.ts`, `messages/rules/placeholders.ts`; `src/lib/whatsapp.ts`.

**Interfaces:**
- `orders/schema/order.ts`: `orderStatusSchema = z.enum(["new", "preparing", "on_the_way", "ready", "delivered", "cancelled"])`, `fulfillmentSchema = z.enum(["delivery", "pickup", "counter"])`, `channelSchema = z.enum(["whatsapp", "local", "web"])`, `paymentMethodSchema = z.enum(["cash", "yape", "plin", "transfer"])` y sus tipos.
- `draftTotal(input: { lines: { quantity: number; unitPriceCents: number }[]; deliveryFeeCents: number; discountCents: number }): { subtotalCents: number; totalCents: number }` (nunca negativo).
- `nextStatus(fulfillment: Fulfillment, status: OrderStatus): OrderStatus | null`; `nextStatusLabel(status: OrderStatus): string` («Empezar a preparar», «Marcar en camino», «Marcar listo para recoger», «Marcar entregado»); `STATUS_LABELS` (Nuevo, Preparando, En camino, Listo para recoger, Entregado, Anulado) en `orders/constants.ts`.
- `lateness(order: { status; fulfillment; dueDate: string; promisedAt: string | null }, now: Date): { kind: "overdue"; since: string } | { kind: "late"; minutes: number } | null`; `latenessLabel(...)`: «10 min tarde», «Atrasado desde ayer», «Atrasado desde el lunes».
- `paymentLabel(order: { status; totalCents; paidCents }): string`: «Anulado», «Pagado», «Falta S/ X», «Cobrar S/ X».
- `orderNumber(n: number): string` → «#0042».
- `normalizePhone(text: string): string | null`; `formatPhone(phone: string): string`; `lastOrderLabel(at: Date, now: Date): string` («Hoy, 09:30», «Ayer», «Hace 34 días»).
- `fillTemplate(body: string, context: Partial<Record<Placeholder, string>>): string`: reemplaza los marcadores, deja vacío el que no tiene valor y junta los espacios (como `llenar` en la maqueta). `PLACEHOLDERS` por plantilla y `unknownPlaceholders(key, body): string[]`.
- `waLink(phone: string, text: string): string` → `https://wa.me/51987654321?text=…`.

- [ ] **Paso 1: Escribir las pruebas que fallan** (los ejemplos de las especificaciones)

```ts
// totals
expect(draftTotal({ lines: [{ quantity: 2, unitPriceCents: 1200 }, { quantity: 1, unitPriceCents: 1300 }], deliveryFeeCents: 500, discountCents: 0 }).totalCents).toBe(4200);
expect(draftTotal({ /* lo mismo */ discountCents: 1000 }).totalCents).toBe(3200);
expect(draftTotal({ lines: [{ quantity: 1, unitPriceCents: 1200 }], deliveryFeeCents: 0, discountCents: 5000 }).totalCents).toBe(0);
// status
expect(nextStatus("delivery", "preparing")).toBe("on_the_way");
expect(nextStatus("pickup", "preparing")).toBe("ready");
expect(nextStatus("delivery", "delivered")).toBeNull();
// lateness (hoy 2026-11-18 en Lima)
expect(lateness({ status: "preparing", fulfillment: "pickup", dueDate: "2026-11-18", promisedAt: "2026-11-18T16:30:00Z" }, new Date("2026-11-18T16:40:00Z"))).toEqual({ kind: "late", minutes: 10 });
expect(lateness({ status: "ready", fulfillment: "pickup", dueDate: "2026-11-18", promisedAt: "2026-11-18T16:30:00Z" }, new Date("2026-11-18T16:40:00Z"))).toBeNull();
expect(lateness({ status: "on_the_way", fulfillment: "delivery", dueDate: "2026-11-18", promisedAt: "2026-11-18T18:00:00Z" }, new Date("2026-11-18T18:05:00Z"))).toEqual({ kind: "late", minutes: 5 });
expect(latenessLabel(lateness({ status: "new", fulfillment: "delivery", dueDate: "2026-11-17", promisedAt: null }, NOW))).toBe("Atrasado desde ayer");
// pago, número, teléfono, último pedido, relleno y enlace: los ejemplos de §5 de cada especificación
expect(orderNumber(42)).toBe("#0042");
expect(normalizePhone("987 654 321")).toBe("+51987654321");
expect(normalizePhone("+51 987-654-321")).toBe("+51987654321");
expect(normalizePhone("98765432")).toBeNull();
expect(fillTemplate("Hola {nombre}, tu pedido {numero} va en camino. Total a pagar: {falta} ({pago}).", { nombre: "Ana", numero: "#0042", falta: "S/ 42.00", pago: "Yape, Plin, transferencia o efectivo" }))
  .toBe("Hola Ana, tu pedido #0042 va en camino. Total a pagar: S/ 42.00 (Yape, Plin, transferencia o efectivo).");
expect(waLink("+51987654321", "Hola, ñandú\n¿listo?")).toBe("https://wa.me/51987654321?text=Hola%2C%20%C3%B1and%C3%BA%0A%C2%BFlisto%3F");
```

Más: el día de Lima en `lateness` (un pedido de hoy a las 23:30 de Lima no está atrasado a las 04:00 UTC del día siguiente), «Atrasado desde el lunes», «Cobrar S/ 12.00» sin pagos, «Hace 34 días», un marcador sin valor que desaparece sin dejar doble espacio, y `unknownPlaceholders("on_the_way", "Hola {apodo}")` → `["apodo"]`.

- [ ] **Paso 2: Correrlas y ver que fallan** — `pnpm test src/features/orders src/features/customers src/features/messages src/lib/whatsapp` → «Cannot find module».

- [ ] **Paso 3: Escribir las reglas, `constants.ts`, los esquemas y `lib/whatsapp.ts`**

- [ ] **Paso 4: Ver que pasan, con 100 % de cobertura** — `pnpm test:coverage && pnpm lint && pnpm typecheck`.

- [ ] **Paso 5: Commit** — `feat: add the order, customer and message rules and the WhatsApp link`.

---

### Task 2: Las tablas de pedidos

**Archivos:**
- Modificar primero: `docs/spec/orders.md`, `customers.md`, `messages.md`, `docs/plan/README.md` (los cambios de arriba).
- Crear: `supabase/migrations/<fecha>_orders.sql`. Prueba: `supabase/tests/090_orders_tables.test.sql`.

**Interfaces:**
- `public.customers` (como `customers.md` §2): `name` (1 a 60), `phone public.phone_pe` (vacío solo si se borraron sus datos), `address` (hasta 200), `note` (hasta 300), `accepts_promotions` (no), `orders_count`, `spent_cents`, `last_order_at`, `stamps`, `anonymized_at`, `version`. Índice único `(business_id, phone) where phone is not null`. Los de búsqueda llegan con la ficha (fase 7).
- `public.orders` (como `orders.md` §2, `fillfactor` 85), con sus `CHECK`: total = subtotal + delivery − descuento; pagado ≤ total; `on_the_way` solo en delivery y `ready` solo en recoge; mostrador nace entregado y sin cliente; delivery con dirección; descuento con motivo; anulado con motivo; delivery y recoge con cliente. Índices de `orders.md` (el de «Por cobrar» también: el filtro existe desde esta fase); la llave foránea de cliente con el parcial `(business_id, customer_id, created_at desc)` no sirve para la regla 5: va además `(business_id, customer_id)`.
- `public.order_lines`: `id`, `business_id`, `order_id`, `product_id`, `product_name`, `quantity > 0`, `unit_price_cents` (positivo), `unit_cost_cents` (positivo o vacío). Único `(business_id, order_id, product_id)`; `(business_id, product_id)`.
- `public.order_status_events`: `id`, `business_id`, `order_id`, `status`, `at`, `reverted_at`. Índice `(business_id, order_id, at)`.
- `public.payments`: `id`, `business_id`, `order_id`, `kind` (`payment` o `refund`), `method public.payment_method`, `amount_cents` (positivo), `paid_at`, `voided_at`, `void_reason` (con `voided_at` va el motivo). Índices `(business_id, order_id)` y parcial `(business_id, paid_at) where voided_at is null`.
- `public.message_templates`: llave `(business_id, key)`, `key` uno de los seis, `body` (1 a 500), `version`. Los textos por defecto (los de `MENSAJES_BASE` en la maqueta, con `{numero}` en vez de `#`) los carga `private.init_business` al crear un negocio; la migración los carga en los negocios que ya existen.
- `public.stock_movements.order_id` con su llave foránea `(business_id, order_id)` → `orders`, su índice, y la regla: con pedido si y solo si es `sale` o `cancellation`.
- Reglas de acceso y `grant select` para las seis tablas nuevas; triggers comunes; `audit_changes('body')` en `message_templates`.

- [ ] **Paso 1: Especificación nueva.** **Paso 2: la prueba que falla** — cada `CHECK` con su caso y con el valor vacío; los textos por defecto en un negocio nuevo y en uno de antes; quién lee qué (un dueño no ve lo de otro; nadie escribe directo). **Paso 3:** `pnpm test:db` falla (`relation "public.orders" does not exist`). **Paso 4:** la migración. **Paso 5:** pasan todas, también `900` y `910`. **Paso 6:** `pnpm db:push && pnpm db:types && pnpm typecheck`. **Paso 7: Commit** — `feat: add the customers, orders, lines, status events, payments and message templates tables`.

---

### Task 3: Crear pedidos y ventas de mostrador

**Archivos:**
- Crear: `supabase/migrations/<fecha>_create_order.sql`. Pruebas: `supabase/tests/091_create_order.test.sql`, `supabase/tests/091_create_order.concurrent.mjs`.
- Modificar: `900_structure.test.sql` (regla 8).

**Interfaces:**
- `private.order_json(order_id uuid) returns jsonb` (`stable`): `{ id, number, status, fulfillment, channel, customerId, customerName, promisedAt, scheduledFor, dueDate, deliveryAddress, deliveryFeeCents, discountCents, discountReason, subtotalCents, totalCents, paidCents, deliveredAt, note, itemsSummary, itemsCount, version, createdAt, lines: [{ productId, productName, quantity, unitPriceCents }], payments: [{ id, kind, method, amountCents, paidAt, voidedAt }], timeline: [{ status, at }] (sin los deshechos), customer: { id, name, phone, address } | null }`. Las fechas, como texto ISO con milisegundos y «Z».
- `private.move_stock(... , p_order_id uuid)`: la de ocho argumentos; la de siete la llama con `null`.
- `public.create_order(p_request_id uuid, p_draft jsonb) returns jsonb` → `private.create_order`. `p_draft`:

```json
{ "customer": { "phone": "+51987654321", "name": "Ana Q." }, "channel": "whatsapp", "fulfillment": "delivery",
  "promisedAt": "2026-11-18T18:00:00.000Z", "scheduledFor": null, "deliveryAddress": "Jr. Lima 123",
  "discountCents": 0, "discountReason": null, "note": null,
  "lines": [{ "productId": "…", "quantity": 2 }], "payment": { "method": "yape", "amountCents": 2000 } }
```

  - Valida todo (`invalid`): `fulfillment` delivery o recoge; cliente con teléfono válido y, si es nuevo, nombre (1 a 60); de 1 a 50 líneas sin repetir, cantidades de 1 a 10,000, productos activos del negocio (`not_found`); `scheduledFor` desde hoy (si es hoy, queda vacío); dirección en delivery; descuento de 0 hasta subtotal + delivery, con motivo (1 a 60) si es mayor que cero; nota hasta 300; el pago, de 1 hasta el total, con un medio activo.
  - Huella: md5 de `p_draft`.
  - Número: `update private.business_counters … returning` (la fila queda bloqueada hasta el final).
  - Cliente: lo crea o lo actualiza por teléfono (nombre si viene; dirección si es delivery); suma `orders_count`, `spent_cents` y `last_order_at`.
  - Congela precio, costo y nombre; arma `items_summary` e `items_count`; delivery copia `settings.delivery_fee_cents`.
  - Por línea, `move_stock(…, 'sale', −cantidad, null, null, null, order_id)`: vender sin stock lo deja negativo (D12).
  - El evento inicial `new`; el pago, si viene.
  - Devuelve `order_json`.
- `public.create_counter_sale(p_request_id uuid, p_items jsonb, p_method text) returns jsonb`: sin cliente, `counter`, canal `local`, entregado (`delivered_at` ahora, evento `delivered`), un pago por el total. Huella: md5 de los ítems y el medio.

- [ ] **Paso 1: Las pruebas que fallan.** `091`: el primer pedido es el 1 y el segundo el 2; el total, el resumen («2 Coquetas, 1 Pipo Crush»), la cantidad y el delivery copiado; precios y nombre congelados (cambiar el producto después no cambia el pedido); el stock baja (también a negativo) y lo apartado sube; el cliente nuevo queda creado y el que existe, actualizado, con sus totales; el pago y `paid_cents`; un pedido a las 23:30 de Lima tiene el `due_date` de ese día; el mismo código dos veces crea un pedido (y con otros datos, `conflict`); cada rechazo de la lista de arriba; una línea de un producto de otro negocio; mostrador: entregado, pagado y sin cliente. `091_create_order.concurrent.mjs`: dos pedidos a la vez desde dos conexiones salen con números distintos y seguidos; uno que falla después de tomar el número no deja hueco.
- [ ] **Paso 2:** fallan. **Paso 3:** la migración y la regla 8. **Paso 4:** pasan. **Paso 5:** `db:push`, `db:types`, commit — `feat: add order and counter sale creation with numbers, frozen prices and stock sales`.

---

### Task 4: Avanzar, deshacer y cobrar

**Archivos:**
- Crear: `supabase/migrations/<fecha>_order_flow.sql`. Prueba: `supabase/tests/092_order_flow.test.sql`. Modificar: regla 8.

**Interfaces:**
- `public.advance_order(p_order_id uuid, p_from_status text) returns jsonb`: el siguiente estado según la entrega; si el estado ya no es `p_from_status`, `conflict`; anulado, entregado o mostrador: `invalid`. Al entregar, `delivered_at`. Sube la versión y anota el evento.
- `public.revert_status(p_order_id uuid, p_expected_status text) returns jsonb`: el estado actual tiene que ser `p_expected_status` (si no, `conflict`); su evento es el último sin deshacer, de hace menos de 10 minutos, y hay uno anterior (si no, `invalid`). Marca el evento (`reverted_at`), vuelve al estado anterior y, si era entregado, borra `delivered_at`.
- `public.add_payment(p_request_id uuid, p_order_id uuid, p_method text, p_amount_cents integer) returns jsonb`: de 1 hasta lo que falta, con un medio activo, en un pedido sin anular (`invalid`); huella; suma a `paid_cents`.
- `private.reserved_stock`: ahora lee los pedidos sin entregar ni anular (sus líneas).
- `private.revert_stock_change`: solo deshace producción, merma y conteo.

- [ ] **Paso 1: Las pruebas que fallan.** Delivery: nuevo → preparando → en camino → entregado, y recoge pasa por «listo para recoger»; un estado viejo da `conflict`; avanzar un entregado da `invalid`. Deshacer: vuelve al anterior y la línea de tiempo lo oculta; un segundo deshacer del mismo estado da `conflict`; pasados 10 minutos, `invalid`; deshacer «entregado» borra `delivered_at`. Pago: cero, negativo, más de lo que falta y un medio apagado se rechazan; el mismo código dos veces cobra una vez. Lo apartado: un pedido en curso aparta sus alfajores y al entregarlo deja de apartarlos; un pedido para otro día más grande que lo libre deja el alfajor en `owed`. `revert_stock_change` con el código de un pedido: `not_found`.
- [ ] **Paso 2:** fallan. **Paso 3:** la migración. **Paso 4:** pasan. **Paso 5:** `db:push`, `db:types`, commit — `feat: add order status changes with undo, payments and the reserved stock`.

---

### Task 5: Leer pedidos, clientes y plantillas

**Archivos:**
- Crear: `supabase/migrations/<fecha>_order_reads.sql`. Prueba: `supabase/tests/093_order_reads.test.sql`. Modificar: regla 8.

**Interfaces:**
- `public.get_order(p_order_id uuid) returns jsonb` → `order_json`; de otro negocio, `not_found`.
- `public.list_orders(p_filter text, p_search text default null, p_limit integer default 20, p_cursor text default null) returns jsonb`: `{ items: [{ id, number, status, fulfillment, customerName, itemsSummary, totalCents, paidCents, promisedAt, dueDate }], meta }`, del número mayor al menor; el cursor es el número, opaco. Filtros con el día de Lima: `today` (de hoy, más los atrasados sin entregar), `to_deliver` (sin entregar ni anular, de hoy o atrasados), `upcoming` (de días que vienen, sin anular), `to_collect` (con saldo, sin anular) y `all`. `p_search`: «#0042» o «42» busca el número; si no, el nombre (`ilike`).
- `public.order_counts() returns jsonb`: `{ today, toDeliver, upcoming, toCollect, all }`.
- `public.find_customer_by_phone(p_phone text) returns jsonb`: `null` o `{ id, name, address, ordersCount, lastOrderAt, lastOrder: { lines: [{ productId, quantity }] } | null }` (su último pedido sin anular).
- `public.list_templates() returns jsonb`: `[{ key, body, version }]`.

- [ ] **Paso 1: Las pruebas que fallan.** Un pedido para el jueves sale en «Próximos» y no en «Hoy»; el jueves (con `due_date` en el pasado de la prueba) pasa a «Hoy» y «Por entregar»; si nadie lo entrega, sale atrasado; «Por entregar» y `order_counts().toDeliver` coinciden; páginas de 20 con `total` y `hasMore`, `limit` máximo 50, el cursor no repite ni salta aunque entre un pedido nuevo; la búsqueda por «#0002», «2» y «ana»; el cliente por teléfono con su último pedido; otro dueño no ve nada; las seis plantillas.
- [ ] **Paso 2:** fallan. **Paso 3:** la migración. **Paso 4:** pasan. **Paso 5:** `db:push`, `db:types`, commit — `feat: add the order list, counts, detail, customer lookup and templates reads`.

---

### Task 6: El medidor, con años de pedidos

**Archivos:** `supabase/perf/seed.sql`, `supabase/perf/cases.mjs`.

**Interfaces:**
- **Datos** (livianos: el seed tiene que entrar en el tiempo máximo por sentencia): el negocio medido con 3 años de pedidos, 10 por día, con sus líneas, pagos y eventos, y 300 clientes; los demás negocios, sin pedidos. Solo sus propias filas (la base de desarrollo tiene datos DEMO).
- **Casos** (50 ms y sin leer enteras `orders`, `order_lines`, `payments`, `customers`): `list_orders` con `today`, `to_deliver` y `all` (primera página y con cursor), `order_counts`, `get_order`, `find_customer_by_phone`, `create_order` y `stock_overview` (ahora suma lo apartado).

- [ ] **Paso 1:** los datos y los casos. **Paso 2:** `pnpm db:perf && pnpm db:perf --self-test`. Si algo pasa del tiempo, el índice que falta va en una migración nueva con su prueba. **Paso 3: Commit** — `test: measure the order functions with years of orders`.

---

### Task 7: Mensajes, clientes y los datos de pedidos en el celular

**Archivos:**
- `src/features/messages/`: `schema/template.ts`, `api/templates.ts`, `queries/` (`templatesQuery`, `staleTime` del catálogo), `components/message-preview.tsx`.
- `src/features/customers/`: `schema/customer.ts`, `api/customers.ts`, `queries/` (`customerByPhoneQuery(phone)`, que espera los 9 dígitos), `components/customer-lookup.tsx`.
- `src/lib/use-request-id.ts`: `useRequestId` sube desde `features/stock/hooks` (lo usan stock y pedidos: «lo que se repite sube»); stock lo importa de ahí.
- `src/features/orders/`: `schema/order.ts` (sumar `orderSchema`, `orderSummarySchema`, `orderCountsSchema`, `OrderDraft`), `api/orders.ts`, `queries/keys.ts`, `queries/orders.ts` (`ordersQuery(filter, search)` por páginas, `orderCountsQuery`, `orderQuery(id)` con `initialData` de la lista), `queries/mutations.ts` (crear, venta, avanzar, deshacer, cobrar; cada una refresca `orders` y `stock`).

**Interfaces:**
- `MessagePreview({ templateKey, context, phone })`: la burbuja con el texto lleno y «Enviar por WhatsApp» (`Linking.openURL(waLink(…))`); sin teléfono, solo la burbuja.
- `CustomerLookup({ phone, onPhoneChange, name, onNameChange, onRepeat })`: el teléfono con +51; con 9 dígitos busca; si existe, su nombre, su último pedido (`lastOrderLabel`) y «Repetir»; si no, pide el nombre.
- Las mutaciones de crear esperan la respuesta («Guardando…»); avanzar y deshacer se ven al instante en `orderQuery(id)` y vuelven atrás si fallan (§14.2).

- [ ] **Paso 1:** las pruebas que fallan (API simulada): la burbuja se llena con los datos del pedido y el botón abre el enlace con el texto; el cliente aparece al escribir el noveno dígito y «Repetir» devuelve sus líneas; las consultas validan las respuestas con Zod. **Paso 2:** fallan. **Paso 3:** los módulos. **Paso 4:** `pnpm test && pnpm lint && pnpm typecheck`. **Paso 5: Commit** — `feat: add the message preview, the customer lookup and the order data layer`.

---

### Task 8: La lista de pedidos

**Archivos:**
- `src/features/orders/components/`: `status-chip.tsx`, `order-row.tsx`, `order-filters.tsx`, `order-list.tsx`.
- Rutas: `src/app/(main)/orders/_layout.tsx` (Stack) y `orders/index.tsx`; en `(main)/_layout.tsx`, la pestaña pasa a llamarse `orders`. Pantallas de paso para `orders/new`, `orders/[id]` y `orders/counter` (tareas 9 a 12).

**Interfaces:**
- `OrderList({ onOpen, onNew })`: los filtros con su cantidad (`order_counts`), la búsqueda, «Hoy» en dos grupos («En curso» y «Terminados», más apagados), «Todos» por páginas («Mostrando X de N», carga sola al final, «Cargar 20 más», «No hay más pedidos»), y las vistas de la maqueta (`PANTALLAS.pedidos`): cargando, sin datos («Todavía no hay pedidos» y su botón), error y sin internet (con la hora). Recarga al volver a la pestaña con `useRefreshOnFocus`.
- `OrderRow`: número y tipo de entrega, cliente (o «Mostrador») con «X min tarde», qué pidió, estado, total y cobro (`filaPedido`).

- [ ] **Paso 1:** las pruebas que fallan: la fila dice qué, cuánto, estado, cobro y demora; «Hoy» agrupa; cambiar de filtro pide esa lista; «Todos» pide la página siguiente al final; buscar «ana» pide con la búsqueda; tocar una fila abre el pedido (rutas de verdad). **Paso 2–4.** **Paso 5: Commit** — `feat: add the order list with filters, search, groups and paging`.

---

### Task 9: Nuevo pedido, paso 1, y el botón +

**Archivos:**
- `src/features/orders/hooks/use-order-draft.ts`; `components/draft-items.tsx`, `components/new-menu.tsx`.
- Rutas: `orders/new.tsx` (el flujo de los dos pasos); `(main)/_layout.tsx` (el botón + abre `NewMenu`).

**Interfaces:**
- `useOrderDraft()`: el borrador en AsyncStorage (`orders.draft`), con sus líneas, cliente, entrega y pago; `clear()` al guardar. Sobrevive a cerrar la app.
- `DraftItems`: cada alfajor con su precio, el contador y «Quedan N» / «Stock en −2»; si se pide más de lo que hay, «Solo quedan N. Puedes anotarlo igual y ajustar el stock después.» (avisa, no bloquea, D12); el total que va (`draftTotal`); «Siguiente».
- `NewMenu`: la hoja «¿Qué quieres anotar?» con «Un pedido», «Una venta de mostrador» y «La producción» (`hojaNuevo`; «Un gasto» llega en la fase 5).

- [ ] **Paso 1:** las pruebas que fallan: el borrador vuelve después de desmontar la pantalla; el aviso de stock sin bloquear; el menú lleva a cada pantalla. **Paso 2–4.** **Paso 5: Commit** — `feat: add the new order items step with a draft that survives and the plus menu`.

---

### Task 10: Nuevo pedido, paso 2, y Pedido guardado

**Archivos:** `src/features/orders/components/draft-details.tsx`, `components/order-saved.tsx`.

**Interfaces:**
- `DraftDetails`: el cliente (`CustomerLookup`, con «Repetir»), la entrega (recoge o delivery; la venta de mostrador tiene su pantalla), la hora acordada, hoy u otro día, la dirección en delivery, el descuento con motivo, el pago ahora (todo, una parte o nada) con su medio (solo los activos), el resumen y «Guardar pedido de S/ 42.00» (`pedido2`). Espera con «Guardando…»; sin señal se apaga y lo dice. El código del pedido sale de `useRequestId` (`lib/use-request-id.ts`, tarea 7).
- `OrderSaved`: «Guardado como #0042», el resumen, `MessagePreview` con la confirmación, «Avisar por WhatsApp» y «Anotar otro pedido» (`guardado`).

- [ ] **Paso 1:** las pruebas que fallan: delivery sin dirección no se guarda; el pago no pasa del total; guarda con el borrador completo y el código; con `conflict` lo explica y renueva el código; la confirmación se llena con el pedido guardado; el recorrido: + → Un pedido → paso 1 → paso 2 → guardado (rutas de verdad). **Paso 2–4.** **Paso 5: Commit** — `feat: add the new order details step and the saved order with its WhatsApp message`.

---

### Task 11: Un pedido

**Archivos:** `src/features/orders/components/order-detail.tsx`, `order-timeline.tsx`, `payment-sheet.tsx`; ruta `orders/[id].tsx`.

**Interfaces:**
- `OrderDetail({ orderId })`: la línea de tiempo; la acción principal fija abajo (el siguiente estado o, ya entregado, «Registrar pago de S/ X»); «Deshacer» del cambio de estado en el aviso; el mensaje de WhatsApp del estado (confirmación, en camino, listo, entregado) como botón secundario; las líneas con sus precios congelados, los pagos, y el cliente con su dirección (`PANTALLAS.pedido`). Sin señal, la acción se apaga y lo dice; si no se pudo guardar, vuelve atrás y lo dice.
- `PaymentSheet`: «Registrar pago» (o «¿Ya cobraste?» al entregar con saldo), «Falta cobrar S/ X del pedido #0042», el monto (todo por defecto, nunca más de lo que falta) y el medio en chips.

- [ ] **Paso 1:** las pruebas que fallan: la acción cambia según el estado y la entrega; avanzar se ve al instante y vuelve si falla; «Deshacer» llama `revert_status` con el estado; el pago no deja pasar lo que falta; el mensaje de «en camino» se llena con lo que falta pagar. **Paso 2–4.** **Paso 5: Commit** — `feat: add the order detail with status changes, undo, payments and status messages`.

---

### Task 12: Venta de mostrador

**Archivos:** `src/features/orders/components/counter-sale.tsx`; ruta `orders/counter.tsx`.

**Interfaces:**
- `CounterSale`: los alfajores con el contador, el total, y cobrar con efectivo primero, luego Yape, Plin y transferencia (solo los activos), como `PANTALLAS.venta`. Espera la respuesta; al guardar, «Venta guardada: #0043, S/ 24.00.» y vuelve vacía para la siguiente. Su «Deshacer» llega con anular (4b).

- [ ] **Paso 1:** las pruebas que fallan: cobra con el medio tocado y manda solo los alfajores con más de 0; sin señal se apaga. **Paso 2–4.** **Paso 5: Commit** — `feat: add the counter sale`.

---

### Task 13: El conteo con pedidos en curso

**Archivos:** `src/features/stock/components/count-sheet.tsx` (+ prueba).

**Interfaces:** el conteo manda solo los alfajores con diferencia (cambio 5); con un alfajor apartado, la fila dice «Deberías tener 13 en la nevera (11 libres y 2 apartados para pedidos)».

- [ ] **Paso 1:** la prueba que falla: con dos alfajores y uno cambiado, manda solo ese. **Paso 2–4.** **Paso 5: Commit** — `fix: send only the counted products with a difference`.

---

### Task 14: Revisión completa y cierre

**Archivos:** `docs/plan/README.md` (estado), este plan («Resultado», «Lo que falta», «Lo que cambió»), `CLAUDE.md` si hay comandos nuevos.

- [ ] **Paso 1: La revisión completa:** `pnpm lint && pnpm lint:rules && pnpm typecheck && pnpm test:coverage && pnpm test:scripts && pnpm db:check` → todo pasa.
- [ ] **Paso 2: Documentar y commit** — `docs: record phase 4a results and the phone test`.

**Lo que pruebas tú en el celular** (va en «Lo que falta»):
1. + → Un pedido: 2 Coqueta y 1 Pipo Crush; paso 2: el 900 000 990 con el nombre «Ana (DEMO)», delivery con dirección, paga S/ 20 por Yape; guarda: «Guardado como #0001» y el mensaje de confirmación; «Avisar por WhatsApp» abre WhatsApp con el texto.
2. Pedidos: está en «Hoy» y en «Por entregar»; ábrelo: «Empezar a preparar», «Marcar en camino», «Deshacer», otra vez, y «Marcar entregado»; registra el pago de lo que falta.
3. + → Una venta de mostrador: 1 Morenita, en efectivo.
4. Stock: con un pedido sin entregar, el conteo dice cuántos están apartados.
5. Otro pedido con el mismo teléfono: aparece Ana con «Repetir».
6. Cierra la app con un pedido a medio anotar y ábrela: el borrador sigue ahí.
7. Con el modo avión: la lista dice desde cuándo es lo que ves, y «Guardar» se apaga.

---

## Resultado (2026-11-19)

La fase 4a quedó construida en la rama `fase-4a`, con un commit por tarea, más una corrección del medidor, dos de formato y uno de pruebas.

| Comprobación | Resultado |
|---|---|
| `pnpm test:coverage` | 454 pruebas; 100 % en `lib/{money,dates,errors}`, `theme/tokens` y las cuentas de `features/*/rules` |
| `pnpm db:check` | Pasa entera: 464 pruebas de la base en 23 archivos (incluidas las de dos conexiones), consejos de Supabase sin nada pendiente y tipos al día |
| `pnpm db:perf` | 22 casos, todos con índice; el más lento, buscar un nombre en 3 años de pedidos: 34 ms |
| `pnpm lint`, `pnpm lint:rules`, `pnpm typecheck`, `pnpm test:scripts` | Pasan |

En el proyecto de desarrollo quedaron las cuatro migraciones de la fase (pedidos, crear, avanzar y cobrar, leer) y una que ajusta el cálculo de filas de `private.stock_items`. No se cargaron pedidos DEMO: los anotas tú en la prueba.

### Lo que falta: probar en el celular

```bash
cd /home/javier/var-mar/app && pnpm start --tunnel
```

Ingresa con el dueño DEMO (900 000 101, el PIN de tu `.env.local`):

1. + → Un pedido: 2 Coqueta y 1 Pipo Crush → «Seguir». En el paso 2: el 900 000 990, el nombre «Ana (DEMO)», Delivery con una dirección, «Una parte» de S/ 20 con Yape → «Guardar pedido de S/ …». Sale «Pedido #0001 guardado» con el mensaje de confirmación; «Avisar por WhatsApp» abre WhatsApp con el texto.
2. Pedidos: está en «Hoy» y en «Por entregar». Ábrelo: «Empezar a preparar», «Marcar en camino», «Deshacer» en el aviso, otra vez «Marcar en camino» y «Marcar entregado»; en «¿Ya cobraste?», registra lo que falta.
3. + → Una venta de mostrador: 1 Morenita, cobrar con Efectivo. Sale «Venta guardada: #0002, …».
4. Anota otro pedido sin entregarlo y ve a Stock → «Contar stock»: la fila dice cuántos están apartados para pedidos.
5. + → Un pedido con el mismo teléfono: aparece Ana, con su último pedido y «Repetir».
6. Deja un pedido a medio anotar, cierra la app del todo y ábrela: «Recuperamos el pedido que dejaste a medias…».
7. Con el modo avión: Pedidos dice desde qué hora es lo que ves, y «Guardar» y «Cobrar con» se apagan.
8. Otro pedido para dentro de unas semanas: en «Cuándo», escribe la fecha en «Otra fecha» (por ejemplo 24/12); sale el día escrito y, al guardar, el pedido aparece en «Próximos».

### Lo que cambió respecto de este plan

**Tarea 1**
- `fillTemplate` también quita el espacio que deja un marcador vacío antes de un punto («Hola .» → «Hola.»), y un atraso de más de una semana se nombra con la fecha («Atrasado desde el 9 nov»).
- Clientes tiene su propio `normalizePhone` (las cuentas no pueden usar otro módulo).

**Tarea 2**
- Los textos de WhatsApp por defecto viven en `private.default_templates()`: los usan el negocio nuevo, los negocios que ya existían y, en la fase 7, «Volver al texto original».

**Tarea 3**
- Ayudas nuevas en la base: `private.iso_time`, `plural_name`, `next_order_number` y `json_cents_or_zero`. Las líneas y el resumen van ordenados por nombre.
- La prueba de dos pedidos a la vez usa el negocio DEMO del proyecto de desarrollo y lo deja como estaba.

**Tarea 4**
- Una venta nunca lleva código de registro (regla en la tabla `stock_movements`): así el «Deshacer» del stock no puede tocar una venta, sin cambiar `revert_stock_change`.
- Cada estado guarda la hora exacta (`clock_timestamp`): dos cambios seguidos quedan en orden.
- `revert_status` no deshace una anulación (eso llega en la 4b, con el stock y los pagos), y un pago sube la versión del pedido.

**Tarea 5**
- `list_orders` arma su consulta según el filtro, para que cada uno use su índice; `order_counts` cuenta con `list_orders`, así «Por entregar» y su número nunca difieren.
- La búsqueda va dentro del filtro elegido; «%» y «_» se buscan como letras.

**Tarea 6**
- Los demás negocios del medidor tienen 6 ventas cada uno (el plan decía ninguna): con un solo negocio con pedidos, la base leía la tabla entera con razón.
- Lo que faltaba no era un índice: `private.stock_items` (hasta 50 alfajores) se tomaba como 1,000 filas, y `create_order` leía los 25,000 productos. Una migración nueva lo corrige.

**Tarea 7**
- Un pedido de la lista no sirve de dato inicial para abrirlo (no trae líneas ni pagos): la fila lo pide al apretarla.
- Qué refresca cada cambio (pedidos, stock y clientes) va en los hooks. Piezas comunes nuevas: `lib/parse.ts` y `useRequestId` en `lib`.
- Si el teléfono cambia de un cliente conocido a uno nuevo, el nombre que se había completado se borra.

**Tarea 8**
- «Mostrando X de N» y «Cargar 20 más» salen en cualquier filtro con más páginas, no solo en «Todos». La búsqueda y los filtros quedan fijos arriba.
- Cada fila dice su día junto al número («#0037, ayer»).

**Tarea 9**
- Los dos pasos viven en un componente (`NewOrder`); la ruta solo lo muestra. El botón dice «Seguir», como la maqueta.
- El borrador guardado se revisa al leerlo: uno de otra versión de la app que no calce se descarta.

**Tarea 10**
- Llega el módulo `businesses` (mínimo): los medios de pago activos y el costo del delivery.
- Sin selector de fecha ni de hora en la app (no hay librerías nuevas): «Cuándo» ofrece hoy y los 6 días que siguen, y la hora acordada se escribe («13:00») o se toma «En 30 min».
- Piezas comunes nuevas: `Section`, `Segmented` y `Field` (el lint pide un componente por archivo y hasta 250 líneas).

**Tarea 11**
- El aviso con «Deshacer» sale al tocar el botón (el cambio ya se ve); si no se guardó, dice a qué estado volvió.
- Quedan para después: «Ver ficha» (fase 7), «Ver en el mapa», «Editar pedido» y «Anular» (4b).

**Tarea 12**
- Sin señal, la venta dice «Para cobrar, espera la señal.»: los botones se apagan y nada queda en cola.

**Tarea 13**
- La fila del conteo con lo apartado ya existía (fase 3); ahora la prueba la mira con un pedido de verdad.

**Tarea 14**
- Para el 100 % de las cuentas, pruebas nuevas: la hora acordada de hoy, el mensaje de un pedido de mostrador o con un solo medio de pago, y el encabezado sin nombre.

## Después de la revisión final (2026-11-19)

Un revisor nuevo leyó toda la rama: «lista para juntar, con correcciones». No encontró nada crítico y sí una falla importante. Cinco de sus observaciones menores se subieron a correcciones, por lo que le pasaría a quien usa la app.

**Lo que se corrigió** (cada corrección con su prueba, que primero falló):
- **El código del pedido viaja con el borrador.** Antes, si la respuesta se perdía y el dueño volvía al paso 1 o cerraba la app, al guardar otra vez se creaba un segundo pedido (con su venta en el stock y su pago). Ahora el reintento devuelve el mismo pedido; el código se renueva al guardar o con un conflicto.
- **Un doble toque avanza un solo paso.** La acción de abajo se apaga mientras se guarda el cambio: «Marcar en camino» tocado dos veces ya no deja el pedido «Entregado».
- **Un conflicto en la venta de mostrador o en un pago se explica** sin invitar a registrarlo otra vez (antes decía «Alguien cambió esto antes. Actualiza y vuelve a intentar.»).
- **Un teléfono corregido borra el nombre del cliente anterior** también después de volver al paso 1 o de recuperar el borrador.
- **Un borrador recuperado dice qué cambiar:** «El día elegido ya pasó: elige otro.» o «Ese medio de pago está apagado: elige otro.», en vez de fallar siempre con «vuelve a intentar».
- **Un pedido se puede anotar para cualquier fecha:** además de hoy y los 6 días siguientes, «Otra fecha» se escribe como día/mes (24/12) y vale la próxima vez que llega. Una fecha que no existe no deja guardar («Escribe la fecha como 24/12.»). Sin librerías nuevas. Si prefieres un calendario para elegir la fecha, se puede agregar con `@react-native-community/datetimepicker`, que Expo Go ya trae: instalarlo es tu decisión.

**Lo que queda para después** (menor):
- «Guardar» se activa antes de que carguen los ajustes del negocio: un instante, la primera vez; después vienen de la caché.
- Pagar todo al anotar falla por encima de S/ 10,000 (el pago después no tiene ese límite).
- Sin señal, el nombre de un cliente nuevo no se puede escribir hasta que vuelva la señal (guardar la necesita igual).
- Tocar + → «Un pedido» estando ya en Nuevo pedido abre una segunda copia de la pantalla. Con el código en el borrador, guardar desde las dos ya no duplica el pedido.
- Todos los cambios de pedidos van en una sola fila, y el cliente de Supabase no corta una petición colgada (viene de fases anteriores). Una petición colgada detiene las demás hasta que termina. Se ve antes de producción, en la fase 8.
- Pruebas que faltan: el día de Lima a las 04:30 UTC en la base, «Guardar» sin señal en el paso 2, «Guardando…» apagando el botón, y que los totales coincidan siempre con las líneas y los pagos.

**Lo que el revisor dejó fuera y por qué queda así:** dos teléfonos anotando a la vez el mismo cliente nuevo (hay un solo dueño con un celular); «En 30 min» pasada la medianoche (fuera del horario); «X min tarde» que no corre con la pantalla quieta (se actualiza al volver y al tirar hacia abajo); los textos de WhatsApp en una línea (se editan en la fase 7); y otros casos sin efecto real en un negocio con un solo dueño.

## Después de tu prueba en el celular (2026-11-19)

**Volver de «Nuevo pedido» era brusco.** El + abría la pantalla sola dentro de la pestaña Pedidos, sin nada debajo. Al volver, la app cambiaba de pestaña (eso no tiene animación), y después Pedidos seguía mostrando «Nuevo pedido» en vez de la lista. Lo mismo pasaba con «La producción» y con «Ir a Ajustes». Ahora las pestañas van en su grupo (`(tabs)`), y todo lo que se abre desde ellas o desde el + (un pedido, una venta, la producción, un alfajor, Ajustes) se abre encima, sin la barra de pestañas, como en la maqueta. «Volver» regresa con su animación a la pantalla de antes. De paso, ya no se puede abrir una segunda copia de «Nuevo pedido» desde el + (era una de las observaciones menores de la revisión).

**Los botones de abajo quedaban tapados** (en Un alfajor: «Contar stock» y «Anotar merma»). Las pantallas que pasaron a abrirse encima de las pestañas seguían sin dejar el espacio de abajo, porque antes lo dejaba la barra de pestañas. Ahora lo dejan las siete (Nuevo pedido, Venta de mostrador, Un pedido, Registrar producción, Un alfajor, Productos y Cambiar PIN), y una prueba lo revisa con una barra del sistema de 48.

**Textos y números que no entraban.** Las cuentas se hicieron para un celular de 360 dp de ancho:
- El contador ahora es el de la maqueta: una píldora de 44 con botones de 38, de unos 116 de ancho (antes 148). El nombre del alfajor entra al lado: en el paso 1 del pedido, la venta de mostrador, la producción y el conteo.
- En «Contar stock», «Deberías tener… en la nevera» va debajo y a lo ancho (al lado bajaba hasta 8 líneas).
- La fila de un pedido va en tres líneas alineadas: número y entrega con su estado; quién con el total; qué pidió con lo que falta cobrar. A la izquierda, lo que no entra se corta con «…»; a la derecha, nada se corta. En la fila, «Listo para recoger» se lee «Listo» y el atraso, «Atrasado» (el día ya va junto al número). El lector de pantalla lee todo completo.
- «Empezar de nuevo» va debajo del aviso del borrador, el pie del paso 1 cabe en una línea, y la hora acordada dice «Hora (opcional)».
- Los botones nunca dejan que su texto se salga: si hace falta, la letra se achica un poco. Los medios de pago de la venta van en dos columnas («Transferencia» entra entera).
- En los resúmenes y en lo que lleva un pedido, el monto nunca se empuja fuera: el texto largo se corta.
