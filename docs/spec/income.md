# Ingresos (`features/income`)

## 1. Qué resuelve

Lo que entra al negocio. Cuenta por fecha de pago (D11) y tiene dos partes:
- los pagos de los pedidos, que salen solos;
- los ingresos que se anotan a mano, como una venta a un café o un evento.

**Pantallas que cubre:**
- «Cobrado hoy» en Inicio.
- Los ingresos en Reportes.
- **Ingresos y Anotar ingreso. No están en la maqueta:** se arman con la misma forma que Gastos y Anotar gasto, y se abren desde la tarjeta «Ingresos» de Reportes; «Un ingreso» se anota con el + (fase 7c: antes era una fila de Más).

## 2. Datos

### `manual_incomes`

| Columna | Tipo | Regla |
|---|---|---|
| `description` | text | |
| `amount_cents` | int > 0 | |
| `method` | `payment_method` | El medio de pago |
| `received_at` | timestamptz | Ahora, por defecto |
| `voided_at`, `void_reason` | puede ir vacío | Anulado: no cuenta |

Los pagos de los pedidos están en `payments` (`orders.md`).

### Índices

| Tabla | Índice | Sirve para |
|---|---|---|
| `manual_incomes` | parcial `(business_id, received_at desc)`, si no está anulado | La lista y las sumas por fecha |

Los índices de `payments` están en `orders.md`.

## 3. Funciones de la base

- **`income_summary(from, to)`:** el total, por medio de pago y por día. Suma:
  - los pagos sin anular, por `paid_at`, menos las devoluciones en el día en que se devolvieron;
  - los ingresos a mano sin anular, por `received_at`.

  La usan Inicio, Reportes y el cuadre de caja.
- **`list_income(from, to, limit, cursor)`:** los pagos y los ingresos a mano juntos, del más nuevo al más viejo. La página usa un cursor sobre la fecha y el id.
- **`create_manual_income(request_id, description, amount_cents, method, received_on)` y `void_manual_income(id, reason)`:** el mismo `request_id` no crea dos ingresos, y las anulaciones quedan en el registro (`private.audit_log`). El día es hoy o ayer (sin selector de fecha); ayer se guarda a las 12:00 de Lima. Anular no tiene «Deshacer»: se confirma en una hoja.

## 4. Permisos

Los comunes: el dueño lee sus ingresos y escribe solo con las funciones.

## 5. Cuentas en el celular

No tiene cuentas propias: los montos se muestran con `lib/money`.

## 6. Pantallas y estados

- **Inicio:** «Cobrado hoy», con la barra por medio de pago y solo los medios que tienen monto.
- **Ingresos (Reportes › tarjeta Ingresos):**
  - el total del mes;
  - la lista: los pagos con su pedido y los ingresos a mano con su descripción;
  - «Anotar ingreso».
- **Anotar ingreso:** el monto, la descripción, el medio de pago y el día: «Hoy» o «Ayer».

## 7. Con otros módulos

**Usa:** `businesses`, para los medios de pago activos.

**Expone:**
- Consultas: `incomeSummaryQuery` y `incomeQuery`.
- Las mutaciones.

## 8. Pruebas que deben pasar

**Base (pgTAP):**
- El resumen suma los pagos sin anular, por fecha de pago, más los ingresos a mano sin anular.
- Una devolución resta en el día en que se devolvió, no en el día del pago: el ingreso de un día ya cerrado no cambia.
- Los días son los de Lima: un pago a las 23:30 de Lima cuenta en ese día, no en el siguiente, como pasaría en UTC.

**Rendimiento:** `income_summary` responde en menos de 50 ms con años de pagos.

## 9. Fuera de esta versión

- Ingresos que se repiten.
- Boletas y facturas (SUNAT, §4).
