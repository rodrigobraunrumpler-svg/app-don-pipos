# Fase 7a: Clientes, fidelidad y mensajes — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que el dueño sepa quién le compra y quién dejó de venir (Clientes y la ficha de cada uno), premie a los que vuelven con una tarjeta de sellos que se aplica sola como descuento, y escriba con sus propias palabras los mensajes de WhatsApp.

**Arquitectura:** tres migraciones: clientes (búsqueda sin tildes, ficha, corregir, borrar sus datos y sus pedidos), fidelidad (ajustes, movimientos de sellos, el canje dentro de `create_order` y una sola función que deja los sellos de cada pedido en lo justo) y plantillas (cambiar y volver al original). En el celular: el módulo `customers` crece (lista y ficha), llega `loyalty` (sus cuentas, la tarjeta y la pantalla Fidelidad) y `messages` suma su pantalla. Pedidos aplica el premio en el paso 2 y pone los sellos en el mensaje de entregado.

**Stack:** Postgres (plpgsql, pgTAP, `pg_trgm`, `btree_gin`, `unaccent`), supabase-js `rpc`, TanStack Query 5, Zod, Expo Router, FlashList. Sin librerías nuevas.

**Especificación:** `docs/spec/customers.md`, `docs/spec/loyalty.md`, `docs/spec/messages.md`, `docs/spec/README.md` (lo común), `docs/PROJECT_CONTEXT.md` (D14, D15, D17, §7 la pregunta de la fidelidad, §12 datos personales) y la maqueta: `assets/donpipos-2.js` (`PANTALLAS.clientes`, `PANTALLAS.cliente`, `tarjetaSellos`, `PANTALLAS.fidelidad`, `PANTALLAS.mensajes`, `contexto` con `{sellos}`) y `assets/donpipos.js` (el premio en `pedido2`).

## Lo que entra

- **Clientes** (en Más → Tu negocio): buscar por nombre o teléfono, «Todos», «Los que más compran» y «No vuelven» (con «Escribirle» si aceptó promociones); cargando, vacío y sin señal.
- **Ficha del cliente:** WhatsApp y Llamar; pedidos, gastado y último; su tarjeta de sellos y su favorito; dirección, nota y «Acepta recibir promociones»; sus pedidos; corregir sus datos; «Borrar datos de este cliente».
- **Fidelidad** (en Más → Ajustes): encenderla, por compra o por alfajor, la meta, el premio, «Así la ve el cliente» y «Cerca del premio».
- **El premio en Nuevo pedido** («Sofía tiene su premio listo» → «Aplicar») y **los sellos en el mensaje de entregado.**
- **Mensajes de WhatsApp** (en Más → Ajustes): cada texto con sus marcadores, la vista previa mientras se escribe y «Volver al texto original».
- **En la fase 7b:** la puesta en marcha y el consejo de la primera vez, los recordatorios del celular, las hojas de «Medios de pago», «Delivery» y «Producción», y la campana de Inicio.

## Cambios respecto de la especificación

Se escriben en las especificaciones en la tarea 1, antes de la base.

1. **La fase 7 va en dos partes,** como la 4: 7a (`customers.md`, `loyalty.md`, `messages.md`) y 7b (`businesses.md` con la puesta en marcha y las hojas de ajustes, `reminders.md`, el consejo y la campana de Inicio). Cada una termina en algo que se prueba en el celular.
2. **Una sola función para los sellos de un pedido:** `private.sync_order_stamps(order_id)` en vez de `add_stamp` y `remove_stamp`. Deja el neto de sellos de entrega del pedido en lo que debe ser: sus sellos (1, o sus alfajores si es por alfajor) si está entregado, tiene cliente y la fidelidad está activa; 0 si no está entregado. Con la fidelidad apagada no suma, pero sí quita. La llaman `advance_order`, `revert_status`, `cancel_order`, `revert_cancel` y `edit_order`. Así entregar, deshacer, volver a entregar, anular o corregir un pedido entregado siempre deja la cuenta justa.
3. **El canje lo pide el borrador con `redeemReward: true`.** La base calcula el premio (el alfajor más barato del pedido, el descuento sin pasar del total, u «otro premio» en 0) y pone el descuento con el motivo «Fidelidad». Con el premio, el borrador no trae otro descuento (`invalid`). Deshacer la anulación de un pedido canjeado vuelve a canjear; si el cliente ya no tiene esos sellos, responde `conflict`.
4. **Borrar los datos de un cliente borra también los de sus pedidos:** su nombre pasa a «Cliente eliminado» (la maqueta decía «Cliente borrado»; manda la especificación), la dirección de sus deliverys a «Dirección eliminada» (un delivery necesita una) y la nota de sus pedidos queda vacía. También son datos personales (Ley 29733).
5. **La búsqueda no distingue tildes ni mayúsculas:** «lucia» encuentra a «Lucía R.». Los dígitos buscan en el teléfono: «987 654» encuentra a +51 987 654 321.
6. **Los pedidos de un cliente** se leen con una función nueva de pedidos, `list_customer_orders`: `list_orders` no filtra por cliente.
7. **«No vuelven»** va del que dejó de venir hace menos al que hace más (el más fácil de recuperar arriba). Los clientes que más compran de `report_ranking` se ven en «Los que más compran».
8. **Fidelidad:** la unidad («Por compra» o «Por alfajor») se elige en la pantalla. La meta va de 3 a 30 por compra y de 5 a 100 por alfajor. Mientras está apagada, la fila guarda una regla de ejemplo (10 compras, 1 alfajor gratis), la de la pregunta de `PROJECT_CONTEXT.md` §7. No es una regla del negocio: no se usa hasta que el dueño la revise y la encienda.

## Restricciones globales

- **Siguen las de las fases 1 a 6:** un solo proyecto (el de desarrollo), la CLI por `pnpm sb`, primero la prueba, una migración enviada no se edita (se reemplaza con `create or replace` en una nueva, y con `drop function` si cambia la firma), `private.fail` para los errores, cada función nueva para la app en la regla 8 (`900_structure`), JSON en camelCase, fechas ISO con milisegundos y «Z», `orNull`/`rpcResult` de `lib/rpc.ts`.
- **Cada migración:** `pnpm test:db`, `pnpm db:push`, `pnpm db:types` y `pnpm db:perf` (menos de 50 ms, sin leer tablas enteras). Las extensiones van en el esquema `extensions`.
- **Escrituras:** solo por funciones `security definer` en `private` con su envoltura en `public`; con versión → `conflict`. Cambiar la fidelidad o una plantilla queda en `private.audit_log`.
- **Datos personales:** nada del cliente en registros ni en mensajes de error. Lo de prueba lleva «(DEMO)».
- **Módulos:** `customers`, `loyalty` y `messages` no usan a nadie. `orders` usa `customers`, `loyalty` y `messages` por su `index.ts`; las pantallas de `src/app` arman la ficha. Cuentas en `rules/` con 100 % de cobertura.
- **Navegación:** Clientes, la ficha, Fidelidad y Mensajes en la pila de `(main)`, con `<Screen>`, abiertas con `router.navigate`; «Volver» desanda el camino. Cada pantalla con su prueba de ruta.
- **Pantallas angostas (360 dp):** lo de la izquierda con `flex-1` y `numberOfLines`, los montos con `shrink-0`. Un componente por archivo, hasta 250 líneas. Colores solo del tema.
- **Textos:** los de la maqueta; los nuevos, en su estilo. Conceptos nuevos al glosario antes del código.
- **Commits:** en inglés, hasta 100 caracteres, sin cuerpo; uno por tarea.

## Foco de revisión

1. **Los sellos se suman una sola vez:** entregar, deshacer y volver a entregar; dos toques seguidos; anular un entregado; corregir un entregado cuando la fidelidad es por alfajor. Siempre `customers.stamps` = la suma de sus movimientos. → Tarea 2.
2. **El canje y su anulación:** canjear sin sellos suficientes o con la fidelidad apagada → `invalid`; anular el pedido devuelve los sellos; deshacer la anulación los vuelve a canjear o dice que ya no se puede. → Tarea 2.
3. **Borrar los datos de un cliente:** su nombre, teléfono, dirección y nota no quedan en ninguna parte (ficha, búsqueda, pedidos, Por cobrar, exportar, mensajes). Los números del negocio no cambian, y el mismo teléfono puede volver a pedir como cliente nuevo. → Tareas 1 y 7.
4. **Una plantilla que no se puede guardar:** un marcador desconocido, un texto vacío o una edición que llegó antes. Lo escrito no se pierde y la vista previa sigue lo que se escribe. → Tareas 3 y 9.
5. **Buscar como escribe la gente:** sin tildes, con espacios o guiones en el teléfono, con «ñ». La lista sin señal muestra lo último con su hora. → Tareas 1 y 5.

---

### Task 1: Clientes en la base

**Archivos:** `docs/spec/customers.md`, `loyalty.md`, `messages.md` y `docs/plan/README.md` (los cambios de arriba), `docs/glossary.md`; migración `<fecha>_customers.sql`; prueba `supabase/tests/120_customers.test.sql`; `900_structure`; casos en `supabase/perf/cases.mjs` (decenas de miles de clientes en el negocio medido).

**Interfaces:**
- `create extension pg_trgm, btree_gin, unaccent with schema extensions`; `private.search_text(text) → text` (inmutable: minúsculas y sin tildes); índices GIN `(business_id, private.search_text(name) gin_trgm_ops)`, `(business_id, spent_cents desc)` y `(business_id, last_order_at)`.
- `search_customers(p_q text, p_filter text, p_limit int, p_cursor text) → { items: [CustomerRow], meta: { limit, total, hasMore, nextCursor } }`, con `CustomerRow = { id, name, phone, ordersCount, spentCents, lastOrderAt, acceptsPromotions }`.
  - `all`: por último pedido; `top`: por lo gastado; `lapsed`: sin pedir hace más de `lapsed_after_days`, del más reciente al más viejo.
  - `p_q` con letras busca en el nombre (sin tildes); solo dígitos (sin espacios ni guiones, con o sin 51) busca en el teléfono.
  - Sin los clientes borrados. Un filtro desconocido → `invalid`.
- `get_customer(p_id uuid) → { id, name, phone, address, note, acceptsPromotions, ordersCount, spentCents, lastOrderAt, stamps, favorite: { productId, name } | null, anonymizedAt, version }`. El favorito es el alfajor que más pide, sin anulados; si empatan, por nombre.
- `update_customer(p_id, p_expected_version, p_name, p_address, p_note, p_accepts_promotions) → el mismo JSON`. Nombre de 1 a 60 caracteres; dirección y nota vacías → `null`. Con otra versión → `conflict`; uno borrado → `invalid`.
- `anonymize_customer(p_id) → el mismo JSON`. Hace lo de la especificación, más el cambio 4. Una segunda vez devuelve lo mismo.
- `list_customer_orders(p_customer_id, p_limit, p_cursor) → { items: [OrderSummary], meta }`: los del cliente, del más nuevo al más viejo, con la misma forma que `list_orders`.
- `find_customer_by_phone` suma `stamps`.

- [ ] **Paso 1: Las pruebas que fallan:**
  - un solo cliente por teléfono;
  - «ana» encuentra «Ana Q. (DEMO)» y «Mariana (DEMO)»; «lu» y «lucia» encuentran «Lucía R. (DEMO)»; «987 654» y «51987654321» encuentran su teléfono (foco 5);
  - `lapsed` usa `lapsed_after_days` (con 7 días, uno de hace 10 entra y uno de hace 3 no);
  - `top` por lo gastado; las páginas siguen donde quedaron;
  - la ficha con su favorito;
  - corregir con otra versión → `conflict`;
  - borrar sus datos: sin nombre, teléfono, dirección ni nota en `customers`, en sus pedidos («Cliente eliminado», «Dirección eliminada», sin nota) y en `export_rows`; `home_summary` y `report_summary` iguales antes y después; el mismo teléfono vuelve a pedir como cliente nuevo (foco 3);
  - `list_customer_orders` solo los suyos;
  - otro negocio no ve nada.
- [ ] **Paso 2–4:** migración, `pnpm test:db`, `pnpm db:push`, `pnpm db:types`, `pnpm db:perf` (`search_customers` con y sin texto en cada filtro, `get_customer`, `list_customer_orders`). **Paso 5: Commit** — `feat: add customer search, profile, corrections and data erasure`.

---

### Task 2: Fidelidad en la base

**Archivos:** migración `<fecha>_loyalty.sql`; prueba `supabase/tests/121_loyalty.test.sql`; `900_structure`; casos de `loyalty_overview`.

**Interfaces:**
- Tablas `loyalty_settings` y `loyalty_stamps` como en `loyalty.md` §2, con sus índices. `private.init_business` crea la fila (los negocios que ya existen también); el disparador `audit_changes` sobre `loyalty_settings`.
- `get_loyalty_settings() → { isActive, stampUnit, goal, rewardKind, rewardAmountCents, rewardText, version }`.
- `update_loyalty_settings(p_expected_version, p_is_active, p_stamp_unit, p_goal, p_reward_kind, p_reward_amount_cents, p_reward_text) → el mismo JSON`. La meta en su rango según la unidad; `discount` necesita un monto de 1 a 100,000 céntimos; `other` necesita un texto de 1 a 60 caracteres. Fuera de eso → `invalid`; con otra versión → `conflict`.
- `loyalty_overview(p_limit int) → { goal, customers: [{ customerId, name, stamps }] }`: con la fidelidad activa, los que tienen la meta − 2 sellos o más, de más a menos.
- `private.sync_order_stamps(p_order_id)` (cambio 2), con el pedido bloqueado. La llaman las versiones nuevas (`create or replace`) de `private.advance_order`, `private.revert_status`, `private.cancel_order`, `private.revert_cancel` y `private.edit_order`.
- `private.create_order` acepta `redeemReward` (cambio 3): mueve `-meta` con `redeemed`. `private.cancel_order` devuelve lo canjeado (`redeem_returned`) y `private.revert_cancel` lo vuelve a canjear.
- `private.order_json`: `customer` suma `stamps`.

- [ ] **Paso 1: Las pruebas que fallan** (foco 1 y 2):
  - entregar suma 1; por alfajor, un pedido de 3 alfajores suma 3;
  - dos `advance_order` seguidos no suman dos veces;
  - entregar, deshacer y volver a entregar deja 1;
  - anular un entregado lo quita;
  - corregir un entregado por alfajor de 3 a 5 deja 5;
  - con la fidelidad apagada no suma;
  - canjear resta la meta y pone el descuento «Fidelidad» (alfajor gratis: 2 Coquetas a S/ 12.00 + 1 Pipo Crush a S/ 13.00 → S/ 12.00);
  - canjear con menos sellos que la meta, apagada o con otro descuento → `invalid`;
  - anular el canjeado devuelve los sellos; deshacer la anulación los vuelve a canjear, o `conflict` si ya no están;
  - `customers.stamps` = la suma de los movimientos después de cada caso;
  - la meta fuera de rango → `invalid`; otra versión → `conflict`; el cambio queda en el registro;
  - `loyalty_overview` en su orden;
  - otro negocio no ve nada.
- [ ] **Paso 2–4:** migración, `pnpm test:db` (las pruebas de pedidos 05x–09x siguen pasando), `pnpm db:push`, `pnpm db:types`, `pnpm db:perf`. **Paso 5: Commit** — `feat: add the stamp card with stamps kept exact on every order change`.

---

### Task 3: Las plantillas en la base

**Archivos:** migración `<fecha>_templates.sql`; prueba `supabase/tests/122_templates.test.sql`; `900_structure`.

**Interfaces:**
- `update_template(p_key, p_expected_version, p_body) → { key, body, version, isDefault }`: marcadores de esa plantilla según `messages.md` (los mismos de `placeholders.ts`), texto de 1 a 500 caracteres; si no, `invalid`. Con otra versión → `conflict`.
- `reset_template(p_key) → lo mismo`, con el texto de `private.default_templates`.
- `list_templates()` suma `isDefault`. El disparador `audit_changes` sobre `message_templates`.

- [ ] **Paso 1: Las pruebas que fallan:** un negocio nuevo tiene sus textos por defecto; `{sellos}` en `on_the_way` o `{precio}` en cualquiera → `invalid`; vacío → `invalid`; otra versión → `conflict`; `reset_template` vuelve al original con `isDefault`; el cambio queda en el registro; otro negocio no ve nada. **Paso 2–4.** **Paso 5: Commit** — `feat: let the owner edit and reset the WhatsApp templates`.

---

### Task 4: El módulo de clientes en el celular

**Archivos:** `src/features/customers` (esquemas, `api/`, `queries/`, mutaciones, `hooks/`), `src/components/ui/avatar.tsx`.

**Interfaces:**
- `customersQuery(filter: 'all' | 'top' | 'lapsed', search: string)` (infinita, de 20 en 20), `customerQuery(id)`. `useUpdateCustomer()` y `useAnonymizeCustomer()` refrescan `customers` y `orders` (`meta.invalidates`).
- Los tipos `CustomerRow`, `Customer` y `CustomerFilter`.
- `Avatar({ name, muted? })`: las iniciales («Lucía R.» → «LR», «Ana» → «A», vacío → «?»), sin saber del negocio.

- [ ] **Paso 1: Las pruebas que fallan:** cada lectura y escritura llega revisada con su esquema y sus parámetros; un borrado llega con `anonymizedAt`; las iniciales del avatar. **Paso 2–4.** **Paso 5: Commit** — `feat: add the customers module with search, profile and erasure`.

---

### Task 5: Clientes

**Archivos:** `customers/components/customers-screen.tsx` y sus partes (`customer-row.tsx`, `lapsed-actions.tsx`, `customers-row.tsx` para Más); ruta `src/app/(main)/customers/index.tsx`; Más («Tu negocio», después de Reportes).

**Interfaces:**
- `CustomersScreen({ onBack, onOpen, lapsedAction })`: la búsqueda (se busca 300 ms después de escribir); los chips «Todos», «Los que más compran» y «No vuelven»; cada fila con su avatar, el nombre, «N pedidos, último hace X» y lo gastado.
- En «No vuelven»: si aceptó promociones, `lapsedAction(row)` pone «Escribirle». Lo arma la ruta con `MessageButton` de `messages` y el texto «te extrañamos», porque `customers` no usa a nadie. Si no aceptó, «Sin permiso para promociones». Debajo, la nota de la maqueta.
- Vacío: «Todavía no hay clientes», «Se registran solos al anotar un pedido con su teléfono.». Sin señal: «Sin conexión. Ves los clientes de las 11:32.».
- `CustomersRow`: «Clientes» con cuántos hay.

- [ ] **Paso 1: Las pruebas que fallan:** cada filtro pide lo suyo; escribir busca una vez al terminar; en «No vuelven», «Escribirle» solo con permiso, y abre WhatsApp con el texto lleno; el vacío; sin señal; Más → Clientes → la ficha → atrás (rutas de verdad). **Paso 2–4.** **Paso 5: Commit** — `feat: show customers with search, best buyers and those who stopped coming`.

---

### Task 6: Fidelidad en el celular

**Archivos:** `src/features/loyalty` (con `pnpm new:feature loyalty`): esquemas, `api/`, `queries/`, mutaciones, `rules/reward.ts`, `rules/card.ts`, `components/stamps-card.tsx`, `components/loyalty-screen.tsx` y sus partes; ruta `src/app/(main)/more/loyalty.tsx`; la fila «Fidelidad» en Más → Ajustes.

**Interfaces:**
- `loyaltySettingsQuery`, `loyaltyOverviewQuery`, `useUpdateLoyaltySettings()`.
- `isRewardReady(settings, stamps) → boolean`.
- `rewardAmount(settings, lines: { unitPriceCents, quantity }[], totalCents) → number`, con los ejemplos de `loyalty.md` §5.
- `cardText(settings, stamps) → «Le faltan 3 compras para su premio» | «Le faltan 4 alfajores para su premio» | «Le falta 1 compra para su premio» | «Premio listo»`.
- `stampsMessage(settings, stamps) → «Llevas 7 de 10 sellos para tu premio.» | «Completaste tu tarjeta de sellos: tu próximo pedido lleva 1 alfajor gratis.» | ""` (vacío si está apagada). Con un descuento, «lleva S/ 10.00 de descuento»; con otro premio, su texto.
- `rewardLabel(settings)`: «1 alfajor gratis», «S/ 10.00 de descuento» o su texto.
- `StampsCard({ settings, stamps })`: «Tarjeta de sellos», «6 de 10», un sello por casilla (hasta 30; con más, una barra) y su texto.
- `LoyaltyScreen({ onBack })`:
  - «Fidelidad activa»;
  - «Por compra» o «Por alfajor»;
  - la meta con + y −;
  - el premio en chips: «1 alfajor gratis», «Descuento» (con su monto) y «Otro premio» (con su texto);
  - «Así la ve el cliente» (6 sellos de ejemplo);
  - «Cerca del premio»;
  - «Guardar».
  - Apagada: la explicación de la maqueta, la pregunta de `PROJECT_CONTEXT.md` §7 y la regla que se guardará al encender.

- [ ] **Paso 1: Las pruebas que fallan:**
  - las cuentas con los ejemplos de arriba;
  - la tarjeta de 10 y la de 60 (barra);
  - encender, cambiar la meta (sin pasar sus límites al cambiar la unidad) y el premio, y «Guardar» manda todo;
  - un descuento sin monto no deja guardar;
  - otra versión dice que se cargó el cambio que llegó antes;
  - Más → Fidelidad → atrás (rutas de verdad).
- [ ] **Paso 2–4.** **Paso 5: Commit** — `feat: add the loyalty settings screen and the stamp card`.

---

### Task 7: La ficha del cliente

**Archivos:** `customers/components/customer-card.tsx` y sus partes (`customer-stats.tsx`, `customer-edit-sheet.tsx`, `erase-customer-sheet.tsx`); `orders/components/customer-orders.tsx` con `customerOrdersQuery(customerId)`; ruta `src/app/(main)/customers/[id].tsx`.

**Interfaces:**
- La ruta arma la ficha: `CustomerCard` (de `customers`), `StampsCard` (de `loyalty`, solo con la fidelidad activa) y `CustomerOrders` (de `orders`).
- `CustomerCard({ customer, onEdit, onErase })`:
  - «WhatsApp» (abre el chat sin texto) y «Llamar» (`tel:`);
  - pedidos, gastado y último;
  - «Su favorito: Coqueta.», la dirección y la nota;
  - «Acepta recibir promociones» (cambia al tocar, con versión);
  - «Corregir datos» abre la hoja de nombre, dirección y nota;
  - «Borrar datos de este cliente», con la hoja de la maqueta. Al confirmar, la ficha queda como la maqueta: «Datos borrados…».
- `CustomerOrders({ customerId, onOpen })`: sus pedidos con `OrderRow`, de 20 en 20.

- [ ] **Paso 1: Las pruebas que fallan:**
  - la ficha con sus datos, su favorito y su tarjeta (sin tarjeta si la fidelidad está apagada);
  - cambiar el permiso de promociones;
  - corregir con otra versión lo dice;
  - borrar pide confirmar y deja la ficha sin datos (foco 3);
  - tocar un pedido lo abre y «Volver» regresa a la ficha;
  - sin señal, las acciones se apagan.
- [ ] **Paso 2–4.** **Paso 5: Commit** — `feat: show the customer profile with stamps, orders, corrections and erasure`.

---

### Task 8: El premio en el pedido y los sellos en el mensaje

**Archivos:** `orders/components/reward-banner.tsx`, el borrador (`redeemReward`), `draft-details.tsx` y los totales del paso 2; `orders/rules/message.ts` (`sellos`); `order-detail.tsx` y `saved-order.tsx`.

**Interfaces:**
- `RewardBanner({ customer, lines, applied, onApply, onRemove })`. Con el premio listo: «Sofía tiene su premio listo», «1 alfajor gratis, por completar su tarjeta de sellos» y «Aplicar». Aplicado: «Premio aplicado: −S/ 12.00» y «Quitar». Mientras está aplicado, el descuento a mano se apaga.
- El borrador manda `redeemReward: true` y los totales muestran el descuento «Fidelidad» con `rewardAmount`.
- `messageContext(order, methods, sellos)`: `sellos` lo arma la pantalla con `stampsMessage(settings, order.customer.stamps)`.

- [ ] **Paso 1: Las pruebas que fallan:**
  - con el premio listo, «Aplicar» descuenta S/ 12.00 en el total y el pedido guardado manda `redeemReward`;
  - «Quitar» lo saca;
  - sin sellos suficientes o con la fidelidad apagada no aparece;
  - el mensaje de entregado dice «Llevas 7 de 10 sellos para tu premio.», y nada con la fidelidad apagada.
- [ ] **Paso 2–4.** **Paso 5: Commit** — `feat: apply the loyalty reward in a new order and add stamps to the delivered message`.

---

### Task 9: Mensajes de WhatsApp

**Archivos:** `messages/components/messages-screen.tsx` y sus partes (`template-editor.tsx`, `placeholder-chips.tsx`), `useUpdateTemplate()` y `useResetTemplate()`; ruta `src/app/(main)/more/messages.tsx`; la fila «Mensajes de WhatsApp» en Más → Ajustes.

**Interfaces:**
- `MessagesScreen({ onBack })`: cada plantilla como un acordeón con su nombre de la maqueta («Confirmación del pedido», «En camino», «Listo para recoger», «Entregado», «Recordatorio de saldo», «Te extrañamos (solo con permiso)») y el comienzo de su texto. Abierta:
  - el texto, que se escribe;
  - los chips de sus marcadores (solo los que esa plantilla vale), que se insertan donde está el cursor;
  - «Así le llega (con el pedido #0042)», la burbuja con datos de ejemplo, que cambia mientras se escribe;
  - «Guardar», que se apaga si el texto no cambió, está vacío o trae un marcador que no vale (lo dice);
  - «Volver al texto original», solo si no es el original.
- Con otra versión: «Otro cambio llegó antes: se cargó el texto nuevo.» y lo escrito queda en el campo (foco 4).

- [ ] **Paso 1: Las pruebas que fallan:**
  - escribir cambia la vista previa;
  - un chip se inserta en el cursor;
  - un marcador que no vale apaga «Guardar» y lo dice;
  - «Guardar» y «Volver al texto original» mandan lo suyo;
  - un `conflict` no borra lo escrito;
  - Más → Mensajes → atrás (rutas de verdad).
- [ ] **Paso 2–4.** **Paso 5: Commit** — `feat: add the WhatsApp templates screen with live preview`.

---

### Task 10: Revisión completa y cierre

**Archivos:** `docs/plan/README.md` (estado), este plan («Resultado», «Lo que falta», «Lo que cambió»).

- [ ] **Paso 1:** `pnpm lint && pnpm lint:rules && pnpm typecheck && pnpm test:coverage && pnpm test:scripts && pnpm db:check` → todo pasa.
- [ ] **Paso 2: Documentar y commit** — `docs: record phase 7a results and the phone test`.

**Lo que pruebas tú en el celular** (va en «Lo que falta»):
1. Anota un pedido con un teléfono nuevo: aparece en Clientes.
2. Busca sin tildes.
3. Mira «Los que más compran» y «No vuelven».
4. Abre una ficha y cambia el permiso de promociones.
5. Enciende Fidelidad con tu regla, entrega un pedido y mira la tarjeta.
6. Aplica el premio en un pedido nuevo.
7. Corrige un mensaje y vuelve al original.
8. Borra los datos de un cliente de prueba.

## Resultado (2026-11-20)

La fase 7a quedó construida en la rama `fase-7`, con un commit por tarea y dos de velocidad.

| Comprobación | Resultado |
|---|---|
| `pnpm test:coverage` | 673 pruebas; 100 % en `lib/{money,dates,errors}`, `theme/tokens` y las cuentas de `features/*/rules` |
| `pnpm db:check` | Pasa entera: 744 pruebas de la base en 35 archivos, consejos de Supabase sin nada pendiente y tipos al día |
| `pnpm db:perf` | 49 casos, todos con índice y en menos de 50 ms, con 30,000 clientes en el negocio medido: buscar 10–30 ms, la ficha 5 ms, «Cerca del premio» 1 ms |
| `pnpm lint`, `pnpm lint:rules`, `pnpm typecheck`, `pnpm test:scripts` | Pasan |

En el proyecto de desarrollo quedaron siete migraciones: clientes, dos de la búsqueda (con el índice de trigramas y su columna sin tildes), fidelidad, el orden de «Cerca del premio», buscar el texto primero y las plantillas. La fidelidad del negocio DEMO quedó apagada, con la regla de ejemplo: la enciendes tú en la prueba.

No llegaron librerías nuevas. La caché guardada en el celular cambió de forma (`CACHE_SCHEMA` 4): la primera vez que abras la app, vuelve a pedir todo.

### Lo que falta: probar en el celular

```bash
cd /home/javier/var-mar/app && pnpm start --tunnel
```

Ingresa con el dueño DEMO (900 000 101, el PIN de tu `.env.local`):

1. **Un cliente nuevo:** anota un pedido con un teléfono que no usaste. Más → «Clientes»: aparece arriba, con «1 pedido, último hoy».
2. **Buscar:** escribe un nombre sin tildes («lucia») o parte del teléfono con espacios («987 654»).
3. **Los filtros:** «Los que más compran» va numerado por lo gastado. «No vuelven» muestra a quien no pide hace más de 30 días, con «Escribirle» solo si aceptó promociones.
4. **La ficha:** toca un cliente: WhatsApp, Llamar, sus números, su favorito y sus pedidos (toca uno y «Volver» regresa a la ficha). Cambia «Acepta recibir promociones» y «Corregir datos».
5. **Fidelidad:** Más → Ajustes → «Fidelidad». Enciéndela con tu regla (por compra o por alfajor, la meta y el premio) y «Guardar». Entrega un pedido de un cliente y mira su tarjeta en la ficha. El mensaje de entregado dice «Llevas 1 de … sellos».
6. **El premio:** con un cliente que llegó a la meta, anota un pedido nuevo: en el paso 2 sale «… tiene su premio listo» → «Aplicar», y el total baja.
7. **Mensajes:** Más → Ajustes → «Mensajes de WhatsApp». Abre «En camino», cambia el texto (la burbuja cambia mientras escribes), inserta un marcador, «Guardar», y después «Volver al texto original».
8. **Borrar los datos de un cliente de prueba:** en su ficha, «Borrar datos de este cliente» → «Borrar sus datos». La ficha queda sin datos y sus pedidos dicen «Cliente eliminado».

### Lo que cambió respecto de este plan

**Tarea 1**
- Con las reglas de acceso activas, Postgres no usa un índice para `like` y revisaba a los 30,000 clientes uno por uno (un segundo). La búsqueda pasó a `private`, filtra el negocio ella misma y usa el índice de trigramas.
- El texto sin tildes se guarda en una columna calculada (`search_text`), así revisar miles de candidatos no recalcula cada nombre.
- Las páginas siguen un cursor «valor~id» y nunca repiten a nadie.
- Las respuestas guardadas para reintentos (se borran a los 7 días) pueden tener el nombre de un cliente borrado hasta que se limpian: borrarlas podía duplicar un pedido en un reintento tardío.

**Tarea 2**
- Un pedido entregado no se corrige (`edit_order` lo rechaza), así que corregir no toca los sellos.
- La misma función deja justo también el canje: anular devuelve los sellos y deshacer la anulación los vuelve a canjear (o `conflict` si ya no están).
- Quitar sellos nunca deja a un cliente en menos de 0 (ya pudo canjearlos); el movimiento anota lo que de verdad se quitó.
- «Cerca del premio» desempata por el que compró hace menos, con un índice que ya trae ese orden (por nombre, con miles de empatados, tardaba hasta 52 ms).
- Una búsqueda con texto busca primero por el índice de trigramas y después filtra: con «No vuelven» el plan a veces elegía el índice de fechas (hasta 90 ms).

**Tarea 3**
- `list_templates` compara con los textos originales con las reglas de acceso de quien lee, así que esa función quedó a su alcance (solo devuelve los seis originales).

**Tarea 4**
- Corregir y borrar refrescan Clientes; lo de otros módulos (los pedidos con su nombre) lo pide quien llama: `customers` no usa a nadie.

**Tarea 5**
- «Escribirle» vive en la fila del cliente (lo pone la ruta, con el mensaje de `messages`), sin un archivo aparte.

**Tarea 6**
- Las cuentas del formulario (el rango de la meta, el monto y el texto del premio) viven en `rules/draft.ts` con su 100 %. La vista previa usa 6 sellos de ejemplo, o uno menos que la meta si es menor.

**Tarea 7**
- La ficha recibe la tarjeta de sellos y los pedidos como piezas (`stamps`, `orders`), que pone la ruta. Un cliente borrado se ve como la maqueta: el aviso y sus números.

**Tarea 8**
- El borrador recuerda si se aplicó el premio; aplicarlo saca el descuento a mano, y si el teléfono cambia a alguien sin premio, deja de aplicarse.
- `CACHE_SCHEMA` sube a 4 porque cambió la forma de tres lecturas.

**Tarea 9**
- La burbuja pasó a `MessageBubble`, la misma en el editor y en los avisos. Lo escrito no se pierde con un `conflict`.

## Después de la revisión final (2026-11-20)

Un revisor nuevo leyó la rama entera: «lista después de arreglos», sin nada crítico. Los sellos, el canje y el borrado en la base estaban bien, y las funciones de pedidos que se volvieron a crear no perdieron nada. Se arreglaron, cada uno con su prueba:

- **Lo guardado se ve al instante.** Antes, después de guardar, la pantalla mostraba lo de antes hasta recargar: el interruptor de promociones volvía atrás, Fidelidad parecía apagarse y un segundo toque daba un falso «otro cambio llegó antes». Ahora corregir a un cliente se ve en el acto (y vuelve atrás si falla), y la fidelidad y los mensajes muestran lo que devolvió la base.
- **El descuento a mano ya no ofrece «Fidelidad».** Daba el premio sin gastar los sellos, y el cliente podía recibirlo dos veces. El premio se aplica solo con la tarjeta («Aplicar»).
- **Borrar a un cliente saca sus datos del celular.** Lo buscado con su teléfono, las listas y los pedidos guardados se borran o se vuelven a pedir, y «Cerca del premio» se refresca después de entregar, canjear o borrar.
- **No se borran los datos de un cliente con pedidos por entregar o por cobrar** (migración `20261120182558_erase_after_open_orders`). Se perdería a dónde llevarlos y a quién cobrarles. La hoja dice qué hacer antes: entregarlos y cobrarlos, o anularlos.
- **La lista de Clientes no parpadea** al cambiar de filtro o al buscar: la de antes queda atenuada hasta que llega la nueva.

`loyalty.md` y `customers.md` quedaron al día con lo decidido.

| Comprobación | Resultado |
|---|---|
| `pnpm test:coverage` | 683 pruebas, con el 100 % donde se pide |
| `pnpm db:check` | 745 pruebas de la base en 35 archivos |
| `pnpm lint`, `pnpm lint:rules`, `pnpm typecheck`, `pnpm test:scripts` | Pasan |

**Quedan para después** (no cambian plata ni datos):
- Con «Otro premio», el pedido no dice qué regalo entregar, y el aviso muestra «−S/ 0.00».
- Las respuestas guardadas para reintentos conservan el nombre de un cliente borrado hasta la limpieza de los 7 días.
- La app y la base leen distinto un marcador con tilde («{dirección}»).
- Fidelidad apagada con una regla a medio escribir da un error general al guardar.
- Un conflicto en Fidelidad o en «Corregir datos» deja lo escrito aunque dice que se cargó lo nuevo.
- Cerrar un mensaje abierto pierde lo escrito sin avisar.
- Deshacer una anulación cuyo premio ya se usó dice «El pedido cambió después».
- Faltan pruebas de la base para «ñ» en la búsqueda, para deshacer la anulación de un entregado y para Por cobrar después de un borrado.
- «El premio va en hasta 60 letras.» no puede salir: el campo ya corta en 60.
