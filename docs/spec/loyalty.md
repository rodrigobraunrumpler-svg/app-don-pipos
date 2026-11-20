# Fidelidad (`features/loyalty`)

## 1. Qué resuelve

Una tarjeta de sellos digital (D15):
- Cada pedido entregado suma un sello.
- Al llegar a la meta, el premio se aplica como descuento con el motivo «fidelidad».
- Queda apagada hasta que el dueño defina la meta y el premio.

**Pantallas de la maqueta que cubre:**
- Fidelidad, en Más.
- La tarjeta de sellos en la ficha del cliente.
- «Sofía tiene su premio listo → Aplicar», en el paso 2 del pedido.
- Los sellos en el mensaje de entregado.

## 2. Datos

### `loyalty_settings` (una fila por negocio)

| Columna | Tipo | Regla |
|---|---|---|
| `is_active` | bool | Apagada por defecto |
| `stamp_unit` | text | `order`: un sello por pedido entregado; `item`: un sello por alfajor entregado |
| `goal` | int | Los sellos para el premio: de 3 a 30 si es por pedido, de 5 a 100 si es por alfajor |
| `reward_kind` | text | `free_item` (un alfajor gratis, el de menor precio del pedido), `discount` (un monto fijo) u `other` (un texto) |
| `reward_amount_cents` | int > 0, puede ir vacío | Si es un descuento |
| `reward_text` | text, puede ir vacío | Si es otro premio |
| `version` | int | Para detectar dos ediciones a la vez |

### `loyalty_stamps` (movimientos)

| Columna | Tipo | Regla |
|---|---|---|
| `customer_id` | uuid | La llave lleva `business_id` |
| `order_id` | uuid, puede ir vacío | La llave lleva `business_id` |
| `delta` | int ≠ 0 | Al entregar suma 1, o los alfajores del pedido si es por alfajor; al canjear resta la meta; deshacer la entrega o anular el pedido donde se canjeó hace lo contrario |
| `reason` | text | `delivered`, `reverted`, `redeemed` o `redeem_returned` |

`customers.stamps` guarda la suma, actualizada en la misma operación que cada movimiento.

### Índices

| Tabla | Índice | Sirve para |
|---|---|---|
| `loyalty_stamps` | `(business_id, customer_id, created_at desc)` | La llave foránea y la tarjeta de un cliente |
| `loyalty_stamps` | parcial `(business_id, order_id)`, si tiene pedido | La llave foránea y el neto de sellos de un pedido |
| `customers` | parcial `(business_id, stamps desc)`, si tiene sellos | «Cerca del premio» |

## 3. Funciones de la base

- **`update_loyalty_settings(expected_version, …)`:** con otra versión responde `conflict`. Cada cambio queda en el registro (`private.audit_log`).
- **`private.sync_order_stamps(order_id)`** (decidido en la fase 7a, en vez de `add_stamp` y `remove_stamp`): con el pedido bloqueado, deja su neto de sellos de entrega en lo que debe ser. Si está entregado, tiene cliente y la fidelidad está activa: 1, o sus alfajores si es por alfajor. Si no está entregado: 0. Con la fidelidad apagada no suma, pero sí quita. La llaman `advance_order`, `revert_status`, `cancel_order`, `revert_cancel` y `edit_order`. Así entregar, deshacer, volver a entregar, anular o corregir un entregado deja los sellos justos.
- **El canje** ocurre dentro de `create_order`, cuando el borrador trae `redeemReward: true`: resta la meta y pone el descuento con el motivo «Fidelidad». El monto lo calcula la base (el alfajor más barato del pedido, el descuento sin pasar del total, u «otro premio» en 0). Con el premio, el borrador no trae otro descuento. Sin sellos suficientes o con la fidelidad apagada: `invalid`.
  - Deshacer la anulación de un pedido canjeado vuelve a canjear; si el cliente ya no tiene esos sellos, `conflict`.
  - Si después se anula ese pedido, los sellos canjeados vuelven (`redeem_returned`).
  - Si se anula un pedido ya entregado, se quitan los sellos que había sumado (`private.remove_stamp`).
  - Editar el pedido no quita el premio; para quitarlo, se anula y se anota de nuevo.
- **`get_loyalty_settings()`** y **`loyalty_overview(limit)`:** los clientes más cerca del premio (la meta − 2 sellos o más).
- **La fila de un negocio nuevo** guarda, apagada, la regla de ejemplo de la pregunta de `PROJECT_CONTEXT.md` §7 (10 compras, 1 alfajor gratis). No es una regla del negocio: no se usa hasta que el dueño la revise y la encienda.

## 4. Permisos

Los comunes: el dueño lee y cambia todo solo con las funciones.

## 5. Cuentas en el celular (`rules/`)

- **`reward.ts`:** si el premio está listo (la fidelidad activa y los sellos en la meta o más), y cuánto vale, para la vista previa.
  - `free_item`: el menor precio del pedido. 2 Coquetas (S/ 12.00) + 1 Pipo Crush (S/ 13.00) → S/ 12.00.
  - `discount`: su monto, sin pasar del total.
  - `other`: 0, porque se entrega aparte.
- **`card.ts`:** el texto de la tarjeta: «Le faltan 3 compras para su premio», «Le faltan 4 alfajores para su premio» o «Premio listo».

## 6. Pantallas y estados

- **Fidelidad:**
  - el interruptor «Fidelidad activa»;
  - «Cada compra suma un sello»;
  - la meta, con + y −;
  - el premio, en chips;
  - «Así la ve el cliente», como vista previa;
  - «Cerca del premio».
  - Apagada: explica cómo funciona y pide definirla, con la pregunta lista para el cliente (§7 de `PROJECT_CONTEXT.md`).
- **Ficha del cliente:** su tarjeta de sellos.
- **Nuevo pedido, paso 2:** «Sofía tiene su premio listo», con «Aplicar».

## 7. Con otros módulos

**Usa:** ninguno. Los nombres de los clientes llegan desde `loyalty_overview`.

**Expone:**
- `loyaltySettingsQuery` y `loyaltyOverviewQuery`, con sus mutaciones.
- `StampsCard`.
- `rewardAmount` y `isRewardReady`, que usa el paso 2 del pedido.

## 8. Pruebas que deben pasar

**Base (pgTAP):**
- Cada pedido entregado suma sus sellos una sola vez, aunque se repita la llamada o se entregue, se deshaga y se vuelva a entregar.
- Por alfajor, un pedido de 3 alfajores suma 3.
- Anular el pedido donde se canjeó devuelve los sellos, y anular un pedido entregado quita los que sumó.
- Deshacer la entrega quita el sello.
- Canjear resta la meta y pone el descuento con el motivo «fidelidad».
- Con la fidelidad apagada no se suman sellos.
- `customers.stamps` siempre es igual a la suma de los movimientos.

**Cuentas (Jest):** `reward.ts` y `card.ts`.

## 9. Fuera de esta versión

- Niveles.
- Sellos que vencen.
- Una tarjeta para compartir.
