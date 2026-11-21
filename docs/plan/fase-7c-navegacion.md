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
