# Cuadre de caja (`features/cash`)

## 1. Qué resuelve

Al cerrar el día, saber si el efectivo cuadra: cuánto debería haber frente a lo que se contó. Yape, Plin y transferencias van aparte, para compararlos con lo que muestran sus apps.

**Pantallas de la maqueta que cubre:**
- Cuadre de caja, con sus vistas Cuadra, Falta dinero y Sin internet.
- «Cuadrar caja» en Inicio y «Cuadre de caja» en Más.

## 2. Datos

### `cash_counts`

Cada conteo queda guardado; el último del día es el que vale.

| Columna | Tipo | Regla |
|---|---|---|
| `business_date` | date | El día de Lima |
| `opening_cents` | int ≥ 0 | Con cuánto abrió |
| `cash_in_cents` | int ≥ 0 | Lo cobrado en efectivo: pagos e ingresos a mano. Se guarda al cerrar |
| `cash_out_cents` | int ≥ 0 | Los gastos y las devoluciones pagados en efectivo. Se guarda al cerrar |
| `expected_cents` | int | `opening_cents` + lo cobrado − los gastos y las devoluciones |
| `counted_cents` | int ≥ 0 | Lo que se contó |
| `difference_cents` | int | Lo contado − lo que debería haber |
| `closed_at` | timestamptz | |

### Índices

| Tabla | Índice | Sirve para |
|---|---|---|
| `cash_counts` | `(business_id, business_date desc, closed_at desc)` | El último cierre del día y el historial |

## 3. Funciones de la base

- **`cash_expected(business_date)`:** para ese día de Lima, devuelve:
  - lo cobrado en efectivo (pagos e ingresos a mano, sin anular);
  - los gastos pagados en efectivo, sin anular, y las devoluciones en efectivo de ese día;
  - los totales de Yape, Plin y transferencia;
  - con cuánto abrió el último cierre de un día anterior, para «Abriste con».

  No recibe con cuánto abrió (decidido en el plan de la fase 5): «Debería haber» lo calcula la vista previa mientras se escribe, y la base al cerrar.
- **`close_cash_day(request_id, business_date, opening_cents, counted_cents)`:** guarda todo lo de arriba junto con el conteo. «Volver a contar» crea otro cierre, porque nada se borra.
- **`latest_cash_count(business_date)`.**
- **Si se corrige el medio de un pago de un día ya cerrado,** el cierre guardado queda como se hizo; `cash_expected` de ese día ya muestra lo corregido, y el dueño puede «Volver a contar».

## 4. Permisos

Los comunes: el dueño lee sus cierres y escribe solo con las funciones.

## 5. Cuentas en el celular (`rules/`)

- **`difference.ts`:** la vista previa mientras escribe: lo que debería haber (con cuánto abrió + lo cobrado − lo gastado) y la diferencia con lo contado.
  - Contó 110 y debería haber 110 → «La caja cuadra».
  - Contó 102 y debería haber 120 → «Faltan S/ 18.00», con la pista «Revisa si falta anotar un gasto o un vuelto».
  - Contó 125 y debería haber 120 → «Sobran S/ 5.00», con la pista «Revisa si falta anotar una venta».

## 6. Pantallas y estados

- **Cuadre de caja:**
  - «Abriste con», que se puede cambiar;
  - lo cobrado en efectivo, los gastos en efectivo y «Debería haber»;
  - «¿Cuánto hay en la caja?»;
  - el resultado en color;
  - Yape, Plin y transferencias, con «Compáralos con lo que muestran sus apps»;
  - «Cerrar el día», fijo abajo. Se activa cuando ya hay un conteo.
- **Día cerrado:** el resultado y «Volver a contar».
- **Sin internet:** puede contar, pero el cierre espera a que vuelva la señal.
- **Accesos:** «Cuadrar caja ›» en Inicio, y en Más «Cuadre de caja», con «Hoy» o «Cerrado».

## 7. Con otros módulos

**Usa:** ninguno. La base suma los pagos, los ingresos y los gastos.

**Expone:**
- `cashExpectedQuery` y `closeCashDay`.
- `CashSummary`.

## 8. Pruebas que deben pasar

**Base (pgTAP):**
- Lo que debería haber, con pagos y gastos de varios medios y días, solo toma el efectivo de ese día de Lima.
- Un pago anulado no cuenta.
- Volver a contar crea otro cierre, y manda el último.
- Otro negocio no ve los cierres.

**Cuentas (Jest):** `difference.ts`.

**Recorrido:** una venta en efectivo aparece en el cuadre, y se cierra el día con un faltante.

## 9. Fuera de esta versión

- Varias cajas o turnos.
- Cuadrar Yape y Plin contra sus extractos.
