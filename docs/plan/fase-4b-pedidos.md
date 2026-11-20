# Fase 4b: pedidos, corregir y cobrar — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que el dueño corrija lo que anotó (editar un pedido, anularlo con su devolución, cambiar el medio de un pago, y deshacer cada cosa), vea quién le debe y se lo recuerde por WhatsApp, y sepa cuánto producir: la sugerencia con su porqué, hasta cuándo alcanza cada alfajor y cómo se vende cada día. Y que moverse por la app sea suave, con un recorrido que la flecha de Android sigue paso a paso.

**Arquitectura:** cuatro migraciones de funciones: editar, anular, pagos y por cobrar, y la venta esperada (sugerencia, alcance y gráfico). Todas con idempotencia y huella; los «Deshacer» de editar y anular leen lo que guardó `private.audit_log`. En el celular, Nuevo pedido pasa a ser tres pantallas de verdad con el borrador compartido, la pila de pantallas se desliza y las pestañas también; Un pedido suma las hojas de editar, anular y cambiar el medio; llega Por cobrar; Stock suma la sugerencia y el alcance.

**Stack:** Postgres (plpgsql, pgTAP), supabase-js `rpc` (con un corte a los 20 s), TanStack Query 5, Zod, Expo Router (Stack con `ios_from_right`, Tabs con `shift`), React context para el borrador.

**Especificación:** `docs/spec/orders.md` (§3 editar, anular, deshacer, cambiar medio, por cobrar; §6 Un pedido y Por cobrar), `docs/spec/stock.md` (§3 `production_suggestion`, `product_sales_by_weekday`, alcance; §5 `coverage.ts`; §6), `docs/spec/messages.md` (`balance_reminder`), `docs/spec/README.md`, `docs/PROJECT_CONTEXT.md` (D11, D16) y la maqueta: `assets/donpipos.js` (`lineaStock`, `alcance`, `sugerido`, `PANTALLAS.stock`, `produccion`, `historial`) y `assets/donpipos-2.js` (`PANTALLAS.pedido` con sus hojas, `PANTALLAS.porcobrar`, `guardar-anular`, `guardar-editar`).

## Lo que entra

- **Navegación suave y con flujo** (pedido del dueño, 2026-11-19: «importante»): todo cambio de pantalla se anima, la flecha de Android vuelve paso a paso, y después de guardar no se vuelve a un formulario usado.
- Editar un pedido antes de entregarlo y anularlo en cualquier estado, con devolución total o parcial, y sus «Deshacer»; el «Deshacer» de la venta de mostrador (es anularla con devolución completa).
- Cambiar el medio de un pago o de una devolución.
- Por cobrar: cuánto te deben, la lista y «Recordar».
- La sugerencia de producción con «Por qué 36», «alcanza hasta» y «Cómo se vende».
- De la revisión de la 4a: el corte de peticiones colgadas y una fila de cambios por pedido.
- **Más adelante:** los sellos (fase 7: aquí `remove_stamp` no hace nada todavía), Inicio y su «por cobrar» (fase 6), el selector de fecha con calendario (si el dueño instala la librería).

## Cambios respecto de la especificación

Se escriben en `orders.md`, `stock.md` y `docs/plan/README.md` en la tarea 2, antes de la base.

1. **Nuevo pedido son tres pantallas** (qué lleva, entrega y pago, guardado), no una que cambia por dentro: así se deslizan y la flecha retrocede un paso. Guardado reemplaza el recorrido: «Volver» lleva a donde se empezó.
2. **Editar por debajo de lo pagado pide devolver exactamente la diferencia** (no hay saldo a favor); si el total no baja de lo pagado, no se manda devolución (`invalid`).
3. **La venta esperada cuenta desde mañana**, como la maqueta («Desde mañana»): la sugerencia cubre de mañana a `production_interval_days` días, y «alcanza hasta» cuenta días desde mañana. La historia termina ayer y empieza en la primera venta, hasta 4 semanas atrás.
4. **«Los pedidos de eventos» son los pedidos para otro día** (`scheduled_for`): no hay una marca aparte.
5. **«Recordar» aparece si el pedido está entregado o tiene un adelanto**, como dice la nota de la maqueta («si ya entregaste o si recibiste un adelanto»).
6. **Por cobrar ordena del número mayor al menor** (el índice de por cobrar), no por monto: así pagina sin saltos.
7. **A Por cobrar se entra desde el filtro «Por cobrar» de Pedidos** (una tarjeta «Te deben S/ X»), hasta que llegue Inicio (fase 6).

## Restricciones globales

- **Siguen las de las fases 1 a 4a:** un solo proyecto (el de desarrollo), la CLI por `pnpm sb`, primero la prueba, una migración enviada no se edita, `private.fail` para los errores, `private.<fn>` con su envoltorio en `public`, cada función nueva para la app en la regla 8 (`900_structure`), JSON en camelCase, fechas ISO con milisegundos y «Z».
- **Cada migración:** `pnpm test:db`, `pnpm db:push`, `pnpm db:types`.
- **Idempotencia con huella:** `edit_order`, `cancel_order` y `change_payment_method` llaman a `private.claim_request(negocio, código, función, md5(argumentos))`.
- **Deshacer:** solo el último cambio y dentro de los 10 minutos; la segunda vez, `conflict`.
- **Navegación:** pantallas encima de las pestañas en la pila de `(main)` con `<Screen>` (deja el espacio de abajo); pestañas con `bottom={false}`. Cada pantalla nueva con su prueba de ruta (ir y volver).
- **Pantallas angostas (360 dp):** en una fila, lo de la izquierda con `flex-1` y `numberOfLines`, los montos a la derecha con `shrink-0`; el `Stepper` compacto. Lint: un componente por archivo, hasta 250 líneas.
- **Textos:** los de la maqueta; los nuevos, en su estilo y con su `Ruling:`. Montos en céntimos y días de Lima.
- **Commits:** en inglés, hasta 100 caracteres, sin cuerpo; uno por tarea.

## Foco de revisión

1. **Corregir con la red cortada a la mitad** (editar, anular o cambiar el medio y que no llegue la respuesta): el reintento con el mismo código devuelve lo mismo; con otros datos, `conflict` con un texto que no invita a repetir. → Tareas 2 a 4 (base) y 7 a 8 (celular).
2. **Deshacer después de otro cambio** (editar, avanzar, y tocar «Deshacer» de la edición): no deshace lo que ya no es lo último. → Tareas 2 y 3.
3. **Anular un pedido entregado y pagado con dos medios:** la devolución por defecto es todo lo pagado, con un medio; los pagos originales quedan y su día no cambia. → Tareas 3 y 7.
4. **La sugerencia con poca historia o con pedidos para otro día:** con menos de 7 días no sugiere, y los pedidos para otro día no inflan el promedio. → Tarea 5.
5. **Tocar dos veces «Seguir» o «Guardar», o volver durante «Guardando…»:** nunca dos pantallas iguales apiladas ni dos pedidos. → Tarea 1.

---

### Task 1: Navegación suave y con flujo

**Archivos:**
- Modificar: `src/app/(main)/_layout.tsx` (`animation: "ios_from_right"`), `src/app/(main)/(tabs)/_layout.tsx` (`animation: "shift"`).
- Reemplazar `src/app/(main)/orders/new.tsx` por `orders/new/_layout.tsx` (Stack con `OrderDraftProvider`), `orders/new/index.tsx` (paso 1) y `orders/new/details.tsx` (paso 2); crear `orders/saved/[id].tsx` (guardado, en la pila de `(main)`).
- `src/features/orders/`: `hooks/draft-context.ts` (contexto y `useDraft()`), `components/order-draft-provider.tsx`, `components/draft-items-step.tsx`, `components/draft-details-step.tsx`, `components/saved-order.tsx`; borrar `components/new-order.tsx`.
- Prueba: `src/test/routes/new-order.test.tsx`.

**Interfaces:**
- `useDraft(): ReturnType<typeof useOrderDraft>` (falla si no hay `OrderDraftProvider`).
- `DraftItemsStep({ onBack, onNext })`, `DraftDetailsStep({ onBack, onSaved: (order: Order) => void })`, `SavedOrder({ orderId, onAnother })` (lee `orderQuery(orderId)`; `useCreateOrder` ya lo dejó en la caché).
- Navegación: paso 1 «Seguir» → `router.push("/orders/new/details")`; al guardar → `router.replace({ pathname: "/orders/saved/[id]", params: { id } })`; «Anotar otro pedido» → `router.replace("/orders/new")`.

- [ ] **Paso 1: Las pruebas que fallan** (rutas de verdad): + → Un pedido → «Seguir» → paso 2 → `testRouter.back()` vuelve al paso 1 con lo elegido; «Seguir» → guardar → «Pedido #0042 guardado»; ahí «Volver» lleva a Inicio (en la pila de `(main)` no queda `orders/new`); «Anotar otro pedido» abre el paso 1 vacío. Dos toques seguidos en «Seguir» dejan una sola pantalla del paso 2 en la pila.
- [ ] **Paso 2:** fallan. **Paso 3:** las rutas y los pasos (el «Seguir» se apaga mientras navega). **Paso 4:** pasan, más `pnpm test`, `lint` y `typecheck`. **Paso 5: Commit** — `feat: make new order steps real screens and animate every screen change`.

---

### Task 2: Editar un pedido y su «Deshacer» (base)

**Archivos:** `supabase/migrations/<fecha>_edit_order.sql`; prueba `supabase/tests/094_edit_order.test.sql`; regla 8; `docs/spec/orders.md` y `stock.md` (los cambios de arriba).

**Interfaces:**
- `public.edit_order(p_request_id uuid, p_order_id uuid, p_expected_version integer, p_lines jsonb, p_refund_cents integer, p_refund_method text) returns jsonb` → `order_json`.
  - Solo sin entregar ni anular y no de mostrador (`invalid`); versión distinta → `conflict`.
  - Líneas `[{ productId, quantity 1..10000 }]` sin repetir: las que ya estaban conservan precio y costo (aunque el alfajor esté apagado); las nuevas, alfajor activo del negocio al precio de hoy (`not_found` si no).
  - El descuento no puede pasar del subtotal nuevo más el delivery (`invalid`).
  - Total nuevo < pagado → `p_refund_cents` = pagado − total nuevo y un medio activo, que crea una devolución; si no, `invalid`. Total nuevo ≥ pagado con devolución → `invalid`.
  - Stock: la diferencia por alfajor como `sale` (más) o `cancellation` (menos), con `order_id`.
  - Rehace resumen, cantidad, subtotal y total (`private.refresh_order_totals(p_order_id)`, nueva); el cliente suma la diferencia a `spent_cents`; sube la versión.
  - Anota en `private.audit_log` (`orders`, `update`) `old_data = { kind: "edit", lines, refundId }` y `new_data = { version }`.
- `public.revert_edit(p_order_id uuid, p_version integer) returns jsonb`: la versión actual tiene que ser `p_version` (`conflict`); el último registro de ese pedido es esa edición, de menos de 10 minutos (`invalid`). Vuelve a las líneas guardadas, devuelve la diferencia de stock, anula la devolución de esa edición (`void_reason` «Deshacer edición») y sube la versión.

- [ ] **Paso 1: Las pruebas que fallan:** editar cambia líneas, deja el precio viejo en las que estaban y pone el de hoy en la nueva (el precio cambia entre crear y editar), mueve el stock con la diferencia y rehace el resumen; versión vieja → `conflict`; entregado → `invalid`; por debajo de lo pagado sin devolución → `invalid`, con la diferencia exacta → devolución y pagado = total; el mismo código dos veces edita una vez; `revert_edit` deja todo como antes y anula la devolución; después de 10 minutos → `invalid`; editar, avanzar y deshacer la edición → `conflict` (foco 2); el segundo «Deshacer» → `conflict`.
- [ ] **Paso 2–4.** **Paso 5:** `db:push`, `db:types`, commit — `feat: add order editing with refunds and its undo`.

---

### Task 3: Anular un pedido y su «Deshacer» (base)

**Archivos:** `supabase/migrations/<fecha>_cancel_order.sql`; prueba `supabase/tests/095_cancel_order.test.sql`; regla 8.

**Interfaces:**
- `public.cancel_order(p_request_id uuid, p_order_id uuid, p_reason text, p_refund_cents integer, p_refund_method text) returns jsonb` → `order_json`.
  - En cualquier estado menos anulado (`invalid`); motivo de 1 a 120 letras.
  - Devolución de 0 a lo pagado, con un medio activo si es más de 0 (`invalid`): una fila `refund` con la fecha de hoy; los pagos originales quedan; pagado baja.
  - Stock: cada línea vuelve con `cancellation`. Evento `cancelled`.
  - Cliente: `orders_count − 1`, `spent_cents − total`. Los sellos: `private.remove_stamp` llega con la fidelidad (fase 7).
  - Registro: `old_data = { kind: "cancel", refundId }`; sube la versión.
- `public.revert_cancel(p_order_id uuid) returns jsonb`: anulado (`conflict` si no); su evento es el último y de menos de 10 minutos (`invalid`). Marca el evento deshecho, vuelve al estado anterior (borra el motivo), vuelve a restar el stock, anula la devolución de esa anulación y repone los totales del cliente.
- `private.order_json` suma `cancelReason`.

- [ ] **Paso 1: Las pruebas que fallan:** anular uno nuevo devuelve el stock y queda con su motivo y su evento; con 2,000 pagados devolviendo 1,000 → una devolución de hoy, el pago original intacto, pagado 1,000; devolver más de lo pagado o con un medio apagado → `invalid`; anular uno entregado y pagado con dos medios (foco 3) devuelve el stock, saca el pedido de «Por cobrar» y de los totales del cliente; una venta de mostrador anulada con todo devuelto conserva su número; el mismo código dos veces anula una vez; `revert_cancel` repone estado, stock, pagado y cliente; pasados 10 minutos → `invalid`; el segundo → `conflict`.
- [ ] **Paso 2–4.** **Paso 5:** `db:push`, `db:types`, commit — `feat: add order cancellation with partial refunds and its undo`.

---

### Task 4: Cambiar el medio de pago y Por cobrar (base)

**Archivos:** `supabase/migrations/<fecha>_payment_method_receivables.sql`; prueba `supabase/tests/096_payment_method_receivables.test.sql`; regla 8; `supabase/perf/cases.mjs` (`list_receivables`).

**Interfaces:**
- `public.change_payment_method(p_request_id uuid, p_payment_id uuid, p_method text) returns jsonb` → `order_json` de su pedido. Pago o devolución sin anular (`not_found` / `invalid`), medio activo y distinto (`invalid`). Anula el movimiento («cambio de medio de pago») y crea otro igual (tipo, monto y `paid_at`) con el medio nuevo. El pagado no cambia; registro; versión.
- `public.list_receivables(p_limit integer default 20, p_cursor text default null) returns jsonb`: `{ items: [{ id, number, customerName, customerPhone, fulfillment, status, totalCents, paidCents, dueDate, scheduledFor, remind }], meta: { limit, total, hasMore, nextCursor, totalDueCents } }`, con saldo y sin anular, del número mayor al menor (índice `orders_to_collect_idx`). `remind` = entregado o pagado > 0.

- [ ] **Paso 1: Las pruebas que fallan:** cambiar de efectivo a Yape deja el viejo anulado con su motivo y uno nuevo con el mismo monto y la misma fecha; lo cobrado ese día por medio cambia y el total del pedido no; el mismo medio, uno apagado o un pago ya anulado → `invalid`; una devolución también cambia; el mismo código dos veces cambia una vez. Por cobrar: solo con saldo y sin anular, del mayor al menor, `remind` en entregado y en adelanto (no en uno sin pagar ni entregar), `totalDueCents`, páginas con cursor y otro dueño no ve nada.
- [ ] **Paso 2–4**, más `pnpm db:perf` con su caso. **Paso 5:** `db:push`, `db:types`, commit — `feat: add payment method changes and the receivables list`.

---

### Task 5: La venta esperada: sugerencia, alcance y «Cómo se vende» (base)

**Archivos:** `supabase/migrations/<fecha>_expected_sales.sql`; prueba `supabase/tests/097_expected_sales.test.sql`; regla 8; `supabase/perf/cases.mjs`.

**Interfaces:**
- `private.expected_sales(p_business_id uuid) returns table (product_id uuid, dow integer, average numeric)`: historia desde `greatest(hoy − 28, primera venta)` hasta ayer (días de Lima), con menos de 7 días no devuelve nada. Cuenta las líneas de los pedidos sin anular y sin `scheduled_for`, por `due_date`; `dow` ISO (1 lunes … 7 domingo); `average` = unidades de ese día de la semana ÷ veces que ese día aparece en la historia.
- `public.production_suggestion() returns jsonb`: `{ ready, horizonDays, items: [{ productId, name, imageUrl, suggested, expected, weekdayUnits, weekdayDays, weekendUnits, weekendDays, minStock, onHand }] }`, alfajores activos; horizonte de mañana a `production_interval_days` días; `expected` = techo de la suma; `suggested = greatest(0, expected + min_stock − on_hand)`. Sin historia: `ready: false`, `items: []`.
- `public.product_sales_by_weekday(p_product_id uuid) returns jsonb`: `{ ready, days: [{ dow, average }] }` con los 7 días.
- `public.stock_overview()` suma `coverageDays` (0 a 7, o null sin historia): días desde mañana que cubre lo libre restando la venta esperada de cada día. `low` también si `coverageDays ≤ 1` con libre > 0.

- [ ] **Paso 1: Las pruebas que fallan** (historia insertada en días pasados): 5 al día de lunes a viernes y 9 sábados y domingos, mínimo 6, stock 13, cada 7 días → **36**, con `expected` 43, `weekdayUnits` 25 de 5 días y `weekendUnits` 18 de 2; los pedidos para otro día y los anulados no cuentan (foco 4); con 6 días de historia `ready` es falso y con 7 sugiere; el gráfico da 5 de lunes a viernes y 9 los fines de semana; con 5 todos los días, 13 libres alcanzan 2 días y 7 libres alcanzan 1 → `low` aunque pasen el mínimo.
- [ ] **Paso 2–4**, más `pnpm db:perf` (sugerencia, gráfico y `stock_overview`). **Paso 5:** `db:push`, `db:types`, commit — `feat: add expected sales with the production suggestion, coverage and weekday chart`.

---

### Task 6: Los datos de la 4b en el celular y el corte de peticiones colgadas

**Archivos:**
- `src/lib/fetch-timeout.ts` (+ prueba) y `src/lib/supabase.ts` (`global.fetch`); `src/lib/errors.ts` (`AbortError` → `offline`).
- `src/features/orders/`: `schema/order.ts` (`cancelReason`, `receivableSchema`), `api/orders.ts` y `api/corrections.ts`, `queries/keys.ts`, `queries/orders.ts` (`receivablesQuery`), `queries/mutations.ts`, `hooks/use-order-changes.ts` y `hooks/use-order-corrections.ts` (una fila por pedido), `rules/receivable.ts` (+ prueba).
- `src/features/stock/`: `schema/stock.ts` (`coverageDays`, sugerencia, gráfico), `api/stock.ts`, `queries/stock.ts`, `rules/coverage.ts` y `rules/suggestion.ts` (+ pruebas).

**Interfaces:**
- `fetchWithTimeout(input, init, ms = 20_000)`: corta con `AbortController`.
- Hooks con su pedido: `useAdvanceOrder(orderId)`, `useRevertStatus(orderId)`, `useAddPayment(orderId)`, `useEditOrder(orderId)`, `useRevertEdit(orderId)`, `useCancelOrder(orderId)`, `useRevertCancel(orderId)`, `useChangePaymentMethod(orderId)`, con `scope: { id: \`order:${orderId}\` }`; crear y vender sin fila.
- `receivableReason(item, now)`: «Entregado, quedó debiendo», «Adelanto de S/ 20.00, entrega el jueves 19», «Se cobra al recoger», «Se cobra al entregar».
- `stockLine(item)` con `coverageDays`: 0 → «No alcanza para mañana»; 1 → «Alcanza hasta mañana»; 2 a 6 → «Alcanza hasta el viernes» (el día de la semana); 7 → «Alcanza para más de una semana»; sin historia → «Mínimo 6». `coverageShort(item)`: «0 días», «Revisar», «7+ días», «2 días».
- `suggestionTitle(total, horizonDays)`: «Esta semana conviene hacer 145 alfajores» o «Para los próximos 10 días conviene…»; `whyText(item, horizonDays)`: «Vende unas 5 al día de lunes a viernes y 9 los sábados y domingos: 43 en la semana. Más tu mínimo (6), menos lo que tienes (13): 36.» (con stock negativo: «más las 2 que vendiste de más»; con 0: «y hoy no tienes ninguno»).

- [ ] **Paso 1: Las pruebas que fallan:** una petición que no responde se corta a los 20 s y llega como `offline`; las respuestas nuevas se revisan con Zod; un «Deshacer» de un pedido espera a su cambio y no a los de otro pedido; las cuentas de alcance, sugerencia y por cobrar con los ejemplos de la maqueta (100 %).
- [ ] **Paso 2–4.** **Paso 5: Commit** — `feat: add the phase 4b data layer, per-order queues and a request timeout`.

---

### Task 7: Un pedido: editar y anular, con sus «Deshacer»

**Archivos:** `src/features/orders/components/edit-order-sheet.tsx`, `cancel-order-sheet.tsx`, `order-corrections.tsx`, `order-detail.tsx`; `src/components/ui/button.tsx` (variante `danger`: letra roja sobre rojo suave).

**Interfaces:**
- `EditOrderSheet({ order, onClose, onDone })`: los alfajores con su precio de cada uno (el viejo si estaba), «Nuevo total: S/ X»; por debajo de lo pagado, «Devuelves S/ X» con su medio; «Guardar cambios» o «Deja al menos un alfajor». Aviso: «Pedido #0042 actualizado: S/ 48.00» con «Deshacer».
- `CancelOrderSheet({ order, onClose, onDone })`: «Anular el pedido #0042», «Los alfajores vuelven al stock. El pedido no se borra: queda como anulado, con su motivo.», motivos «El cliente canceló», «Error al anotar», «Sin stock», «Otro»; con pagos, «¿Devolviste el dinero?» con todo lo pagado por defecto (se puede bajar) y su medio; «Anular pedido» y «No, dejarlo como está». Aviso: «Pedido #0042 anulado» con «Deshacer».
- Un pedido anulado muestra «Pedido anulado: el cliente canceló. Los alfajores volvieron al stock.» y no muestra acciones.

- [ ] **Paso 1: Las pruebas que fallan:** editar manda la versión y las líneas y muestra el total nuevo; por debajo de lo pagado pide la devolución; con `conflict` lo explica sin invitar a repetir (foco 1); anular sin motivo no deja; con pagos, la devolución viene con todo lo pagado (foco 3); los «Deshacer» llaman `revert_edit` con la versión y `revert_cancel`; el anulado muestra su motivo.
- [ ] **Paso 2–4.** **Paso 5: Commit** — `feat: edit and cancel orders with refunds and undo from the order screen`.

---

### Task 8: Cambiar el medio de un pago

**Archivos:** `src/features/orders/components/change-method-sheet.tsx`, `order-payments.tsx`.

**Interfaces:** en cada pago o devolución, «Cambiar medio» abre `ChangeMethodSheet({ order, payment, methods, onClose, onDone })` con los medios activos menos el actual; aviso «Medio cambiado: Yape». Las devoluciones se leen «Devolución» con su medio y «−S/ X».

- [ ] **Paso 1: Las pruebas que fallan:** cambiar manda el pago y el medio con su código; el mismo código en el reintento; la devolución se lee como tal. **Paso 2–4.** **Paso 5: Commit** — `feat: change the method of a payment or refund`.

---

### Task 9: Por cobrar

**Archivos:** `src/features/orders/components/receivables.tsx`, `receivable-row.tsx`, `order-list.tsx` (la tarjeta del filtro); `src/features/messages/components/message-button.tsx`; ruta `src/app/(main)/orders/receivables.tsx` y `(tabs)/orders.tsx`.

**Interfaces:**
- `Receivables({ onBack, onOpen })` (PANTALLAS.porcobrar): «Te deben S/ X», «N pedidos», cada fila con su motivo (`receivableReason`) y lo que falta; «Recordar a Ana» si corresponde, o «Sin recordatorio todavía»; la nota «El recordatorio solo aparece si ya entregaste o si recibiste un adelanto.»; páginas; vacío «Nadie te debe» y «Todo lo entregado está cobrado. Cuando quede un saldo, aparece aquí.»; sin internet «Sin conexión. Ves los saldos de las 11:32.».
- `MessageButton({ templateKey, context, phone, label })`: abre WhatsApp con el texto lleno (sin burbuja).
- En Pedidos, con «Por cobrar» elegido: la tarjeta «Te deben S/ X» con «Ver por cobrar».

- [ ] **Paso 1: Las pruebas que fallan:** los motivos y montos de cada fila; «Recordar» abre WhatsApp con `balance_reminder` lleno; una fila abre el pedido; el recorrido Pedidos → Por cobrar → atrás con rutas de verdad. **Paso 2–4.** **Paso 5: Commit** — `feat: add the receivables screen with WhatsApp reminders`.

---

### Task 10: El «Deshacer» de la venta de mostrador

**Archivos:** `src/features/orders/components/counter-sale.tsx`.

**Interfaces:** el aviso «Venta guardada: #0043, S/ 24.00.» lleva «Deshacer»: anula con el motivo «Venta deshecha» y la devolución completa con el mismo medio; después dice «Venta #0043 anulada, con su devolución.». El número queda usado.

- [ ] **Paso 1: La prueba que falla:** «Deshacer» llama `cancel_order` con el total y el medio de la venta. **Paso 2–4.** **Paso 5: Commit** — `feat: undo a counter sale by cancelling it with a full refund`.

---

### Task 11: Stock: la sugerencia, el alcance y «Cómo se vende»

**Archivos:** `src/features/stock/components/suggestion-banner.tsx`, `stock-overview.tsx`, `production-form.tsx`, `suggested-row.tsx`, `product-stock.tsx`, `sales-by-weekday.tsx`.

**Interfaces:**
- Stock: «Esta semana conviene hacer 145 alfajores» con «Ver cuánto de cada uno» (abre Registrar producción), o «Tu producción está al día para esta semana.»; nada sin historia. Cada fila con su alcance (`stockLine`).
- Registrar producción con historia: «Lo sugerido cubre 7 días. Si produces más o menos seguido, cámbialo en Ajustes y la cuenta se ajusta sola.»; cada alfajor «Sugerido: 36», «Por qué 36» desplegable (`whyText`) y el contador empieza en lo sugerido.
- Un alfajor: «en stock», «le alcanza» (`coverageShort`) y «mínimo»; «Cómo se vende» con 7 barras (L M M J V S D) y la nota «Unas 5 al día de lunes a viernes y 9 los sábados y domingos, según las últimas 4 semanas.».

- [ ] **Paso 1: Las pruebas que fallan:** el título de la sugerencia y su botón; Registrar producción empieza en lo sugerido y explica el porqué; Un alfajor dice cuánto le alcanza y muestra la nota del gráfico. **Paso 2–4.** **Paso 5: Commit** — `feat: show the production suggestion, coverage and the weekday chart`.

---

### Task 12: Revisión completa y cierre

**Archivos:** `docs/plan/README.md` (estado), este plan («Resultado», «Lo que falta», «Lo que cambió»).

- [ ] **Paso 1:** `pnpm lint && pnpm lint:rules && pnpm typecheck && pnpm test:coverage && pnpm test:scripts && pnpm db:check` → todo pasa.
- [ ] **Paso 2: Documentar y commit** — `docs: record phase 4b results and the phone test`.

**Lo que pruebas tú en el celular** (va en «Lo que falta»): moverse por la app (pestañas, Nuevo pedido paso a paso, atrás con la flecha y con el botón del celular); editar un pedido y deshacerlo; anular uno pagado devolviendo una parte; cambiar el medio de un pago; Por cobrar y «Recordar»; la sugerencia en Stock y «Por qué»; «Cómo se vende» en un alfajor; deshacer una venta de mostrador.

---

## Resultado (2026-11-19)

La fase 4b quedó construida en la rama `fase-4b`, con un commit por tarea y uno de formato.

| Comprobación | Resultado |
|---|---|
| `pnpm test:coverage` | 510 pruebas; 100 % en `lib/{money,dates,errors}`, `theme/tokens` y las cuentas de `features/*/rules` |
| `pnpm db:check` | Pasa entera: 543 pruebas de la base en 27 archivos, consejos de Supabase sin nada pendiente y tipos al día |
| `pnpm db:perf` | 25 casos, todos con índice; el más lento, buscar un nombre en 3 años de pedidos: 33 ms. La sugerencia de producción con 3 años de pedidos: 9 ms |
| `pnpm lint`, `pnpm lint:rules`, `pnpm typecheck`, `pnpm test:scripts` | Pasan |

En el proyecto de desarrollo quedaron las cuatro migraciones de la fase: editar, anular, medio de pago y por cobrar, y la venta esperada. No se cargaron pedidos DEMO.

### Lo que falta: probar en el celular

```bash
cd /home/javier/var-mar/app && pnpm start --tunnel
```

Ingresa con el dueño DEMO (900 000 101, el PIN de tu `.env.local`):

1. **Moverte por la app:** cambia de pestaña (se deslizan de lado). + → Un pedido: elige alfajores → «Seguir»: el paso 2 entra desde la derecha. La flecha de arriba y el botón atrás del celular vuelven al paso 1 con lo que elegiste y, otra vez atrás, a donde estabas. Guarda el pedido: mientras dice «Guardando…», atrás espera; desde «Pedido guardado», atrás ya no vuelve al formulario. Dos toques seguidos en una fila o un botón abren una sola pantalla.
2. **Editar y deshacer:** abre un pedido sin entregar → «Editar pedido» → suma una Limon Kiss → «Guardar cambios». Sale «Pedido #000X actualizado: S/ …»; «Deshacer» lo deja como estaba.
3. **Anular devolviendo una parte:** un pedido con adelanto (por ejemplo S/ 20 con Yape) → «Anular» → «El cliente canceló» → baja el monto devuelto a 10 → «Anular pedido». El pedido dice «Pedido anulado: el cliente canceló…», en Pagos aparece «Devolución: Yape» con −S/ 10.00 y, en Stock, los alfajores volvieron.
4. **Cambiar el medio:** en un pago, «Cambiar medio» → Efectivo → «Guardar medio». Sale «Medio cambiado: Efectivo».
5. **Por cobrar:** Pedidos → filtro «Por cobrar» → «Ver por cobrar». En un pedido entregado con saldo, o con adelanto, «Recordar a …» abre WhatsApp con el recordatorio del saldo. Una fila abre su pedido; atrás vuelve a Por cobrar y, otra vez atrás, a Pedidos.
6. **Deshacer una venta de mostrador:** + → Una venta de mostrador → cobra → «Deshacer» en el aviso. Sale «Venta #000X anulada, con su devolución.» y en Pedidos se ve anulada.
7. **La sugerencia y «Cómo se vende»** necesitan 7 días de pedidos. Hoy, Stock no muestra la sugerencia, Registrar producción dice «Todavía no hay ventas suficientes…» y un alfajor no muestra el gráfico; «le alcanza» solo aparece si está sin stock («0 días») o hay que revisarlo. Desde el séptimo día con pedidos aparecen solos.

### Lo que cambió respecto de este plan

**Tarea 1**
- El pedido guardado tiene su propia pantalla (`orders/saved/[id]`), que reemplaza todo el recorrido: atrás desde ahí vuelve a donde empezaste. «Anotar otro pedido» abre un recorrido nuevo.
- «Seguir» usa `router.navigate`: un doble toque abre un solo paso 2.
- Las pruebas usan `router.back()`, como la app (`testRouter.back()` de expo-router no se movía).

**Tarea 2**
- `edit_order` revisa sus propias líneas: la que ya estaba se queda aunque su alfajor se haya apagado; una nueva necesita un alfajor activo.
- Editar, deshacer y anular comparten `private.set_order_lines` y `private.refresh_order_totals`.
- La prueba 090 buscaba «el pedido 1» en todos los negocios y fallaba con tu #0001 de la prueba en el celular; ahora busca solo en su negocio.

**Tarea 3**
- `revert_cancel` pide que la anulación sea el último cambio del pedido, en su estado y en el registro de cambios: si después se cambió el medio de un pago, ya no se deshace.
- Los totales del cliente nunca bajan de cero al anular.

**Tarea 4**
- `change_payment_method` toma primero el pedido, como todo cambio de un pedido, y también corrige el medio de una devolución de un pedido anulado.

**Tarea 5**
- La historia empieza en el primer pedido sin anular del negocio. El promedio de cada día divide por las veces que ese día cae en la historia: los días sin ventas cuentan como cero.
- Un alfajor que no se vende alcanza «para más de una semana» y no queda en «poco» por el alcance.

**Tarea 6**
- Las llamadas nuevas viven en `api/orders.ts` (el plan decía `api/corrections.ts`). Sin devolución, la app manda 0 y un medio vacío: los tipos generados piden los dos.
- `CACHE_SCHEMA` sube a 3: lo guardado en el celular con la forma anterior se descarta una vez.
- Una petición que pasa 20 s sin respuesta se corta y se ve como «Sin conexión».

**Tarea 7**
- Anular empieza sin motivo marcado (la maqueta marcaba «El cliente canceló»): el motivo siempre lo elige el dueño. «Otro» se guarda tal cual, sin campo de texto, como en la maqueta.
- «Anular» también aparece en un pedido entregado (lo decidiste el 2026-11-18); «Editar pedido», solo antes de entregar.
- Al editar por debajo de lo pagado, el medio de la devolución empieza sin elegir; al anular, empieza con todo lo pagado y el medio del último pago.

**Tarea 8**
- «Cambiar medio» es un enlace bajo el monto de cada pago o devolución, y no aparece si no hay otro medio activo. El botón de la hoja dice «Guardar medio».

**Tarea 9**
- La entrada es la tarjeta «Te deben S/ X» del filtro «Por cobrar» de Pedidos, hasta que llegue Inicio.
- «Recordar a …» funciona sin señal (WhatsApp guarda el mensaje). Un saldo que tocaría recordar, pero sin teléfono, dice «Sin teléfono».
- Por cobrar llega de 20 en 20 con «Cargar N más», sin tirar para recargar: cada cambio de un pedido ya la refresca.

**Tarea 10**
- El «Deshacer» de la venta pide su propio código al tocarlo y va en la fila de cambios de esa venta. Si falla, el aviso dice por qué, y la venta se puede anular desde su pedido.

**Tarea 11**
- La sugerencia de Stock abre Registrar producción también sin señal: ahí se ve lo sugerido que quedó guardado.
- Registrar producción espera la sugerencia solo mientras se pide: sin señal y sin nada guardado, abre como sin historia.
- La nota del gráfico dice «según las últimas 4 semanas» aunque la historia sea más corta (de 7 a 27 días).

## Después de la revisión final (2026-11-20)

Un revisor nuevo revisó toda la rama: «listo para juntar, con correcciones», sin nada crítico. Se corrigió en una pasada, cada cosa con la prueba que la mostraba fallar:

- **Salir de Nuevo pedido mientras dice «Guardando…»** podía dejarte en «Pedido guardado» sin pestañas ni salida, o reemplazar la venta de mostrador que abriste mientras tanto. Ahora atrás espera a que termine de guardar. En Expo Router 58 no existe el aviso `beforeRemove`: se usa `usePreventRemove`.
- **«Deshacer»:** un segundo toque con la señal lenta decía «ya no se puede deshacer» aunque sí se había deshecho. Ahora el aviso se cierra al tocarlo; y si falla por la señal, vuelve a ofrecer «Deshacer», porque la base lo acepta por 10 minutos.
- **Un pedido anulado decía «Falta cobrar»** en Pagos. Ahora dice «Anulado: no se cobra.» y, si no devolviste todo, «Te quedaste con S/ X».
- **Anular y cambiar el medio,** ante un cambio que ya se había guardado con otros datos, decían «vuelve a intentar». Ahora piden cerrar la hoja para ver cómo quedó.
- **En Por cobrar,** un adelanto para un día que ya pasó decía «entrega el ayer»; ahora dice «era para ayer» o «era para el lunes 16».
- **Dos toques seguidos** en una fila, un botón o el + abrían dos pantallas iguales. Ahora todo se abre con `router.navigate` y queda una sola.
- **Reglas del proyecto:** las cuentas de la vista previa de editar y de la sugerencia pasaron a `rules/`, con sus pruebas (la vista previa de editar ya no muestra un total negativo), y los conceptos nuevos están en el glosario.
- **Pruebas:**
  - Una prueba del gráfico esperaba una consulta y leía otra: fallaba solo con la máquina ocupada. Ahora espera lo que lee.
  - Otra daba por hecho que el pedido de ejemplo era de hoy, y falló pasada la medianoche en Lima. Ahora usa la fecha del día.
  - Dos archivos de prueba que pasaban de 250 líneas se dividieron.

Comprobado: 521 pruebas de la app (100 % en las cuentas), `lint`, `lint:rules`, `typecheck`, `test:scripts` y el formato. La base no cambió en esta pasada; sus 543 pruebas pasaron al cerrar la tarea 12.

**Quedan para después (menores):**
- La vista previa del stock después de un cambio conserva el alcance anterior hasta recargar, y su comentario no menciona el «poco» por alcance.
- «Cámbialo en Ajustes» en Registrar producción, aunque todavía no hay pantalla para los días de producción, y «los próximos 1 días» si un día se elige 1.
- La nota del gráfico dice «según las últimas 4 semanas» aunque la historia sea más corta.
- Faltan pruebas de la base para «el mismo código con otros datos» al editar, anular y cambiar el medio, y para cambiar el medio de la devolución antes de deshacer una anulación.
- Después de una respuesta perdida al editar, la hoja sigue diciendo «Sin conexión» y no ofrece «Deshacer».
- Detalles del corte de 20 s, la prueba de los bordes de pantalla sin las rutas nuevas, y los totales del cliente al deshacer una anulación que los había dejado en cero.
