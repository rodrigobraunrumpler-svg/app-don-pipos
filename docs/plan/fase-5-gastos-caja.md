# Fase 5: gastos, ingresos y caja — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que el dueño anote en segundos lo que gasta (con la foto de la boleta si quiere) y lo que entra por fuera de los pedidos, corrija o anule sin perder la historia, y al cerrar el día sepa si el efectivo cuadra.

**Arquitectura:** tres migraciones, una por módulo (gastos con su bucket privado de boletas, ingresos, caja), y una cuarta con los casos del medidor. Todo lo que crea lleva su código de intención con huella; corregir, anular y deshacer quedan en `private.audit_log`. En el celular llegan los módulos `expenses`, `income` y `cash`; Más se ordena en «Tu negocio» y «Ajustes», y el + suma «Un gasto». La foto se toma con la cámara, se achica en el celular y sube a Supabase Storage después de guardar el gasto.

**Stack:** Postgres (plpgsql, pgTAP), Supabase Storage (bucket privado con políticas por negocio), supabase-js, TanStack Query 5, Zod, Expo Router, FlashList, expo-image-picker y expo-image-manipulator (los trae Expo Go; se instalan con `pnpm expo install`), expo-image.

**Especificación:** `docs/spec/expenses.md`, `docs/spec/income.md`, `docs/spec/cash.md`, `docs/spec/README.md` (lo común, `lib/images.ts`), `docs/PROJECT_CONTEXT.md` (D10, D11, §6 «nada se borra») y la maqueta `assets/donpipos-2.js`: `PANTALLAS.gastos` (con la hoja del gasto), `PANTALLAS.gasto`, `PANTALLAS.caja`, `resultadoCaja`, la hoja «Tipos de gasto» de `PANTALLAS.ajustes`, `guardar-gasto`, `guardar-correccion`, `anular-gasto`, `guardar-cierre`; y `assets/donpipos.js` (el + con «Un gasto»).

## Lo que entra

- Gastos: anotar con tipo, descripción, medio y foto de la boleta; la lista con «Gastado en noviembre» y sus barras por tipo; corregir y anular con «Deshacer»; los tipos de gasto en Más.
- Ingresos: el total del mes, la lista (los pagos de los pedidos y los ingresos a mano) y anotar o anular un ingreso a mano.
- Cuadre de caja: lo cobrado y lo gastado en efectivo, «Debería haber», lo contado con su resultado, Yape, Plin y transferencias aparte, cerrar el día y volver a contar.
- Más con «Tu negocio» (Gastos, Ingresos, Por cobrar, Cuadre de caja) y «Ajustes» (Productos y precios, Tipos de gasto); «Un gasto» en el +.
- **Más adelante:** «Cobrado hoy» y «Cuadrar caja ›» en Inicio (fase 6, con Inicio), los reportes (fase 6), la puesta en marcha que crea los primeros tipos de gasto (fase 7).

## Cambios respecto de la especificación

Se escriben en `expenses.md`, `income.md` y `cash.md` en la tarea 1, antes de la base.

1. **Los tipos de gasto se leen con `list_expense_categories()`,** una lectura que la especificación no nombra (como `list_products`).
2. **El ícono de un tipo se elige entre unos pocos** (insumos, empaques, delivery, servicios, local, otros…); la base guarda el nombre y la app dibuja el de «otros» si no lo conoce.
3. **Corregir un gasto cambia el monto, el tipo, el medio y la descripción** (la maqueta mostraba solo el monto). La fecha y la foto pasan al gasto nuevo.
4. **La lista de gastos muestra los que cuentan,** del más nuevo al más viejo, de 20 en 20 en la misma pantalla («Ver todos» es «Cargar 20 más»). Un gasto corregido dice «Corregido, antes S/ X»; uno anulado sale de la lista (y se ve en el aviso con «Deshacer»).
5. **La foto también se agrega después,** desde la hoja del gasto: así un envío que falló se reintenta sin perder el gasto. La foto sube con su propio corte de 60 s (el resto de la app corta a los 20 s).
6. **Un ingreso a mano es de hoy o de ayer** (dos chips): no hay selector de fecha sin librería. Más atrás se anota hoy con la fecha en la descripción.
7. **`cash_expected(business_date)` no recibe con cuánto abrió:** devuelve lo cobrado y lo gastado en efectivo, los otros medios y con cuánto abrió el último cierre (el valor por defecto de «Abriste con»). «Debería haber» y la diferencia los calcula la vista previa (`rules/difference.ts`) mientras se escribe, y la base al cerrar.
8. **Anular un ingreso a mano no tiene «Deshacer»:** se confirma en una hoja (la especificación no trae su función de deshacer).
9. **Anotar gasto y Anotar ingreso no guardan borrador** si se cierran sin señal: son tres datos. Sin señal, «Guardar» se apaga y lo dice.

## Restricciones globales

- **Siguen las de las fases 1 a 4b:** un solo proyecto (el de desarrollo), la CLI por `pnpm sb`, primero la prueba, una migración enviada no se edita, `private.fail` para los errores, `private.<fn>` con su envoltorio en `public`, cada función nueva para la app en la regla 8 (`900_structure`), JSON en camelCase, fechas ISO con milisegundos y «Z».
- **Cada migración:** `pnpm test:db`, `pnpm db:push`, `pnpm db:types`, y `pnpm db:perf` donde haya lecturas nuevas (menos de 50 ms con años de datos, sin leer tablas enteras).
- **Lo común de la base:** `id`, `business_id`, `created_at`, `updated_at` con `private.set_updated_at()`; `unique (business_id, id)` en las tablas padre y llaves con `(business_id, x_id)`; reglas de acceso con `= any ((select private.owned_business_ids())::uuid[])`; montos con `public.positive_cents` o `public.cents`; medios con `public.payment_method`.
- **Idempotencia con huella:** `create_expense`, `correct_expense`, `create_manual_income` y `close_cash_day` llaman a `private.claim_request(negocio, código, función, md5(argumentos))`.
- **Días de Lima:** todo «hoy», «el mes» y «el día del cuadre» con `America/Lima`.
- **Deshacer:** solo el último cambio del gasto y dentro de los 10 minutos; después, `conflict` (`expenses.md` §8).
- **Datos del negocio:** ningún tipo de gasto viene escrito en el código; los crea el dueño. Lo de prueba lleva DEMO.
- **Librerías:** solo las que trae Expo Go, con `pnpm expo install`.
- **Navegación:** pantallas nuevas en la pila de `(main)`, encima de las pestañas, con `<Screen>`; se abren con `router.navigate` (un doble toque abre una). Cada una con su prueba de ruta.
- **Pantallas angostas (360 dp):** en una fila, lo de la izquierda con `flex-1` y `numberOfLines`, los montos con `shrink-0`. Lint: un componente por archivo, hasta 250 líneas. Las cuentas de la vista previa en `rules/`, con 100 % de cobertura.
- **Textos:** los de la maqueta; los nuevos, en su estilo. Conceptos nuevos al glosario antes del código.
- **Commits:** en inglés, hasta 100 caracteres, sin cuerpo; uno por tarea.

## Foco de revisión

1. **La foto con mala señal:** el gasto se guarda aunque la foto no suba o tarde más de 20 s; el aviso ofrece reintentar y la hoja del gasto deja agregarla después. → Tareas 6 y 8.
2. **Los bordes del día de Lima:** un gasto, un pago o un ingreso a las 23:30 de Lima cuenta ese día en el resumen y en el cuadre, no el siguiente. → Tareas 2 a 4.
3. **Corregir, anular y deshacer seguidos:** «Deshacer» solo vale para el último cambio de ese gasto; deshacer una corrección vuelve a dejar el gasto de antes y anula el nuevo. → Tareas 2 y 9.
4. **El cuadre con devoluciones, pagos anulados y medios cambiados el mismo día:** solo cuenta el efectivo de ese día sin anular; volver a contar crea otro cierre y manda el último. → Tareas 4 y 11.
5. **Las boletas entre negocios:** otro dueño no lee ni sube una boleta de este negocio, y la ruta tiene que ser la del gasto. → Tarea 1.

---

### Task 1: Gastos en la base: tipos, gastos y boletas

**Archivos:** `docs/spec/{expenses,income,cash}.md` (los cambios de arriba), `docs/glossary.md`; migración `<fecha>_expenses.sql`; prueba `supabase/tests/100_expenses.test.sql`; `supabase/tests/900_structure.test.sql`.

**Interfaces:**
- Tablas `public.expense_categories` (`name` 1–40, único sin mayúsculas; `icon` `^[a-z0-9-]{1,40}$`; `is_active`; `sort_order`; `version`) y `public.expenses` (`category_id`, `description` vacío o 1–120, `amount_cents` hasta 10,000,000, `method`, `spent_at`, `receipt_path`, `voided_at` y `void_reason` juntos, `replaces_id`), con los índices de `expenses.md` §2.
- Bucket `receipts` privado (JPEG, hasta 2 MB) y políticas de `storage.objects` para leer, subir y reemplazar solo `<negocio>/<gasto>.jpg` de un negocio propio.
- `list_expense_categories() → [{ id, name, icon, isActive, sortOrder, version }]`, por orden y nombre.
- `save_expense_category(p_id, p_expected_version, p_name, p_icon) → categoría`: sin `p_id` crea al final; con otra versión, `conflict`; un nombre repetido, `conflict`.
- `set_category_active(p_id, p_expected_version, p_active) → categoría`.
- `create_expense(p_request_id, p_category_id, p_amount_cents, p_method, p_description, p_spent_at) → gasto`: tipo activo del negocio, medio activo, fecha no futura (`null` = ahora).
- El gasto: `{ id, categoryId, categoryName, categoryIcon, description, amountCents, method, spentAt, receiptPath, previousAmountCents, voidedAt }`.
- `attach_receipt(p_expense_id, p_receipt_path) → gasto`: la ruta tiene que ser `<negocio>/<gasto>.jpg`; un gasto anulado, `invalid`.

- [ ] **Paso 1: Las pruebas que fallan:** crear un tipo y uno repetido (`conflict`); apagarlo con otra versión (`conflict`); crear un gasto y repetir el código (uno solo), con otros datos (`conflict`); monto 0, tipo apagado o de otro negocio, medio apagado o fecha futura (`invalid`); la boleta con otra ruta (`invalid`); otro dueño no ve los tipos ni los gastos, no lee ni sube su boleta (foco 5), y nadie inserta directo.
- [ ] **Paso 2–4:** migración, `pnpm test:db`, `pnpm db:push`, `pnpm db:types`. **Paso 5: Commit** — `feat: add expense categories, expenses and the private receipts bucket`.

---

### Task 2: Gastos en la base: corregir, anular, deshacer, la lista y el resumen

**Archivos:** migración `<fecha>_expense_changes.sql`; prueba `supabase/tests/101_expense_changes.test.sql`; `900_structure`.

**Interfaces:**
- `correct_expense(p_request_id, p_id, p_category_id, p_amount_cents, p_method, p_description) → gasto nuevo`: anula el viejo («corrección») y crea el nuevo con `replaces_id`, la misma fecha y la misma boleta; sin cambios o con el viejo ya anulado, `invalid`.
- `void_expense(p_id, p_reason) → gasto anulado`: ya anulado, `invalid`.
- `revert_expense_change(p_expense_id) → gasto como estaba`: si lo último del gasto fue anularlo, vuelve; si es el nuevo de una corrección, lo anula («deshacer corrección») y vuelve el viejo. Después de 10 minutos, o si ya no es lo último, `conflict`.
- `list_expenses(p_from date, p_to date, p_limit, p_cursor) → { items: [gasto], meta }`: los que cuentan, del más nuevo al más viejo, por días de Lima (los dos opcionales); cursor opaco con la fecha y el id.
- `expenses_summary(p_from date, p_to date) → { totalCents, byCategory: [{ categoryId, name, icon, totalCents }] }`, de mayor a menor, sin anulados.

- [ ] **Paso 1: Las pruebas que fallan:** corregir deja el viejo anulado y el nuevo con `replaces_id` y «antes»; el resumen y la lista no cuentan anulados; deshacer una corrección y una anulación; corregir, anular el nuevo y deshacer (solo lo último, foco 3); pasados 10 minutos, `conflict`; un gasto a las 23:30 de Lima cuenta ese día (foco 2); la lista pagina con su cursor.
- [ ] **Paso 2–4.** **Paso 5: Commit** — `feat: add expense corrections, voids, undo, the list and the summary`.

---

### Task 3: Ingresos en la base

**Archivos:** migración `<fecha>_income.sql`; prueba `supabase/tests/102_income.test.sql`; `900_structure`.

**Interfaces:**
- Tabla `public.manual_incomes` (`description` 1–120, `amount_cents`, `method`, `received_at`, anulación), con su índice parcial.
- `create_manual_income(p_request_id, p_description, p_amount_cents, p_method, p_received_on date) → ingreso`: hoy (`null`) es ahora; ayer, a las 12:00 de Lima; ni futuro ni antes de ayer (`invalid`).
- `void_manual_income(p_id, p_reason) → ingreso` (queda en el registro).
- `income_summary(p_from date, p_to date) → { totalCents, byMethod: { cash, yape, plin, transfer }, byDay: [{ day, totalCents }] }`: pagos sin anular por `paid_at` menos devoluciones en su día, más los ingresos a mano sin anular.
- `list_income(p_from, p_to, p_limit, p_cursor) → { items, meta }`; cada uno `{ kind: 'payment' | 'refund' | 'manual', id, at, amountCents, method, orderId, orderNumber, customerName, description }`, del más nuevo al más viejo.
- El ingreso a mano: `{ id, description, amountCents, method, receivedAt, voidedAt }`.

- [ ] **Paso 1: Las pruebas que fallan:** el resumen con pagos, una devolución de hoy sobre un pago de ayer (resta hoy, ayer no cambia), un pago anulado y un ingreso a mano; el pago de las 23:30 de Lima (foco 2); la lista mezcla y pagina; el mismo código no crea dos; anulado no cuenta; otro dueño no ve nada.
- [ ] **Paso 2–4.** **Paso 5: Commit** — `feat: add manual income, the income summary and the income list`.

---

### Task 4: Cuadre de caja en la base

**Archivos:** migración `<fecha>_cash.sql`; prueba `supabase/tests/103_cash.test.sql`; `900_structure`.

**Interfaces:**
- Tabla `public.cash_counts` (`business_date`, `opening_cents`, `cash_in_cents`, `cash_out_cents`, `expected_cents`, `counted_cents`, `difference_cents`, `closed_at`), con las cuentas como `CHECK` y su índice.
- `cash_expected(p_business_date date) → { businessDate, cashInCents, cashOutCents, otherMethods: { yape, plin, transfer }, lastOpeningCents }`: efectivo cobrado (pagos e ingresos a mano) y gastado (gastos y devoluciones), sin anular, de ese día de Lima; `lastOpeningCents` es con cuánto abrió el último cierre de un día anterior (0 si no hay).
- `close_cash_day(p_request_id, p_business_date, p_opening_cents, p_counted_cents) → cierre`: guarda todo con la cuenta de la base; un día futuro, `invalid`.
- `latest_cash_count(p_business_date date) → cierre | null`.
- El cierre: `{ id, businessDate, openingCents, cashInCents, cashOutCents, expectedCents, countedCents, differenceCents, closedAt }`.

- [ ] **Paso 1: Las pruebas que fallan:** con pagos, gastos e ingresos de varios medios y días, solo el efectivo de ese día de Lima; un pago anulado, un medio cambiado y una devolución en efectivo (foco 4); volver a contar crea otro cierre y manda el último; el mismo código cierra una vez; otro dueño no ve los cierres.
- [ ] **Paso 2–4.** **Paso 5: Commit** — `feat: add the cash count with expected cash and day closes`.

---

### Task 5: El medidor con años de gastos e ingresos

**Archivos:** `supabase/perf/` (la carga y `cases.mjs`).

**Interfaces:** el negocio del medidor con 3 años de gastos (unos 3 al día, algunos anulados y corregidos), ingresos a mano y cierres; casos para `list_expenses` (primera página y siguiente), `expenses_summary` del mes, `income_summary` del mes, `list_income` (primera y siguiente), `cash_expected` y `latest_cash_count`.

- [ ] **Paso 1:** los casos nuevos, que fallan sin los datos. **Paso 2:** la carga. **Paso 3:** `pnpm db:perf` → todos con índice y en menos de 50 ms. **Paso 4: Commit** — `test: measure the expense, income and cash reads with years of data`.

---

### Task 6: Los módulos en el celular

**Archivos:** `src/features/{expenses,income,cash}` (con `pnpm new:feature`), `src/lib/images.ts`, `src/lib/fetch-timeout.ts`, `app.config.ts` (el permiso de la cámara), `package.json` (expo-image-picker y expo-image-manipulator con `pnpm expo install`), el `INVALIDATES` de pedidos.

**Interfaces:**
- `expenses`: esquemas `expenseSchema`, `expenseCategorySchema`, `expensesPageSchema`, `expensesSummarySchema`; `api/` con las funciones de las tareas 1 y 2, `uploadReceipt(path, base64)` y `receiptUrl(path)` (URL firmada por 10 minutos); `expensesKeys`; consultas `expenseCategoriesQuery`, `expensesQuery` (por páginas), `expensesSummaryQuery(from, to)`, `receiptUrlQuery(path)`; hooks `useCreateExpense`, `useCorrectExpense`, `useVoidExpense`, `useRevertExpenseChange`, `useSaveExpenseCategory`, `useSetCategoryActive`, `useAttachReceipt` (achica, sube y llama a `attach_receipt`); reglas `expenseSaveLabel(cents)`, `expenseWhen(spentAt, now)` («Hoy, 09:10», «Ayer, 18:20», «Lunes 16», «9 nov»), `expenseLine(expense, now)` («Hoy, 09:10, Yape» o «Corregido, antes S/ 86.00»), `monthRange(now) → { from, to, label }` («noviembre»), `barShare(cents, max)`.
- `income`: esquemas, `api/`, `incomeKeys`, `incomeSummaryQuery(from, to)`, `incomeQuery` (por páginas), `useCreateManualIncome`, `useVoidManualIncome`; reglas `incomeSaveLabel`, `incomeLine(item, now)`.
- `cash`: esquemas, `api/`, `cashKeys`, `cashExpectedQuery(date)`, `latestCashCountQuery(date)`, `useCloseCashDay`; `rules/difference.ts`: `expectedCash(openingCents, cashInCents, cashOutCents)`, `cashDifference(countedCents, expectedCents) → { tone: 'ok' | 'short' | 'over', title, hint }` («La caja cuadra.» «Todo el efectivo está.»; «Faltan S/ 18.00.» «Revisa si falta anotar un gasto o un vuelto.»; «Sobran S/ 5.00.» «Revisa si falta anotar una venta.»), `closedText(count)` («La caja cuadró: S/ 120.00 en efectivo.», «Faltaron S/ 18.00. Quedó anotado.», «Sobraron S/ 5.00. Quedó anotado.»).
- `lib/images.ts`: `shrinkPhoto(uri) → Promise<string>` (base64 JPEG, lado mayor 1600 px, calidad 0,7).
- `fetchWithTimeout`: 60 s para Storage (`/storage/v1/`), 20 s para lo demás.
- Los cambios de pedidos y pagos refrescan también ingresos y caja; los de gastos, gastos y caja.

- [ ] **Paso 1: Las pruebas que fallan:** las reglas con los ejemplos de `cash.md` §5 y de la maqueta (100 %); el corte de 60 s para Storage; `shrinkPhoto` pide 1600 px y 0,7; las respuestas se revisan con Zod. **Paso 2–4.** **Paso 5: Commit** — `feat: add the expenses, income and cash modules with photo shrinking`.

---

### Task 7: Más, ordenado, y los tipos de gasto

**Archivos:** `src/components/ui/menu-section.tsx`, `menu-row.tsx`; filas de cada módulo (`ExpensesRow`, `IncomeRow`, `CashRow`, `ReceivablesRow`, `ProductsRow`, `ExpenseCategoriesRow`); `expenses/components/expense-categories-sheet.tsx`, `category-form.tsx`; `src/app/(main)/(tabs)/more.tsx`.

**Interfaces:**
- Más: «Tu negocio» (Gastos con lo gastado en el mes, Ingresos con lo cobrado en el mes, Por cobrar con lo que te deben, Cuadre de caja con «Hoy» o «Cerrado») y «Ajustes» (Productos y precios, Tipos de gasto con cuántos hay), y la cuenta.
- Tipos de gasto (hoja): «Los que eliges al anotar un gasto.», cada tipo con su ícono (apagado dice «Apagado»); tocarlo lo edita (nombre, ícono, «Guardar», «Apagar» o «Encender»); «Agregar tipo de gasto».

- [ ] **Paso 1: Las pruebas que fallan:** Más muestra los dos grupos y cada fila lleva a su pantalla (rutas de verdad); agregar un tipo, renombrarlo y apagarlo; un nombre repetido lo explica. **Paso 2–4.** **Paso 5: Commit** — `feat: group Más into business and settings, with expense types`.

---

### Task 8: Anotar gasto, con la foto de la boleta

**Archivos:** `expenses/components/expense-form.tsx`, `receipt-picker.tsx`, `category-chips.tsx`; ruta `src/app/(main)/expenses/new.tsx`; el + (`orders/components/new-menu.tsx`: «Un gasto», «El monto, el tipo y la foto de la boleta»).

**Interfaces:** `ExpenseForm({ onBack })` (PANTALLAS.gasto): el monto grande, «Tipo de gasto» en chips (sin tipos, «Agrega tus tipos de gasto» abre la hoja), «En qué», «Cómo pagaste» con los medios activos, «Boleta» («Tomar foto de la boleta» o la foto con «Quitar»), «Guardar gasto de S/ X» con «Guardando…». Al guardar, la foto sube; el formulario queda vacío con el tipo y el medio de antes, y el aviso dice «Gasto guardado: S/ X», o «Gasto guardado: S/ X. La foto no se subió.» con «Reintentar» (foco 1). Sin señal: «Sin conexión. Para guardar, espera la señal.».

- [ ] **Paso 1: Las pruebas que fallan:** guardar manda el código, el tipo, el monto, el medio y la descripción, y después la foto achicada a su ruta; la foto que falla deja el gasto y ofrece reintentar con la misma foto; el + abre Anotar gasto y atrás vuelve (rutas de verdad). **Paso 2–4.** **Paso 5: Commit** — `feat: record expenses with the receipt photo, also from the + menu`.

---

### Task 9: Gastos: el mes, la lista y la hoja del gasto

**Archivos:** `expenses/components/expenses-overview.tsx`, `expense-row.tsx`, `expense-sheet.tsx`, `receipt-photo.tsx`, `category-bars.tsx`; ruta `src/app/(main)/expenses/index.tsx`.

**Interfaces:**
- `ExpensesOverview({ onBack, onNew })` (PANTALLAS.gastos): «Gastado en noviembre S/ X» con las barras por tipo, «Anotar gasto», «Últimos gastos» de 20 en 20 con su ícono, «Hoy, 09:10, Yape» o «Corregido, antes S/ X», el ícono de la cámara si tiene boleta y el monto; «Toca un gasto para corregirlo o anularlo.». Vacío: «Todavía no hay gastos este mes» con «Anotar un gasto». Sin señal: «Sin conexión. Ves los gastos de las 11:32.».
- `ExpenseSheet({ expense, onClose, onDone })`: el título y «Insumos, hoy 09:10, Yape, con foto de la boleta.»; la foto, o «Agregar foto de la boleta»; monto, tipo, medio y descripción para corregir; «Ya se corrigió: antes era S/ X.»; «Nada se borra: la corrección y la anulación quedan anotadas.»; «Guardar corrección» y «Anular gasto». Avisos «Gasto corregido: S/ X» y «Gasto anulado», con «Deshacer».

- [ ] **Paso 1: Las pruebas que fallan:** el resumen y las filas; corregir manda los cambios y «Deshacer» llama a `revert_expense_change` con el gasto nuevo; anular y deshacer; agregar la foto después; un doble toque en «Deshacer» manda uno solo. **Paso 2–4.** **Paso 5: Commit** — `feat: show monthly expenses, correct or void them with undo, add receipts later`.

---

### Task 10: Ingresos

**Archivos:** `income/components/income-overview.tsx`, `income-row.tsx`, `income-form.tsx`, `void-income-sheet.tsx`; rutas `src/app/(main)/income/index.tsx` y `income/new.tsx`.

**Interfaces:**
- `IncomeOverview({ onBack, onNew, onOpenOrder })`: «Cobrado en noviembre S/ X» por medio; «Anotar ingreso»; la lista de 20 en 20: «Pedido #0042, Ana» (abre el pedido), «Devolución, pedido #0042» con «−S/ X», y los ingresos a mano con su descripción (abren «Anular ingreso»).
- `IncomeForm({ onBack })`: el monto, «En qué» (obligatorio), «Cómo te pagaron», «Hoy» o «Ayer», «Guardar ingreso de S/ X»; queda vacío y avisa «Ingreso guardado: S/ X».

- [ ] **Paso 1: Las pruebas que fallan:** el total y las filas de cada clase; anotar uno de ayer; anular uno a mano; un pago abre su pedido y atrás vuelve (rutas de verdad). **Paso 2–4.** **Paso 5: Commit** — `feat: show income with order payments and record manual income`.

---

### Task 11: Cuadre de caja

**Archivos:** `cash/components/cash-count.tsx`, `cash-closed.tsx`, `other-methods.tsx`; ruta `src/app/(main)/cash.tsx`.

**Interfaces:** `CashCount({ onBack })` (PANTALLAS.caja): «Efectivo» con «Abriste con» (por defecto, con cuánto abrió el último cierre), «Cobrado en efectivo + S/ X», «Gastos pagados en efectivo − S/ X» y «Debería haber S/ X»; «¿Cuánto hay en la caja?»; el resultado en color (`cashDifference`); «Yape, Plin y transferencias» con «Compáralos con lo que muestran sus apps.» si hay; «Cerrar el día» fijo abajo, cuando ya hay un conteo. Cerrado: «Día cerrado», `closedText` y «Volver a contar». Sin señal: «Sin conexión. Puedes contar; el cierre se guarda cuando vuelva la señal.» y «Cerrar el día» apagado.

- [ ] **Paso 1: Las pruebas que fallan:** lo que debería haber y el resultado mientras se escribe; cerrar manda el código, el día, la apertura y lo contado, y muestra «Día cerrado»; volver a contar; el recorrido Más → Cuadre de caja → atrás (rutas de verdad). **Paso 2–4.** **Paso 5: Commit** — `feat: count the cash drawer and close the day`.

---

### Task 12: Revisión completa y cierre

**Archivos:** `docs/plan/README.md` (estado), este plan («Resultado», «Lo que falta», «Lo que cambió»).

- [ ] **Paso 1:** `pnpm lint && pnpm lint:rules && pnpm typecheck && pnpm test:coverage && pnpm test:scripts && pnpm db:check` → todo pasa.
- [ ] **Paso 2: Documentar y commit** — `docs: record phase 5 results and the phone test`.

**Lo que pruebas tú en el celular** (va en «Lo que falta»): crear tus tipos de gasto en Más; anotar un gasto con la foto de la boleta y verla en su hoja; corregirlo y deshacer; anularlo y deshacer; anotar un ingreso a mano; cobrar un pedido en efectivo y verlo en Ingresos y en el cuadre; cuadrar la caja con un faltante y volver a contar.
