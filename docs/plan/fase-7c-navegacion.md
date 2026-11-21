# Fase 7c: La app sin «Más» — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** que cada cosa esté en la pantalla donde se usa y la pestaña Más desaparezca. La barra de abajo queda: Inicio, Pedidos, +, Stock y Reportes.

**Arquitectura:**
- **Rutas:**
  - Reportes pasa a ser una pestaña.
  - Las pantallas de Más (`/more/*`) pasan a `/settings/*`, con una pantalla nueva, Ajustes, que se abre con el ⚙ de Inicio.
  - Clientes pasa a vivir dentro de la pestaña Pedidos.
- **Los módulos no se tocan por dentro, salvo con espacios** (`header`, `shortcuts`, `onIncome`, `onExpenses`) que llenan las pantallas de `src/app`.
- **Las filas que solo vivían en Más se borran.**

**Stack:** Expo Router (Tabs y Stack), sin librerías nuevas ni cambios en la base.

**Especificación:** la maqueta aprobada por el dueño el 2026-11-20, `docs/design/pantallas/sin-mas.html` (incluye «Dónde quedó cada cosa» y los recorridos). Se actualizan `businesses.md`, `reports.md`, `customers.md`, `reminders.md`, `expenses.md`, `income.md`, `products.md`, `loyalty.md` y `messages.md`, donde dicen «Más».

## Lo que cambia

1. **Barra de abajo:** Inicio, Pedidos, +, Stock y **Reportes** (en el lugar de Más).
2. **Inicio:** un ⚙ junto a la campana abre **Ajustes**.
3. **Ajustes** es una pantalla de la pila, con «Volver» y tres grupos:
   - *Tu negocio:* Productos y precios, Medios de pago, Delivery, Producción, Tipos de gasto.
   - *Tus clientes:* Fidelidad, Mensajes de WhatsApp, Clientes que no vuelven.
   - *Tu cuenta y este celular:* tu número, entrar con huella, pedir huella o PIN, Recordatorios, cambiar PIN y cerrar sesión.
4. **Pedidos:** arriba, «Pedidos | Clientes».
   - Clientes muestra la lista de siempre y, arriba, Fidelidad y Clientes que no vuelven.
   - La ruta `/customers` se borra; la ficha `/customers/[id]` queda.
   - Si Inicio abre Pedidos con un filtro, se ve la lista de pedidos.
5. **Reportes:**
   - Sin «Volver», porque es una pestaña.
   - Las tarjetas Ingresos y Gastos abren su lista (`/income`, `/expenses`), con «Ver la lista ›».
   - «Exportar a Excel» va debajo del periodo.
6. **Stock:** «Productos y precios» arriba.
7. **Gastos:** «Tipos de gasto» arriba.
8. **El +:** «Un ingreso» (`/income/new`).
9. **Rutas:** `/more/products`, `/more/messages`, `/more/loyalty` y `/more/change-pin` pasan a `/settings/...`. `/reports` es la pestaña; «Más vendidos» sigue en `/reports/ranking`.
10. **Se borran** las filas de Más que ya no se usan: Gastos, Ingresos, Reportes, Clientes, Por cobrar y Cuadre de caja. Por cobrar y Cuadrar caja siguen en Inicio.

## Restricciones globales

- **Navegación suave:** las pestañas como hoy, y Ajustes, Gastos, Ingresos y la ficha del cliente se deslizan desde la derecha con «Volver».
- **Un componente por archivo y colores solo del tema.** Pantallas angostas (360 dp): lo de la izquierda con `flex-1` y `numberOfLines`.
- **Cada pantalla que cambia lleva su prueba de ruta.**
- **Commits** en inglés, hasta 100 caracteres, sin cuerpo.

## Foco de revisión

1. «Volver» desanda el camino en Ajustes, Gastos, Ingresos y la ficha del cliente abierta desde Pedidos › Clientes.
2. Un filtro que llega desde Inicio (por entregar, por cobrar) muestra la lista de pedidos aunque se estuviera mirando Clientes.
3. Ninguna ruta vieja (`/more`, `/customers`) queda enlazada.

---

### Task 1: La barra, Reportes como pestaña, Ajustes y las rutas nuevas

**Archivos:**
- `src/app/(main)/(tabs)/_layout.tsx`, `reports.tsx` (nueva); se borran `more.tsx` y `src/app/(main)/reports/index.tsx`.
- `src/app/(main)/settings/{index,products,messages,loyalty,change-pin}.tsx` (las de `more/` movidas).
- `src/features/reports/components/reports-screen.tsx`: un título sin «Volver».
- `src/features/auth/components/account-section.tsx`: `title` y `extra`.
- `src/components/ui/screen-title.tsx` (nueva).
- Pruebas de ruta: `settings`, `reports`, `products`, `more` (se borra), `safe-area`.

- [ ] **Paso 1:** las pruebas de ruta que fallan.
  - Ajustes abre cada hoja y su pantalla, y «Volver» regresa.
  - Reportes es una pestaña, sin «Volver».
  - La barra ya no tiene Más.
- [ ] **Paso 2:** implementar. `pnpm test`, `pnpm lint` y `pnpm typecheck`.
- [ ] **Paso 3: Commit** — `feat: replace the Más tab with Reportes and open the settings from their own screen`.

### Task 2: El ⚙ de Inicio y «Un ingreso» en el +

**Archivos:** `src/app/(main)/(tabs)/home.tsx`, `src/components/ui/icon-button.tsx` (nueva), `src/features/orders/components/new-menu.tsx` y `src/app/(main)/(tabs)/_layout.tsx`.

- [ ] **Paso 1:** pruebas que fallan.
  - El ⚙ de Inicio abre `/settings` y «Volver» regresa a Inicio.
  - El + ofrece «Un ingreso», que abre `/income/new`.
- [ ] **Paso 2:** implementar.
- [ ] **Paso 3: Commit** — `feat: open the settings from Inicio and add «Un ingreso» to the + menu`.

### Task 3: Pedidos | Clientes

**Archivos:**
- `src/app/(main)/(tabs)/orders.tsx`.
- `src/features/orders/components/order-list.tsx`: `header`.
- `src/features/customers/components/customers-screen.tsx`: `header` y `shortcuts`; `onBack` opcional.
- Se borra `src/app/(main)/customers/index.tsx`.
- Prueba de ruta `customers`.

- [ ] **Paso 1:** pruebas que fallan.
  - Pedidos › Clientes › la ficha › uno de sus pedidos; «Volver» desanda paso a paso.
  - Con un filtro desde Inicio se ve la lista de pedidos.
  - Arriba de los clientes: Fidelidad y Clientes que no vuelven.
- [ ] **Paso 2:** implementar.
- [ ] **Paso 3: Commit** — `feat: show customers next to orders in the Pedidos tab`.

### Task 4: Reportes, Stock y Gastos con lo suyo

**Archivos:**
- `src/features/reports/components/{report-kpis,kpi-card,period-report,reports-screen}.tsx`.
- `src/features/stock/components/stock-overview.tsx`.
- `src/features/expenses/components/expenses-overview.tsx`.
- `src/app/(main)/(tabs)/reports.tsx`.
- Se borran las filas de Más que ya no se usan.
- Pruebas de ruta `income`, `reports` y `stock`.

- [ ] **Paso 1:** pruebas que fallan.
  - Reportes › Gastos y Reportes › Ingresos abren su lista y «Volver» regresa.
  - «Exportar a Excel» está en Reportes.
  - Stock › Productos y precios.
  - Gastos › Tipos de gasto.
- [ ] **Paso 2:** implementar.
- [ ] **Paso 3: Commit** — `feat: reach expenses, income, export, prices and expense types from where they are used`.

### Task 5: Cierre

- [ ] Las especificaciones donde decían «Más», el README del plan, «Resultado» y «Lo que falta» de este plan.
- [ ] Verificar: `pnpm test`, `pnpm lint`, `pnpm typecheck` y `prettier --check`.
- [ ] **Commit** — `docs: record the navigation without Más`.

## Resultado (2026-11-20)

La fase 7c quedó construida en la rama `fase-7c`, con un commit por tarea. Pasan 761 pruebas, lint, tipos y formato. No hubo cambios en la base ni librerías nuevas.

### Lo que falta: probar en el celular

```bash
cd /home/javier/var-mar/app && pnpm start --tunnel
```

1. **La barra de abajo** dice Inicio, Pedidos, +, Stock y Reportes. Más ya no está.
2. **Inicio → ⚙** (arriba a la derecha, al lado de la campana) abre **Ajustes**, con tres grupos:
   - Tu negocio;
   - Tus clientes;
   - Tu cuenta y este celular, con Recordatorios y cerrar sesión.

   Abre una hoja y una pantalla (Productos y precios); la flecha vuelve.
3. **Pedidos:** arriba, «Pedidos | Clientes».
   - En Clientes, arriba están Fidelidad y Clientes que no vuelven.
   - Abre un cliente y vuelve: sigues en Clientes.
   - Toca «por entregar» en Inicio: Pedidos se abre en la lista de pedidos.
4. **Reportes** (la pestaña):
   - «Exportar a Excel» está debajo del periodo.
   - La tarjeta «Gastos» abre la lista de gastos, con Tipos de gasto arriba, y la flecha vuelve.
   - La tarjeta «Ingresos» abre los ingresos.
5. **Stock:** arriba, «Productos y precios».
6. **El +:** la última opción es «Un ingreso».
7. **Las transiciones:** las pestañas cambian con su desliz corto, y Ajustes, Gastos, Ingresos y la ficha del cliente entran desde la derecha.

### Lo que cambió respecto de este plan

- **Todo lo de Reportes se hizo en la tarea 1:** el título sin «Volver», «Exportar a Excel» y las tarjetas que abren su lista. Era la misma pantalla y las mismas pruebas.
- **«Pedidos | Clientes» se guarda en la ruta** (`?ver=clientes`): sigue elegido al volver de la ficha de un cliente, aunque la pantalla se vuelva a armar.
- **Clientes muestra «N clientes» encima de la lista,** ya que el título de la pestaña es Pedidos.
- **Stock usa `ProductsRow` directo,** sin un espacio que llene la pantalla: `stock` ya dependía de `products`, así que no suma ninguna dependencia nueva.

## Después de la revisión final (2026-11-20)

Un revisor aparte leyó toda la rama y probó la navegación con las pestañas y la pila de verdad: los tres focos de revisión se cumplen. No encontró nada crítico: cuatro arreglos importantes y ocho detalles menores. Lo importante se corrigió en la rama `fase-7c-review`, cada arreglo con una prueba que primero falló. Gates: 764 pruebas de Jest y lint, tipos y formato limpios.

**Arreglado**
- **«Un gasto» decía «Los tipos de gasto se cambian en Más».** Ahora dice «en Ajustes».
- **TalkBack leía las tarjetas de Reportes sin el monto** («Ingresos: ver la lista»). Ahora lee todo lo que muestran: el título, el monto, qué es, la comparación y «Ver la lista».
- **Cambiar «Clientes que no vuelven» no actualizaba la lista de abajo.** En Pedidos › Clientes, pasar de 30 a 60 días dejaba en «No vuelven» a los de 30. Ahora guardar ese ajuste vuelve a pedir los clientes.
- **En Clientes, con el teclado abierto no se veían los resultados.** Lo de arriba (título, «Pedidos | Clientes», buscador, filtros y los dos atajos) ocupaba unos 400 dp. Ahora, mientras escribes en el buscador, los atajos se esconden.

**Para probar en el celular:** en Pedidos › Clientes, busca un cliente con el teclado abierto: se ven los resultados.

**Quedó para después** (detalles menores, en orden de lo que más se notaría)
1. Pasar de Pedidos a Clientes y volver deja la lista de pedidos en «Hoy» y borra la búsqueda.
2. En un día sin cobros, entregas, pendientes ni deudas, Inicio no muestra «Cuadrar caja ›», y sin Más ese día no hay otra entrada. La maqueta aprobada tiene el mismo hueco: decide el dueño si se muestra siempre.
3. Gastos, sin ningún gasto todavía, no muestra «Tipos de gasto» arriba (Ajustes sí).
4. Documentos que todavía dicen «Más»: `PROJECT_CONTEXT.md` (árbol de rutas y «Más → Cuenta») y `glossary.md`. `businesses.md` dice que Recordatorios se abre desde la campana, y `stock.md` y `products.md` no mencionan «Productos y precios» en Stock.
5. Unos 20 comentarios del código y títulos de pruebas dicen «Más».
6. Nombres: `?ver=clientes` está en español (la regla pide inglés, `?view=customers`), y `type View` tapa el `View` de React Native en `orders.tsx`.
7. Pruebas que faltan: la barra de abajo sin Más, el área segura de `/settings` y de la pestaña Reportes, la sección de la cuenta de verdad con su título nuevo, y + → «Un ingreso» con las rutas de verdad.
8. Dos desvíos sin anotar: Stock importa `ProductsRow` directo (no por un espacio) y `reports` sigue exportando `ExportRow`, que nadie usa afuera.

## Los detalles que quedaban (arreglados el 2026-11-20)

A pedido tuyo se arreglaron también los ocho detalles menores, en la rama `fase-7c-detalles`.

1. **Pedidos y Clientes quedan armados** al cambiar de vista: volver a Pedidos deja el filtro y la búsqueda como estaban. Clientes se arma la primera vez que se mira.
2. **«Cuadrar caja ›» sale siempre en Inicio,** también un día sin nada (puede haber gastos en efectivo). Lo decidió el equipo: así nunca falta la entrada al cuadre.
3. **Gastos sin ningún gasto** muestra «Tipos de gasto» arriba, como con gastos.
4. **Los documentos** ya no hablan de Más: `PROJECT_CONTEXT.md` (el árbol de rutas y la cuenta), `glossary.md`, `businesses.md` (la campana muestra los avisos, no los interruptores), `stock.md` y `products.md` («Productos y precios» también desde Stock), `cash.md` y `reports.md` («Cuadrar caja» siempre).
5. **Los comentarios del código y los títulos de las pruebas** dicen dónde vive cada cosa ahora. Quedan los que cuentan el cambio («en el lugar de Más, fase 7c»).
6. **Nombres:** la ruta usa `?view=customers` (antes `?ver=clientes`), y el tipo de la vista se llama `Shown`, para no tapar el `View` de React Native.
7. **Pruebas nuevas:**
   - `tabs.test.tsx`, con las pestañas y la pila de verdad: la barra de abajo sin Más, + → «Un ingreso» → `/income/new` y atrás, un filtro desde Inicio mirando Clientes, y volver de Clientes sin perder el filtro ni la búsqueda;
   - el área segura de `/settings` y de la pestaña Reportes;
   - la sección de la cuenta con su título y lo que se le pone antes de «Cambiar PIN».
8. **Lo que no estaba anotado:** Stock usa `ProductsRow` directo (ver «Lo que cambió»), y `reports` ya no exporta `ExportRow`, que solo usa Reportes por dentro.
