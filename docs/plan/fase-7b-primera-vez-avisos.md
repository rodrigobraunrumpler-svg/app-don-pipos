# Fase 7b: Primera vez, avisos y ajustes — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que un dueño nuevo deje la app lista en tres pasos (sus productos, su stock de hoy, sus tipos de gasto) y llegue a Inicio con el consejo de la primera vez; que el celular le avise del pedido de mañana, del alfajor que se acaba y de quién le debe, aunque la app esté cerrada; y que cambie sus ajustes desde Más.

**Arquitectura:** una migración con `complete_setup`. En el celular, `businesses` crece: todos los ajustes, `update_settings`, las hojas de Más, la puerta de la puesta en marcha y sus tres pasos (pantallas de verdad en `src/app/setup/`). Llega `reminders`: sus cuentas (`buildReminders`, puras), la sincronía con expo-notifications (avisos locales) montada en `(main)`, la hoja Recordatorios y la campana de Inicio. Inicio suma el consejo de la primera vez.

**Stack:** Postgres (plpgsql, pgTAP), supabase-js `rpc`, TanStack Query 5, Zod, Expo Router, expo-notifications (nueva: la trae Expo Go, solo avisos locales), AsyncStorage.

**Especificación:** `docs/spec/businesses.md`, `docs/spec/reminders.md`, `docs/spec/reports.md` (el consejo), `docs/spec/README.md` (lo común) y la maqueta: `assets/donpipos-2.js` (`PANTALLAS.puesta`, las hojas `medios`, `delivery`, `produccion` y `recordatorios`, el consejo `consejo-listo`) y `assets/donpipos.js` (la campana de la cabecera de Inicio).

## Lo que entra

- **La puesta en marcha** (la primera vez, antes de Inicio): «Tus productos» (con «Agregar otro producto»), «Tu stock de hoy» (+ y − por alfajor) y «Tus tipos de gasto» (chips); «Paso N de 3», «Siguiente», atrás sin perder lo puesto, «Terminar» y «Todo listo» → «Ir a Inicio».
- **El consejo de la primera vez** en Inicio: «Anota tu primer pedido», «Entendido».
- **Más → Ajustes:** «Medios de pago», «Delivery», «Producción», «Clientes que no vuelven» y «Recordatorios», cada uno con su hoja.
- **Los avisos del celular:** el pedido para mañana (18:00 del día antes), el alfajor que se acaba (al momento, una vez por día) y los saldos (09:00). Al tocarlos se abre su pantalla.
- **La campana de Inicio:** «Avisos», con un punto si hay alguno.

## Cambios respecto de la especificación

Se escriben en las especificaciones en la tarea 1, antes de la base.

1. **`complete_setup(p_request_id, p_stock, p_categories)`:**
   - Lleva código de pedido, como las demás escrituras: una respuesta perdida no la repite.
   - El stock llega como `[{ productId, counted }]`, con todos los alfajores. El ajuste es lo contado menos lo que debería haber en la nevera (libre + apartado), como un conteo; sin diferencia no hay movimiento.
   - Los tipos de gasto llegan con su ícono, `[{ name, icon }]`, porque la tabla lo pide. Un nombre que ya existe (sin mirar mayúsculas) o repetido no se crea otra vez.
   - Devuelve `{ adjustments, categories }`.
   - Una segunda puesta en marcha (otro código) responde `conflict`. La app lo toma como «ya estaba hecha» y muestra «Todo listo».
2. **La puesta en marcha vive en `src/app/setup/`,** no en `(setup)`: un grupo pondría su primer paso en «/», que ya es la entrada.
3. **Mientras se sabe si falta** (el primer ingreso, un instante), la entrada muestra el fondo. Si no se puede saber (sin señal, error), entra a Inicio: la app nunca se queda bloqueada.
4. **Los tipos de gasto del paso 3** son los cinco de la maqueta (Insumos, Empaques, Delivery, Servicios, Otros), con los cuatro primeros marcados. Son sugerencias de pantalla: nada se crea sin «Terminar».
5. **El consejo de la primera vez sale una sola vez,** después de «Todo listo»: una marca en el celular que «Entendido» borra. Un dueño que ya tenía la app no lo ve.
6. **«No vuelven a los… días»** (`lapsedAfterDays`) va como otra fila de Ajustes, «Clientes que no vuelven», con su hoja. La maqueta no la tiene; la especificación lo pide como ajuste.
7. **La hoja Delivery no muestra la zona de reparto** ni la pide. «Por definir con el dueño» es una nota para el equipo, y la zona todavía no la usa nada.
8. **El aviso del alfajor que se acaba usa el estado `low` de Stock:** lo libre en el mínimo o debajo, o que alcanza para un día o menos. Es el mismo estado que pintan Stock e Inicio, y así avisa también las primeras semanas, sin 7 días de ventas.
9. **Los saldos van en un solo aviso a las 09:00,** sean uno o varios clientes.
   - «Te debe» es un pedido de ayer o antes ya entregado o con adelanto (`remind` de Por cobrar).
   - Mira la primera página de Por cobrar (los 20 más nuevos).
10. **El aviso del pedido usa su resumen,** porque la lista no trae la cantidad total: «12 Coquetas, 12 Morenitas para recoger. Falta cobrar S/ 138.00.»
11. **En Expo Go los avisos llevan el ícono de Expo Go.** El de Don Pipos entra con la app de verdad (fase 8), porque Android pide un ícono blanco sobre transparente.
12. **La campana abre «Avisos»:** la misma lista que programan los recordatorios, cada uno con su pantalla.
13. **Cerrar la sesión cancela los avisos programados,** porque llevan nombres de clientes.

## Restricciones globales

- **Siguen las de las fases 1 a 7a:**
  - un solo proyecto (el de desarrollo) y la CLI por `pnpm sb`;
  - primero la prueba;
  - una migración enviada no se edita;
  - `private.fail` para los errores;
  - cada función nueva para la app va en la regla 8 (`900_structure`);
  - JSON en camelCase;
  - `rpcResult` de `lib/rpc.ts`;
  - cada escritura idempotente pasa su huella a `private.claim_request`.
- **La migración:** `pnpm test:db`, `pnpm db:push` y `pnpm db:types`.
- **Escrituras:** solo por funciones `security definer` en `private`, con su envoltura en `public`.
- **Módulos:**
  - `businesses` usa `products` y `stock`. `reminders` usa `businesses`, `orders` y `stock`.
  - Nadie usa `reminders` salvo las pantallas de `src/app`, que arman Inicio y Más.
  - Las cuentas van en `rules/`, con 100 % de cobertura.
- **Navegación:**
  - Los pasos de la puesta en marcha son pantallas de una pila, con `animation: "ios_from_right"`.
  - «Paso anterior» y el botón atrás del celular desandan el camino.
  - Cada aviso abre su pantalla con `router.navigate`.
- **Pantallas angostas (360 dp):** lo de la izquierda con `flex-1` y `numberOfLines`. Un componente por archivo, hasta 250 líneas. Colores solo del tema.
- **Caché:** `CACHE_SCHEMA` sube a 5, porque el negocio guardado cambia de forma.
- **Textos:** los de la maqueta; los nuevos, en su estilo. Los conceptos nuevos van al glosario antes del código.
- **Commits:** en inglés, hasta 100 caracteres, sin cuerpo; uno por tarea.

## Foco de revisión

1. **La puesta en marcha no se repite ni se pierde:**
   - un toque doble en «Terminar»;
   - la respuesta perdida (mismo código → misma respuesta);
   - la app cerrada en «Todo listo»: al volver, `conflict` = ya está hecha → «Todo listo»;
   - otro celular que ya la hizo.

   → Tareas 1 y 4.
2. **El stock inicial respeta lo apartado:** el ajuste es lo contado menos lo de la nevera, y con 0 de diferencia no hay movimiento. → Tarea 1.
3. **Avisos a destiempo:**
   - un pedido para mañana anotado después de las 18:00 (no avisa a una hora que ya pasó);
   - un pedido entregado (sin aviso);
   - un saldo que se pagó (el aviso se va al recalcular);
   - el mismo alfajor no avisa dos veces el mismo día aunque la app se abra diez veces, y al día siguiente puede volver a avisar.

   → Tareas 6 y 7.
4. **Sin permiso de avisos o con todo apagado:**
   - no se programa nada, y la hoja lo dice;
   - cerrar la sesión borra lo programado.

   → Tareas 7 y 8.
5. **Ajustes que dejarían la app rota:**
   - apagar el último medio de pago (no se puede);
   - un delivery con letras o negativo;
   - una edición que llegó antes (`conflict`): lo escrito no se pierde y se ve el valor nuevo.

   → Tareas 2 y 3.

---

### Task 1: La puesta en marcha en la base

**Archivos:**
- `docs/spec/businesses.md`, `reminders.md`, `reports.md` y `docs/plan/README.md` (los cambios de arriba);
- `docs/glossary.md`: «Consejo de la primera vez», «Avisos (la campana)»;
- la migración `<fecha>_complete_setup.sql`;
- la prueba `supabase/tests/130_setup.test.sql`;
- `900_structure`.

**Interfaces:**
- `complete_setup(p_request_id uuid, p_stock jsonb, p_categories jsonb) → { adjustments, categories }`, con `private.complete_setup` (`security definer`) y su envoltura.
- El negocio se bloquea (`for update`). Con `setup_done_at` puesto → `conflict`.
- **`p_stock`:**
  - Un arreglo de 0 a 50.
  - Con elementos, pasa por `private.stock_items(…, 'counted', 0, 100000)`.
  - Por alfajor, como `register_stock_count`: `move_stock(…, 'adjustment', diferencia, 'initial', p_request_id, null)`.
- **`p_categories`:**
  - Un arreglo de 0 a 20 de `{ name, icon }`, sin otras claves.
  - El nombre, de 1 a 40 caracteres sin espacios sobrantes. El ícono, `^[a-z0-9-]{1,40}$`.
  - Se crea con `sort_order` después del último. Lo que ya existe o se repite no se crea.
- `claim_request(…, 'complete_setup', md5(p_stock::text || p_categories::text))`.
- Marca `setup_done_at = now()`.

- [ ] **Paso 1: Las pruebas que fallan:**
  - Un negocio con `setup_done_at` vacío: `get_business` → `setupDone: false`.
  - Coqueta 10 y Morenita 0 → un movimiento `adjustment`/`initial` de +10, ninguno para Morenita, y `stock_levels.on_hand` = 10.
  - Con 3 apartados en un pedido, contar 5 → ajuste de +2 (foco 2).
  - Los tipos «Insumos» y «Empaques» se crean con su ícono, después de uno que ya existía. «insumos» repetido, o uno que ya existía con otras mayúsculas, no se crea dos veces.
  - Marca la fecha y `get_business` → `setupDone: true`.
  - El mismo código → la misma respuesta. Otro código → `conflict` (foco 1).
  - Un ícono raro, un nombre vacío, 21 tipos, el stock que no es arreglo o una clave de más → `invalid`. Un alfajor de otro negocio → `not_found`.
  - Otro negocio queda igual.
- [ ] **Paso 2–4:** la migración, `pnpm test:db`, `pnpm db:push` y `pnpm db:types`.
- [ ] **Paso 5: Commit** — `feat: add the first-time setup that loads today's stock and expense types`.

---

### Task 2: Los ajustes en el celular

**Archivos:**
- `src/features/businesses/schema/business.ts`, `api/business.ts`;
- `hooks/use-update-settings.ts`, `hooks/use-setup-state.ts`, `hooks/use-complete-setup.ts`;
- `rules/settings-labels.ts`, `constants.ts` e `index.ts`;
- `src/lib/query.ts` (`CACHE_SCHEMA = 5`);
- las pruebas de cada uno.

**Interfaces:**
- **`businessSchema`:** `{ id, name, modules: string[], setupDone: boolean, settings }`.
  - `settings` = `{ activePaymentMethods, deliveryFeeCents, deliveryZone: string | null, productionIntervalDays, lapsedAfterDays, reminders: { scheduled, stock, balances }, version }`.
  - Los tipos: `BusinessSettings`, `ReminderSettings` y `SettingsPatch = Partial<Omit<BusinessSettings, "version">>`.
- **La API:**
  - `updateSettings(expectedVersion: number, patch: SettingsPatch): Promise<BusinessSettings>`;
  - `completeSetup(input: SetupInput): Promise<SetupResult>`, con `SetupInput = { requestId, stock: { productId, counted }[], categories: { name, icon }[] }`.
- **`useUpdateSettings()`:**
  - Usa la versión que hay en la caché.
  - Optimista sobre `businessesKeys.all`, y vuelve atrás si falla. Guarda lo que devuelve la base.
  - `meta.invalidates: [businessesKeys.all, stockKeys.all]`: la producción cambia la sugerencia.
- **`useSetupState(enabled: boolean): "loading" | "needed" | "done"`** (cambio 3):
  - `setupDone === false` → `"needed"`; `true` → `"done"`;
  - sin datos y pidiéndolos → `"loading"`;
  - en cualquier otro caso → `"done"`.
- **`useCompleteSetup()`:**
  - `conflict` → resuelve `{ alreadyDone: true }`;
  - no escribe el negocio en la caché: eso lo hace «Ir a Inicio» (tarea 4);
  - `meta.invalidates: [stockKeys.all]`.
- **`settings-labels.ts`:**
  - `methodsLabel(methods)` → «3»;
  - `deliveryLabel(cents)`: 500 → «S/ 5.00», 0 → «Sin costo»;
  - `productionLabel(days)`: 1 → «Cada día», 7 → «Cada 7 días»;
  - `productionNote(days)`: «Produces todos los días: Inicio y Stock sugieren para ese periodo.» / «Cada 7 días: Inicio y Stock sugieren para ese periodo.»;
  - `lapsedLabel(days)` → «30 días»;
  - `remindersLabel(reminders)` → «3 activos», «1 activo» o «Apagados».
- **`constants.ts`:** `SETUP_EXPENSE_CATEGORIES`, con los íconos de `expenses`:
  - Insumos `basket-outline`, marcado;
  - Empaques `package-variant-closed`, marcado;
  - Delivery `moped`, marcado;
  - Servicios `fire`, marcado;
  - Otros `receipt-text-outline`, sin marcar.

- [ ] **Paso 1: Las pruebas que fallan:**
  - Las etiquetas de §5 de la especificación y las de arriba (100 %).
  - El esquema lee la respuesta completa de `get_business`.
  - `useUpdateSettings`: el interruptor cambia al instante; con `conflict` vuelve atrás y vuelve a pedir el negocio (foco 5).
  - `useSetupState` en sus cuatro casos.
  - `useCompleteSetup`: con `conflict` → `{ alreadyDone: true }`.
- [ ] **Paso 2: Implementar.** `pnpm test`, `pnpm lint` y `pnpm typecheck`.
- [ ] **Paso 3: Commit** — `feat: read and change every business setting from the app`.

---

### Task 3: Las hojas de ajustes en Más

**Archivos:**
- `src/features/businesses/components/`:
  - `payment-methods-row.tsx` y `payment-methods-sheet.tsx`;
  - `delivery-row.tsx` y `delivery-sheet.tsx`;
  - `production-row.tsx` y `production-sheet.tsx`;
  - `lapsed-row.tsx` y `lapsed-sheet.tsx`;
- `src/app/(main)/(tabs)/more.tsx`;
- las pruebas de cada hoja y `src/test/routes/settings.test.tsx`.

**Interfaces:**
- Cada fila es un `MenuRow` que abre su `Sheet`, como `ExpenseCategoriesRow`, con su valor de `settings-labels`.
- **«Medios de pago»:**
  - Un interruptor por medio, con su etiqueta de `PAYMENT_METHOD_LABELS`, y la nota de la maqueta.
  - El último encendido no se puede apagar: «Deja al menos uno encendido.»
- **«Delivery»:**
  - `MoneyInput` con «Costo» y la nota de la maqueta.
  - «Guardar» manda `deliveryFeeCents`.
- **«Producción»:**
  - «Produces cada», con un `Stepper` de 1 a 14, y `productionNote`.
  - «Guardar» manda `productionIntervalDays`.
- **«Clientes que no vuelven»:**
  - Un `Stepper` de 7 a 120, con «Si un cliente no pide en N días, sale en «No vuelven».»
  - «Guardar» manda `lapsedAfterDays`.
- **Mientras guarda,** «Guardando…». Sin señal, el aviso de siempre. Con `conflict`: «Otro cambio llegó antes. Revisa y vuelve a guardar», sin cerrar la hoja; lo escrito queda.
- **El orden en Ajustes:** Productos y precios, Tipos de gasto, Medios de pago, Delivery, Producción, Recordatorios (tarea 8), Clientes que no vuelven, Mensajes de WhatsApp y Fidelidad.

- [ ] **Paso 1: Las pruebas que fallan:**
  - Apagar Plin manda `{ activePaymentMethods: ["cash", "yape", "transfer"] }`. Con solo Efectivo, su interruptor está deshabilitado (foco 5).
  - Delivery «5» → `{ deliveryFeeCents: 500 }`. Letras o vacío no guardan (foco 5).
  - Producción 7 → 3 con «−» → `{ productionIntervalDays: 3 }`, y la nota cambia.
  - «No vuelven» → `{ lapsedAfterDays: N }`.
  - `conflict` deja la hoja abierta con el aviso.
  - La prueba de ruta: Más → cada hoja → cerrar, y Más sigue ahí.
- [ ] **Paso 2: Implementar.** `pnpm test`, `pnpm lint` y `pnpm typecheck`.
- [ ] **Paso 3: Commit** — `feat: add the payment, delivery, production and lapsed-customer setting sheets`.

---

### Task 4: La puesta en marcha en el celular

**Archivos:**
- las rutas `src/app/setup/_layout.tsx`, `index.tsx`, `stock.tsx`, `expenses.tsx` y `done.tsx`;
- `src/app/_layout.tsx` y `src/app/index.tsx`;
- `src/features/businesses/components/`:
  - `setup-gate.tsx`, `setup-draft-provider.tsx` y `setup-header.tsx`;
  - `setup-products-step.tsx`, `setup-stock-step.tsx`, `setup-expenses-step.tsx` y `setup-done.tsx`;
- `src/features/products/index.ts` (exporta `NewProductSheet`);
- `src/lib/first-tip.ts`;
- `src/test/routes/setup.test.tsx`.

**Interfaces:**
- **`SetupGate`:**
  - `<SetupGate enabled>{(setup) => …}</SetupGate>` llama a `useSetupState`, como `UnlockConsumer`.
  - El layout raíz suma `<Stack.Protected guard={… && setup === "needed"}><Stack.Screen name="setup" /></Stack.Protected>`.
  - `(main)` pide además `setup === "done"`.
- **La entrada:** con `"loading"`, el fondo; con `"needed"` → `/setup`.
- **`SetupDraftProvider`** (en `setup/_layout.tsx`): `{ counts: Record<string, number>, setCount, chosen: Record<string, boolean>, toggle, requestId }`. Vive mientras dura la pila: atrás no pierde nada.
- **`SetupHeader({ step, onBack? })`:** el logo en el paso 1 y «Paso anterior» en los demás; «Paso N de 3» y la barra de tres partes.
- **Los pasos** con los textos de la maqueta:
  - «Agregar otro producto» abre `NewProductSheet`;
  - el paso 2, un `Stepper` por alfajor activo (desde 0);
  - el paso 3, `Chip` por tipo;
  - «Terminar» llama a `useCompleteSetup` con todos los alfajores y los tipos marcados, y va a `/setup/done`.
- **`SetupDone({ onHome })`:** «Todo listo», su texto y «Ir a Inicio». «Ir a Inicio» llama a `markFirstTip()`, pone `setupDone: true` en la caché del negocio y `invalidateQueries()`. La puerta lleva a Inicio.
- **`src/lib/first-tip.ts`:** `markFirstTip(): Promise<void>` y `useFirstTip(): { visible: boolean; dismiss: () => void }`, en AsyncStorage con la llave `donpipos.firstTip`.

- [ ] **Paso 1: Las pruebas que fallan:**
  - Con sesión y `setupDone: false`, la entrada lleva a `/setup`. Con `true`, a `/home`. Si `get_business` falla, a `/home` (cambio 3).
  - El recorrido: el paso 1 con los alfajores y sus precios → «Siguiente» → «+» dos veces en Coqueta → «Siguiente» → desmarcar Delivery → «Paso anterior» (Coqueta sigue en 2) → «Siguiente» → «Terminar».
  - `complete_setup` recibe `{ stock: [{ Coqueta, 2 }, { Morenita, 0 }…], categories: [Insumos, Empaques, Servicios] }` y aparece «Todo listo».
  - Un toque doble en «Terminar» llama una sola vez (foco 1).
  - `conflict` → «Todo listo».
  - «Ir a Inicio» deja la marca del consejo.
- [ ] **Paso 2: Implementar.** `pnpm test`, `pnpm lint` y `pnpm typecheck`.
- [ ] **Paso 3: Commit** — `feat: walk a new owner through products, today's stock and expense types`.

---

### Task 5: El consejo de la primera vez

**Archivos:**
- `src/features/reports/components/first-tip.tsx`, con su prueba;
- `src/app/(main)/(tabs)/home.tsx`.

**Interfaces:**
- **`FirstTip()`:** con `useFirstTip().visible`, una tarjeta abajo, sobre la barra, con un velo.
  - Lleva `accessibilityRole` y la etiqueta «Consejo».
  - El texto: «**Anota tu primer pedido** Toca + abajo: eliges los alfajores, quién los pide y cómo paga.»
  - «Entendido» llama a `dismiss()`.

- [ ] **Paso 1: Las pruebas que fallan:**
  - Con la marca se ve, y «Entendido» lo cierra y borra la marca.
  - Sin la marca no se ve.
- [ ] **Paso 2: Implementar.**
- [ ] **Paso 3: Commit** — `feat: show the first-order tip once after setup`.

---

### Task 6: Las cuentas de los avisos

**Archivos:**
- `src/features/reminders/schema/reminder.ts`;
- `rules/build.ts` y `rules/target.ts`;
- `src/lib/dates.ts` (`businessTime`);
- las pruebas.

**Interfaces:**
- **`businessTime(date: string, time: string): Date`:** «2026-11-18», «18:00» → `2026-11-18T23:00:00.000Z`.
- **Los tipos:**
  - `ReminderTarget = { screen: "order"; orderId } | { screen: "production" } | { screen: "receivables" }`;
  - `Reminder = { id, kind: "scheduled" | "stock" | "balances", title, body, at: Date | null, target }`;
  - `ReminderData = { upcoming, stock, receivables, notifiedStock: string[] }`. Las formas mínimas de cada fila van en el esquema de `reminders`, porque las cuentas no importan otros módulos.
- **`buildReminders(data, settings: ReminderSettings, now: Date): Reminder[]`:** los de `at: null` primero y después por hora. Los ids son `order:<id>`, `stock:<productId>` y `balances`.
  - **Pedido:**
    - si no está entregado, a las 18:00 del día antes de `dueDate`, siempre que esa hora no haya pasado;
    - el título, «Mañana a las 10:00: pedido de X» (sin hora: «Mañana: pedido de X»);
    - el cuerpo, «{itemsSummary} para recoger.» o «… para delivery.», más «Falta cobrar S/ …» o «Ya está pagado.».
  - **Stock:**
    - `state === "low"` y no en `notifiedStock` → `at: null`;
    - el título, «{name} se está acabando»;
    - el cuerpo, «Quedan N. Toca para ver cuánto conviene producir.» (o «Queda 1.»).
  - **Saldos:**
    - las filas con `remind` y `dueDate` antes de hoy;
    - a las 09:00 de hoy si todavía no son las 09:00; si no, mañana;
    - uno: «X te debe S/ …» / «Desde ayer. Toca para enviarle un recordatorio.» («Desde hace N días.», contado desde el día del aviso; sin nombre, «Un cliente»);
    - varios: «N clientes te deben S/ …» / «Toca para ver quiénes y enviarles un recordatorio.».
  - Con su interruptor apagado, nada de ese tipo.
- **`targetHref(target): string`** → `/orders/<id>`, `/stock/production` o `/orders/receivables`.

- [ ] **Paso 1: Las pruebas que fallan** (100 %):
  - Los cuatro ejemplos de §5 de la especificación.
  - Un pedido para mañana visto a las 19:00 → sin aviso. Un pedido entregado → sin aviso (foco 3).
  - Un pedido en 3 días → aviso a las 18:00 del día antes. Sin hora, delivery y pagado.
  - Un saldo de hoy o sin `remind` → nada. Varios saldos → un aviso con la suma. Sin nombre.
  - «Queda 1». Un alfajor ya avisado → nada (foco 3). `ok` u `out` → nada.
  - Cada interruptor apagado. `targetHref` de los tres.
  - `businessTime`.
- [ ] **Paso 2: Implementar.**
- [ ] **Paso 3: Commit** — `feat: compute the phone reminders for orders, low stock and balances`.

---

### Task 7: Los avisos en el celular

**Archivos:**
- `package.json` (`pnpm expo install expo-notifications`) y `app.json` (su plugin, sin ícono: cambio 11);
- `src/features/reminders/api/notifications.ts`;
- `hooks/use-reminder-sync.ts` y `hooks/use-notification-taps.ts`;
- `index.ts`;
- `src/app/(main)/_layout.tsx` y `src/app/_layout.tsx`;
- el simulacro de expo-notifications en el arranque de Jest y las pruebas.

**Interfaces:**
- **`api/notifications.ts`:**
  - `notificationPermission(): Promise<"granted" | "denied" | "undetermined">`;
  - `askNotificationPermission(): Promise<boolean>`;
  - `replaceReminders(reminders: Reminder[]): Promise<void>`: cancela todo lo programado y programa cada uno. Con `at`, un disparador `date` en el canal «Recordatorios»; con `at: null`, al momento.
  - `cancelReminders(): Promise<void>`.
  - El canal de Android (`setNotificationChannelAsync`) y `setNotificationHandler`, que muestra el aviso también con la app abierta.
- **`useReminderSync()`** (en `(main)`):
  - Lee `businessQuery`, la primera página de `ordersQuery("upcoming", "")`, la de `receivablesQuery` y `stockOverviewQuery`. Con todo cargado, arma la lista.
  - Si la lista no cambió desde la última vez, no hace nada.
  - Con todo apagado → `cancelReminders()`.
  - Sin permiso: lo pide una vez si nunca se pidió; si no lo dan, cancela.
  - Si no, `replaceReminders`. Los avisos de stock que salieron quedan en AsyncStorage (`donpipos.stockNotified` = `{ day, ids }`): se borran al cambiar el día.
- **`useNotificationTaps()`** (en `(main)`): `useLastNotificationResponse` → `router.navigate(data.url)` y `clearLastNotificationResponseAsync()`. Así un aviso tocado con la app bloqueada abre su pantalla al entrar.
- **El layout raíz:** sin sesión → `cancelReminders()`.

- [ ] **Paso 1: Las pruebas que fallan:**
  - Con un pedido para mañana, un alfajor bajo y un saldo de ayer → tres avisos programados, con su hora y su `url`.
  - Volver a sincronizar con lo mismo no programa otra vez.
  - El alfajor ya avisado hoy no se repite; al día siguiente sí (foco 3).
  - Apagar «Saldos pendientes» los cancela y no los vuelve a programar.
  - Sin permiso no programa nada (foco 4).
  - Tocar un aviso abre `/orders/<id>`.
  - Cerrar la sesión cancela todo (foco 4).
- [ ] **Paso 2: Implementar.** `pnpm test`, `pnpm lint` y `pnpm typecheck`.
- [ ] **Paso 3: Commit** — `feat: schedule local reminders on the phone and open their screen on tap`.

---

### Task 8: Más → Recordatorios

**Archivos:**
- `src/features/reminders/components/reminders-row.tsx`, `reminders-sheet.tsx` y `hooks/use-notification-permission.ts`;
- `src/app/(main)/(tabs)/more.tsx`;
- las pruebas.

**Interfaces:**
- **`RemindersRow`:** «Recordatorios», con `remindersLabel`, que abre `RemindersSheet`.
- **`RemindersSheet`:**
  - El título y el texto de la maqueta.
  - Tres interruptores con su título y su descripción, que mandan `useUpdateSettings({ reminders: { …, [kind]: value } })`.
  - Sin permiso del celular: «El celular no deja que Don Pipos te mande avisos.» Si nunca se pidió, «Permitir avisos»; si lo negó, «Abrir ajustes del celular» (`Linking.openSettings()`).
- **`useNotificationPermission()`:** el estado, que se vuelve a leer al volver a la app (`AppState`).

- [ ] **Paso 1: Las pruebas que fallan:**
  - Sin permiso muestra el aviso, y el botón abre los ajustes (foco 4).
  - Apagar «Pedidos para otro día» manda `{ reminders: { scheduled: false, stock: true, balances: true } }`.
  - La fila dice «2 activos».
- [ ] **Paso 2: Implementar.**
- [ ] **Paso 3: Commit** — `feat: add the reminders sheet with the phone permission notice`.

---

### Task 9: La campana de Inicio

**Archivos:**
- `src/features/reminders/components/reminders-bell.tsx`, `reminder-list-sheet.tsx` y `hooks/use-reminder-list.ts`;
- `src/features/reports/components/home-screen.tsx` (su espacio `headerAction`);
- `src/app/(main)/(tabs)/home.tsx`;
- las pruebas y `src/test/routes/reminders.test.tsx`.

**Interfaces:**
- **`useReminderList(): Reminder[]`:** la misma cuenta que la sincronía, con `notifiedStock: []`.
- **`RemindersBell({ onOpen: (href: string) => void })`:**
  - El botón «Avisos» (o «Avisos, N»), con la campana y un punto si hay alguno.
  - Abre `ReminderListSheet`: cada aviso con su título y su cuerpo; al tocarlo, cierra y `onOpen(targetHref(target))`.
  - Vacío: «No hay avisos por ahora.»
- **`HomeScreen({ …, headerAction?: ReactNode })`:** la campana va a la derecha del logo.

- [ ] **Paso 1: Las pruebas que fallan:**
  - Con un alfajor bajo se ve el punto, y la hoja lo lista.
  - Tocarlo lleva a `/stock/production`, y atrás vuelve a Inicio.
  - Sin avisos: sin punto y «No hay avisos por ahora.»
- [ ] **Paso 2: Implementar.**
- [ ] **Paso 3: Commit** — `feat: add the reminders bell to the home header`.

---

### Task 10: Cierre

**Archivos:** este plan («Resultado», «Lo que falta» con los pasos para el celular, «Lo que cambió»), `docs/plan/README.md` (estado) y las especificaciones al día.

- [ ] **Paso 1:** `pnpm test`, `pnpm test:db`, `pnpm lint`, `pnpm typecheck` y `pnpm format:check`.
- [ ] **Paso 2: Commit** — `docs: record the phase 7b result and what is left to check on the phone`.

## Resultado (2026-11-20)

La fase 7b quedó construida en la rama `fase-7b`, con un commit por tarea y una corrección propia antes de la revisión (el stock del paso 2, abajo).

| Comprobación | Resultado |
|---|---|
| `pnpm test:coverage` | 741 pruebas; 100 % en `lib/{money,dates,errors}`, `theme/tokens` y las cuentas de `features/*/rules` |
| `pnpm db:check` | Pasa entera: 764 pruebas de la base en 36 archivos, los 49 casos de velocidad, consejos de Supabase sin nada pendiente y tipos al día |
| `pnpm lint`, `pnpm lint:rules`, `pnpm typecheck`, `pnpm test:scripts`, `prettier --check` | Pasan |

- **En el proyecto de desarrollo** quedó una migración: `complete_setup`.
- **El negocio DEMO todavía no hizo la puesta en marcha:** la verás al entrar.
- **Librería nueva:** expo-notifications, que viene en Expo Go. Después de juntar, `pnpm install` en la carpeta principal.
- **La caché guardada cambió de forma** (`CACHE_SCHEMA` 5): la primera vez que abras la app, vuelve a pedir todo.

### Lo que falta: probar en el celular

```bash
cd /home/javier/var-mar/app && pnpm install && pnpm start --tunnel
```

Ingresa con el dueño DEMO (900 000 101, el PIN de tu `.env.local`).

1. **La puesta en marcha:** al entrar sale «Paso 1 de 3».
   - «Tus productos» muestra los alfajores con su precio; «Agregar otro producto» abre la hoja de siempre.
   - En «Tu stock de hoy» cada alfajor empieza en lo que ya hay. Cambia uno con + y −.
   - En «Tus tipos de gasto», desmarca uno y vuelve con la flecha: lo puesto sigue ahí.
   - «Terminar» → «Todo listo» → «Ir a Inicio».
   - Los pasos se deslizan, y el botón atrás del celular vuelve de a uno.
2. **El consejo:** en Inicio sale «Anota tu primer pedido». «Entendido» lo cierra y no vuelve a salir.
3. **El permiso de avisos:** la primera vez, el celular pregunta si Don Pipos puede mandar avisos. Di que sí.
4. **El alfajor que se acaba:** si uno está «bajo» en Stock, llega un aviso al momento («… se está acabando»). Tócalo: abre Registrar producción. Ese mismo alfajor no vuelve a avisar hoy.
5. **El pedido de mañana:** anota un pedido para mañana, antes de las 18:00. A las 18:00 llega «Mañana…: pedido de …», aunque la app esté cerrada, y al tocarlo se abre el pedido.
6. **Los saldos:** con un pedido de ayer entregado sin cobrar, a las 09:00 llega «… te debe S/ …». Al tocarlo abre Por cobrar.
7. **La campana:** en la cabecera de Inicio, «Avisos» lleva un punto si hay algo. Lista lo de hoy, y cada aviso abre su pantalla.
8. **Ajustes en Más:**
   - «Medios de pago»: apaga Plin. Al anotar un pedido ya no sale, y el último encendido no se puede apagar.
   - «Delivery»: cambia el costo; un pedido con delivery suma el nuevo.
   - «Producción»: cada cuántos días; la nota cambia, y Stock e Inicio sugieren para ese periodo.
   - «Recordatorios»: apaga uno.
   - «Clientes que no vuelven»: cambia los días; «No vuelven» de Clientes sigue el número nuevo.
   - Si en Ajustes del celular le quitas el permiso de avisos a Expo Go, la hoja Recordatorios lo dice y «Abrir ajustes del celular» te lleva ahí.

En Expo Go los avisos salen con el ícono de Expo Go; el de Don Pipos llega con la APK (fase 8). En algunos celulares Android, un aviso programado puede llegar unos minutos tarde: el sistema junta las alarmas para ahorrar batería.

### Lo que cambió respecto de este plan

**Tarea 1**
- La migración lleva la hora UTC en el nombre, como las anteriores. Con la hora de Lima quedaba antes de la última enviada, y `db push` la habría rechazado.

**Tarea 2**
- Los ajustes se guardan de a uno, y cada cambio sale con la versión que dejó el anterior: dos interruptores tocados seguidos no chocan.

**Tarea 3**
- Se sumó `useSaveSettings` (guardar → sí o no, con el porqué), para que las cuatro hojas y Recordatorios usen el mismo texto de «otro cambio llegó antes».
- Sin señal, los interruptores y «Guardar» quedan apagados con «Sin conexión. Los cambios esperan a que vuelva la señal», como en Fidelidad y Mensajes. Los guardados de la app salen al momento y avisan si no hay señal.
- La fila con interruptor (`SwitchRow`) dice «deshabilitado» al lector de pantalla también donde `Switch` no lo pasa solo.

**Tarea 4**
- La puerta de la puesta en marcha entra a Inicio desde el primer fallo, sin esperar los reintentos: el primer ingreso no se queda en blanco unos segundos.
- La puerta pide el negocio apenas hay sesión, también con la app bloqueada o en la pregunta de la huella.
- «Ir a Inicio» lo hace `useFinishSetup`, y la puerta del layout raíz lleva a Inicio.
- Los chips del paso 3 van sin ícono (el `Chip` común no lleva); el ícono igual viaja a `complete_setup`.
- **Corrección propia antes de la revisión:** el paso 2 empezaba cada alfajor en 0. Un negocio que ya llevaba stock (el DEMO, o un dueño que usó la app antes) lo perdía con solo tocar «Terminar». Ahora cada alfajor empieza en lo que hay en la nevera (0 en un negocio nuevo), y «Siguiente» y «Terminar» esperan a que llegue.

**Tarea 6**
- Los saldos se suman por cliente: dos pedidos de la misma persona dicen «Jorge P. te debe S/ 48.00», no «2 clientes». «Desde…» cuenta desde su deuda más vieja.

**Tarea 7**
- Los avisos del celular viven en `src/lib/notifications.ts`: la regla de módulos no deja que `api/` use paquetes de Expo.
- Los avisos «de ahora» (un alfajor) salen aparte de los programados. Lo programado solo se reemplaza si cambió, así no se cancela y reprograma todo en cada recarga.
- Cerrar la sesión borra lo programado y lo que está a la vista, desde el layout de Ingresar (se monta siempre que no hay sesión).
- El permiso se pide solo si nunca se pidió, una vez por arranque. Si se negó, lo resuelve la hoja Recordatorios.

**Tarea 8**
- El interruptor de los alfajores dice «Cuando llegan al mínimo o quedan para un día», porque avisa con el estado «bajo» de Stock (cambio 8).
- Después de dar el permiso desde la hoja, los avisos se programan con la próxima recarga de datos: al abrir la app, al volver a ella o después de guardar.

**Tarea 9**
- La campana usa su propia cuenta (`listReminders`), dicha a hoy. Los textos programados están escritos para cuando salen («Mañana…» el día antes, «desde hace N días» el día del aviso).
- Por eso la campana lista el pedido de mañana (aunque ya pasaron las 18:00), cada alfajor bajo y los saldos contados desde hoy.
- La campana sigue los interruptores: un tipo apagado tampoco sale ahí.
