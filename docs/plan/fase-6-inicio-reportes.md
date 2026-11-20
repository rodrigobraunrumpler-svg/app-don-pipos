# Fase 6: Inicio y reportes — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que el dueño abra la app y sepa cómo va el día sin sacar cuentas (lo urgente, lo cobrado, lo que falta entregar, su stock y qué producir), vea cuánto entra, sale y gana por semana o por mes frente al periodo anterior, sepa qué alfajores se venden más y se lleve todo a Excel.

**Arquitectura:** una migración de lecturas (`home_summary`, `report_summary`, `report_ranking`, `export_rows`), sin tablas nuevas, sobre los índices de pedidos, pagos, ingresos y gastos; sus casos en el medidor. En el celular llega el módulo `reports`: sus cuentas (`period`, `delta`, `bars`, `csv`, `urgent`, `greeting`), Inicio en la pestaña, Reportes y Más vendidos encima de las pestañas, y «Exportar a Excel» que arma el archivo y lo comparte. Pedidos acepta abrir con un filtro puesto.

**Stack:** Postgres (plpgsql, pgTAP), supabase-js `rpc`, TanStack Query 5, Zod, Expo Router, expo-file-system y expo-sharing (los trae Expo Go; se instalan con `pnpm expo install`).

**Especificación:** `docs/spec/reports.md`, `docs/spec/README.md` (lo común, «Fechas por rango»), `docs/PROJECT_CONTEXT.md` (D11: ingresos por fecha de pago, ventas por fecha de entrega) y la maqueta: `assets/donpipos.js` (`inicio`, `pantallaPausa`, `cabeceraInicio`) y `assets/donpipos-2.js` (`PANTALLAS.reportes`, `PANTALLAS.ranking`, la fila «Exportar a Excel» de `PANTALLAS.ajustes`).

## Lo que entra

- Inicio: el saludo, lo urgente en orden, «Cobrado hoy» por medio con «Cuadrar caja ›», los números del día que abren Pedidos con su filtro, «Tu stock», qué producir, por entregar y próximos; cargando, actualizando, vacío, error y sin internet.
- Reportes (en Más): Semana, Mes o Elegir fechas; la ganancia, los ingresos y los gastos con su comparación; «Entra y sale» con barras que se tocan; lo cobrado por medio de pago; «Ver alfajores» y «Exportar».
- Más vendidos («Alfajores»): en unidades o en soles, por dónde llegan los pedidos y la ganancia por alfajor (sin costos, invita a ponerlos en Productos).
- Exportar a Excel (en Más y en Reportes): elegir el periodo y compartir el archivo.
- **Más adelante:** el consejo de la primera vez y la campana de avisos (fase 7, con la puesta en marcha y los recordatorios), la vista «servidor en pausa» (fase 8, con el proyecto de producción).

## Cambios respecto de la especificación

Se escriben en `reports.md` en la tarea 1, antes de la base.

1. **Inicio arma sus listas con lo que ya existe:** `home_summary()` trae los números del día (cobrado por medio, entregados, por entregar, por cobrar y si el cuadre se cerró); por entregar y próximos salen de `list_orders`, «Tu stock» de `stock_overview` y qué producir de `production_suggestion`. Así Inicio y Pedidos nunca difieren.
2. **«Elegir fechas» se escribe:** «Desde» y «Hasta» como día/mes («1/11», «15/11»), cada uno la última vez que llegó ese día (no hay selector de fecha sin librería). Hasta un año.
3. **Exportar arma un solo archivo** con una fila por pedido, pago, devolución, gasto e ingreso a mano, y una columna «Tipo» para filtrar en Excel (la especificación decía «pedidos, pagos y gastos»; los ingresos a mano también son ingresos).
4. **`report_ranking` trae los clientes que más compran,** pero la pantalla los muestra recién con la ficha del cliente (fase 7): la maqueta de Más vendidos no los tiene.
5. **El consejo de la primera vez va con la puesta en marcha** (fase 7, como dice `docs/plan/README.md`), y **la vista «servidor en pausa» con el proyecto de producción** (fase 8): saber que el servidor está en pausa necesita uno de verdad para confirmar cómo responde. Hasta entonces, la vista de error.
6. **El saludo cambia con la hora de Lima:** «Buenos días» hasta las 12:00, «Buenas tardes» hasta las 19:00 y «Buenas noches» después.

## Restricciones globales

- **Siguen las de las fases 1 a 5:** un solo proyecto (el de desarrollo), la CLI por `pnpm sb`, primero la prueba, una migración enviada no se edita, `private.fail` para los errores, cada función nueva para la app en la regla 8 (`900_structure`), JSON en camelCase, fechas ISO con milisegundos y «Z», `orNull`/`rpcResult` de `lib/rpc.ts`.
- **Cada migración:** `pnpm test:db`, `pnpm db:push`, `pnpm db:types` y `pnpm db:perf` (menos de 50 ms con años de datos, sin leer tablas enteras).
- **Lecturas:** con las reglas de acceso de quien lee; días de Lima con `>=` y `<` sobre `timestamptz`; ingresos por fecha de pago (con las devoluciones en su día), ventas y ranking por fecha de entrega (D11), sin anulados.
- **Módulos:** `reports` usa `orders`, `stock`, `products`, `expenses`, `income` y `cash` por su `index.ts`; ninguno usa `reports` (sin ciclos). Las cuentas en `rules/` con 100 % de cobertura.
- **Navegación:** Reportes y Más vendidos en la pila de `(main)`, con `<Screen>`; todo se abre con `router.navigate`; los números de Inicio abren la pestaña Pedidos con su filtro. Cada pantalla con su prueba de ruta.
- **Pantallas angostas (360 dp):** lo de la izquierda con `flex-1` y `numberOfLines`, los montos con `shrink-0`. Lint: un componente por archivo, hasta 250 líneas.
- **Librerías:** solo las que trae Expo Go, con `pnpm expo install`.
- **Textos:** los de la maqueta; los nuevos, en su estilo. Conceptos nuevos al glosario antes del código.
- **Commits:** en inglés, hasta 100 caracteres, sin cuerpo; uno por tarea.

## Foco de revisión

1. **Los bordes del día y de la semana de Lima:** un pago a las 23:30 de Lima del domingo cuenta en esa semana; el lunes a las 00:30 empieza la siguiente. → Tareas 1 y 3.
2. **Un pedido entregado y después anulado:** deja de contar en las ventas, en el ranking y en «entregados hoy»; su devolución resta en los ingresos del día en que se devolvió. → Tarea 1.
3. **El periodo anterior sin datos o en cero:** la comparación no se inventa (sin «+∞ %»): se ve «sin comparación». → Tareas 3 y 6.
4. **El archivo en Excel en español:** «;» como separador, tildes y «ñ» bien (BOM), montos «12.00», y una descripción con «;» o comillas no rompe las columnas. → Tarea 3.
5. **Inicio sin señal o con datos a medias:** lo guardado se ve con su hora; si una parte falla, el resto se muestra igual. → Tarea 5.

---

### Task 1: Las lecturas de Inicio y reportes en la base

**Archivos:** `docs/spec/reports.md` (los cambios de arriba), `docs/glossary.md`; migración `<fecha>_reports.sql`; prueba `supabase/tests/110_reports.test.sql`; `900_structure`.

**Interfaces:**
- `home_summary() → { collectedTodayCents, collectedByMethod: { cash, yape, plin, transfer }, deliveredToday, toDeliver, receivablesCents, cashClosedToday }`: lo cobrado hoy (pagos menos devoluciones de hoy, más ingresos a mano), los entregados hoy sin anular, por entregar como el filtro de Pedidos, lo que te deben y si el cuadre de hoy tiene un cierre.
- `report_summary(p_from date, p_to date) → { incomeCents, expensesCents, profitCents, previous: { incomeCents, expensesCents, profitCents }, bars: [{ label, from, to, incomeCents, expensesCents }], byMethod: { cash, yape, plin, transfer } }`: el periodo anterior tiene el mismo largo y termina el día antes; las barras van por día hasta 7 días y por semana del mes («1 al 7», «8 al 14», …, la última «a hoy» si termina hoy) con más días.
- `report_ranking(p_from date, p_to date) → { products: [{ productId, name, imageUrl, units, salesCents, costCents, profitCents }], channels: { whatsapp, local, web }, topCustomers: [{ customerId, name, orders, spentCents }] }`: de los pedidos entregados por fecha de entrega, sin anulados; `profitCents` null sin costo.
- `export_rows(p_from date, p_to date) → [{ kind: 'order' | 'payment' | 'refund' | 'expense' | 'income', at, orderNumber, customerName, detail, method, amountCents, status }]`, del más viejo al más nuevo.

- [ ] **Paso 1: Las pruebas que fallan,** con dos semanas de datos: los totales coinciden con la suma a mano; ingresos por fecha de pago y ventas por fecha de entrega; los días cortan a las 00:00 de Lima (05:00 UTC) (foco 1); el periodo anterior del mismo largo; un entregado y después anulado deja de contar (foco 2); las barras de una semana y de un mes; otro dueño no ve nada.
- [ ] **Paso 2–4:** migración, `pnpm test:db`, `pnpm db:push`, `pnpm db:types`. **Paso 5: Commit** — `feat: add the home summary, the period report, the ranking and the export rows`.

---

### Task 2: El medidor de Inicio y reportes

**Archivos:** `supabase/perf/cases.mjs`.

**Interfaces:** casos para `home_summary`, `report_summary` de la semana y del mes, `report_ranking` del mes y `export_rows` del mes, con los 3 años de pedidos, pagos, gastos e ingresos del negocio medido.

- [ ] **Paso 1:** los casos. **Paso 2:** `pnpm db:perf` → todos con índice y en menos de 50 ms (si uno no, el índice o la consulta que falte, en una migración nueva). **Paso 3: Commit** — `test: measure the home and report reads with years of data`.

---

### Task 3: El módulo de reportes en el celular

**Archivos:** `src/features/reports` (con `pnpm new:feature reports`); `package.json` (expo-file-system y expo-sharing con `pnpm expo install`).

**Interfaces:**
- Esquemas y `api/` de las cuatro lecturas; `reportsKeys`; consultas `homeSummaryQuery`, `reportSummaryQuery(from, to)`, `rankingQuery(from, to)`; `exportRows(from, to)`.
- `rules/period.ts`: `periodRange(kind: 'week' | 'month', now) → { from, to, previousFrom, previousTo, label }` (el miércoles 18 de noviembre: la semana del lunes 16 al miércoles 18, la anterior del lunes 9 al miércoles 11; el mes del 1 al 18 y el anterior del 1 al 18 de octubre), `parseRangeDay(text, today) → string | null` (la última vez que llegó ese día/mes), `customRange(fromText, toText, today)`.
- `rules/delta.ts`: `delta(current, previous, upIsGood) → { text, tone: 'good' | 'watch' | 'neutral' } | null` (S/ 3,486 frente a S/ 3,112 → «+12 %», bien; gastos +6 % → ojo; 0 % → neutro; sin datos antes → null).
- `rules/bars.ts`: `barText(bar) → «Del 1 al 7 entró S/ 1,180.00 y salió S/ 410.00.»` (un día: «El lunes entró…», hoy: «Hoy entró…»).
- `rules/csv.ts`: `toCsv(rows) → string` con BOM, «;», montos «12.00», comillas cuando el texto trae «;», comillas o saltos (foco 4).
- `rules/urgent.ts`: `urgentRows(input) → [{ kind, title, detail }]` en el orden de `reports.md` §5 (tarde y atrasado, agotado, revisar, se acaba), con el ejemplo de la maqueta.
- `rules/greeting.ts`: `greeting(now)`.
- `lib/share-file.ts` (o en el módulo): escribir el texto en la caché y compartirlo como `text/csv`.

- [ ] **Paso 1: Las pruebas que fallan:** cada regla con los ejemplos de `reports.md` §5 (100 %); el archivo se escribe y se comparte. **Paso 2–4.** **Paso 5: Commit** — `feat: add the reports module with periods, deltas, bars, csv and urgent rules`.

---

### Task 4: Pedidos abre con un filtro puesto

**Archivos:** `src/app/(main)/(tabs)/orders.tsx`, `src/features/orders/components/order-list.tsx`.

**Interfaces:** la pestaña Pedidos lee el parámetro `filter` (`today`, `to_deliver`, `to_collect`, `upcoming`, `all`) y `OrderList` lo pone como filtro elegido cada vez que llega uno nuevo.

- [ ] **Paso 1: La prueba que falla:** abrir `/orders?filter=to_deliver` deja elegido «Por entregar» y pide esa lista; uno desconocido queda en «Hoy». **Paso 2–4.** **Paso 5: Commit** — `feat: open the orders tab with a filter already chosen`.

---

### Task 5: Inicio

**Archivos:** `reports/components/home-screen.tsx` y sus partes (`home-urgent.tsx`, `collected-today.tsx`, `stock-tray.tsx`, `home-suggestion.tsx`, `home-orders.tsx`); `src/app/(main)/(tabs)/home.tsx`.

**Interfaces:** `Home({ onNavigate })` (`inicio` de la maqueta): el logo y el saludo con la fecha; lo urgente (cada fila lleva a su pedido, a Registrar producción o al alfajor); «Cobrado hoy» con la barra y los medios con monto y «Cuadrar caja ›»; «entregados», «por entregar» y «por cobrar», que abren Pedidos con su filtro o Por cobrar; «Tu stock» con cada alfajor y «Ver stock»; qué producir con «Registrar producción» o «Tu producción está al día…»; «Por entregar» y «Próximos» con las filas de Pedidos. Vacío: «Todavía no hay pedidos hoy…» y «Anotar un pedido». Tirar para actualizar. Sin señal: «Sin conexión. Ves lo último que se cargó, a las 11:32.». Si una parte falla, las demás se ven (foco 5).

- [ ] **Paso 1: Las pruebas que fallan:** lo urgente en orden; los números abren Pedidos con su filtro (rutas de verdad); el vacío; sin señal. **Paso 2–4.** **Paso 5: Commit** — `feat: show the home screen with what is urgent, collected, due and to produce`.

---

### Task 6: Reportes y Más vendidos

**Archivos:** `reports/components/reports-screen.tsx` y sus partes (`period-picker.tsx`, `report-kpis.tsx`, `in-out-chart.tsx`, `by-method.tsx`), `ranking-screen.tsx`; rutas `src/app/(main)/reports/index.tsx` y `reports/ranking.tsx`; la fila «Reportes» en Más.

**Interfaces:**
- `ReportsScreen({ onBack, onRanking, onExport })` (PANTALLAS.reportes): «Semana», «Mes» o «Elegir fechas» (Desde/Hasta); «Ganancia» (ingresos menos gastos), «Ingresos» (pagos recibidos) y «Gastos» (lo anotado), cada uno con su comparación o sin ella (foco 3); «Entra y sale» con barras que se tocan y su texto; «Por medio de pago»; «Ver alfajores» y «Exportar». Vacío: «Todavía no hay datos…».
- `RankingScreen({ from, to, onBack, onProducts })` (PANTALLAS.ranking, «Alfajores»): «Unidades» o «Soles»; «Por dónde llegan los pedidos»; «Ganancia por alfajor» (sin costos, «Pon un costo aproximado…» con «Ir a Productos»).

- [ ] **Paso 1: Las pruebas que fallan:** el periodo cambia lo que se pide; la comparación y su tono; tocar una barra cambia el texto; fechas escritas; el ranking en unidades y en soles; sin costos invita a Productos; Más → Reportes → Alfajores → atrás (rutas de verdad). **Paso 2–4.** **Paso 5: Commit** — `feat: show period reports with comparisons and the best-selling alfajores`.

---

### Task 7: Exportar a Excel

**Archivos:** `reports/components/export-sheet.tsx`, `export-row.tsx`; Más («Ayuda» → «Exportar a Excel») y el botón de Reportes.

**Interfaces:** `ExportSheet({ onClose, initial })`: «Esta semana», «Este mes», «El mes pasado» o las fechas del reporte; «Compartir archivo» arma el CSV (`toCsv(exportRows)`), lo guarda y abre «Compartir» del celular con `don-pipos-<desde>-<hasta>.csv`. Sin señal, apagado.

- [ ] **Paso 1: Las pruebas que fallan:** exportar el mes pide sus filas, arma el archivo y lo comparte con su nombre; sin filas, lo dice. **Paso 2–4.** **Paso 5: Commit** — `feat: export a period to an Excel file and share it`.

---

### Task 8: Revisión completa y cierre

**Archivos:** `docs/plan/README.md` (estado), este plan («Resultado», «Lo que falta», «Lo que cambió»).

- [ ] **Paso 1:** `pnpm lint && pnpm lint:rules && pnpm typecheck && pnpm test:coverage && pnpm test:scripts && pnpm db:check` → todo pasa.
- [ ] **Paso 2: Documentar y commit** — `docs: record phase 6 results and the phone test`.

**Lo que pruebas tú en el celular** (va en «Lo que falta»): abrir Inicio con pedidos del día (lo urgente, lo cobrado, los números que abren Pedidos con su filtro, el stock y qué producir); Reportes de la semana y del mes con su comparación, tocar las barras y elegir fechas; Alfajores en unidades y en soles; exportar el mes y abrir el archivo en Excel o en Hojas de cálculo.

## Resultado (2026-11-20)

La fase 6 quedó construida en la rama `fase-6`, con un commit por tarea y un arreglo de la exportación.

| Comprobación | Resultado |
|---|---|
| `pnpm test:coverage` | 612 pruebas; 100 % en `lib/{money,dates,errors}`, `theme/tokens` y las cuentas de `features/*/rules` |
| `pnpm db:check` | Pasa entera: 667 pruebas de la base en 32 archivos, consejos de Supabase sin nada pendiente y tipos al día |
| `pnpm db:perf` | 39 casos, todos con índice y en menos de 50 ms: `home_summary` 13 ms, `report_summary` 13 ms, `report_ranking` 3 ms, `export_rows` de un mes 15 ms |
| `pnpm lint`, `pnpm lint:rules`, `pnpm typecheck`, `pnpm test:scripts` | Pasan |

En el proyecto de desarrollo quedaron tres migraciones: las lecturas de Inicio y reportes, el periodo anterior que pide la app y el día de cada fila exportada. No hay tablas nuevas ni datos DEMO nuevos: Inicio y Reportes muestran lo que anotes en la prueba.

Llegaron dos librerías que ya trae Expo Go: `expo-file-system` (guardar el archivo) y `expo-sharing` (abrir «Compartir»). Después de juntar en `main`, se corre `pnpm install` en la copia principal.

### Lo que falta: probar en el celular

```bash
cd /home/javier/var-mar/app && pnpm install && pnpm start --tunnel
```

Ingresa con el dueño DEMO (900 000 101, el PIN de tu `.env.local`). Antes, anota dos o tres pedidos de hoy (uno a recoger con una hora que ya pasó, uno cobrado por Yape y uno sin cobrar), un gasto y una venta de mostrador en efectivo.

1. **Inicio:** arriba, el saludo según la hora y la fecha. Debajo, lo urgente en este orden: el pedido que va tarde («#00xx de … va N min tarde»), lo agotado, lo que hay que revisar y lo que se acaba. Cada fila lleva a su pedido, a Registrar producción o al alfajor.
2. **Cobrado hoy:** el total con la barra y cada medio con su monto (los que están en cero no salen) y «Cuadrar caja ›». Toca «por entregar»: se abre Pedidos con «Por entregar» elegido. Vuelve a Inicio y toca «entregados» (Pedidos en «Hoy») y «por cobrar» (Por cobrar).
3. **Tu stock y qué producir:** toca un alfajor (su detalle) y «Ver stock». Si hay 7 días de ventas, sale cuánto conviene hacer con «Registrar producción»; si no, no dice nada.
4. **Por entregar y Próximos:** las mismas filas de Pedidos. Tira hacia abajo para actualizar.
5. **Reportes:** Más → «Reportes». En «Semana» va del lunes a hoy, comparado con los mismos días de la semana pasada. Toca las barras de «Entra y sale»: el texto de arriba cambia. Prueba «Mes» y después «Elegir fechas», con «1/11» y «15/11» → «Ver».
6. **Alfajores:** «Ver alfajores», en «Unidades» y en «Soles», y «Por dónde llegan los pedidos». Sin costos en Productos, «Ganancia por alfajor» invita a ponerlos: «Ir a Productos».
7. **Exportar a Excel:** Más → Ayuda → «Exportar a Excel» → «Este mes» → «Compartir archivo». Mándatelo por WhatsApp o guárdalo en Drive y ábrelo en Excel o en Hojas de cálculo: las tildes, los montos «12.00» y una fila por pedido, pago, gasto e ingreso. Desde Reportes, «Exportar» llega con las fechas del reporte ya elegidas.
8. **Sin señal (modo avión):** Inicio dice «Sin conexión. Ves lo último que se cargó, a las …»; Reportes, «Ves los números de las …»; «Compartir archivo» se apaga.

### Lo que cambió respecto de este plan

**Tarea 1**
- Las barras traen desde, hasta y los montos; el nombre de cada una («Lun», «Hoy», «1 al 7», «15 a hoy») lo pone la app en `bars.ts`. Van por día hasta 7 días, por semana del periodo hasta 62 y por mes en un rango más largo.
- «Por entregar» de `home_summary` sale de `order_counts`, así Inicio y Pedidos dicen lo mismo. La ganancia por alfajor usa el costo guardado en cada venta y queda vacía si a alguna le falta.

**Tarea 2**
- Con años de datos todo responde en menos de 50 ms con los índices que ya había: no hizo falta uno nuevo.

**Tarea 3**
- La especificación compara la semana del lunes 16 al miércoles 18 con la del lunes 9 al miércoles 11, y el mes del 1 al 18 con el 1 al 18 del mes anterior. Por eso `report_summary` recibe desde cuándo empieza el periodo anterior (una migración nueva). Si el mes pasado no tiene ese día (el 31 de marzo), se compara con los mismos días justo antes.
- Las filas para Excel se piden solo al exportar y no se guardan en el celular: un año de filas no ocupa la caché.
- Ningún otro módulo refresca las consultas de reportes (tendría que importarlas y habría un círculo): Inicio y Reportes las vuelven a pedir al volver a la pantalla.
- Lo urgente recibe los pedidos atrasados con su número y su demora ya escritos por `orders`. «No alcanza para los pedidos» (un estado de Stock que la especificación no nombra) va justo después de lo agotado.
- El archivo pone «'» delante de un texto que empieza con =, +, - o @, para que Excel nunca lo tome como fórmula.

**Tarea 4**
- El filtro llega una vez y se borra de la ruta: así el siguiente toque en Inicio lo vuelve a poner, y volver por la barra de pestañas no pisa el que eligió el dueño.

**Tarea 5**
- Inicio recibe una función por destino (como las demás pantallas), no un solo `onNavigate`. Cada parte carga por su cuenta: si una falla, dice «No se pudo cargar…» con «Reintentar» y las demás se ven.
- Lo urgente mira la primera página de «Por entregar» (20 pedidos, como Pedidos).
- Los colores de cada medio de pago de la maqueta pasaron al tema (`method-cash`, `method-yape`, `method-plin`, `method-transfer`). La campana de avisos de la cabecera queda para la fase 7, con los recordatorios.

**Tarea 6**
- Reportes y Alfajores usan la cabecera de las demás pantallas encima de las pestañas, en vez de un título que se achica al bajar.
- Alfajores recibe el periodo de Reportes en la ruta; un enlace suelto muestra el mes en curso. Los clientes que más compran llegan con la ficha del cliente (fase 7).

**Tarea 7**
- La hoja abre con las fechas del reporte ya elegidas (desde Más, «Este mes»), y no repite la semana o el mes si son las mismas fechas. Más estrenó el grupo «Ayuda» con «Exportar a Excel»; «Soporte por WhatsApp» no entra en esta fase.

**Tarea 8**
- Al escribir este resultado salió un error en la exportación: un pedido entraba al archivo por su día, pero la columna «Fecha» decía cuándo se anotó. Una migración nueva da a cada fila su día de Lima: un pedido va con su día y su hora acordada (sin hora, vacía).
