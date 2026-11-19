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
- **Internas,** las llaman `advance_order` y `revert_status`:
  - `private.add_stamp(order_id)`: con el pedido bloqueado (`for update`), suma sus sellos si la fidelidad está activa, el pedido tiene cliente y su neto de sellos por entrega es 0. Así entregar, deshacer y volver a entregar deja los sellos una sola vez;
  - `private.remove_stamp(order_id)`: lo quita.
- **El canje** ocurre dentro de `create_order`, cuando el borrador trae el premio: resta la meta y pone el descuento con el motivo «fidelidad».
  - Si después se anula ese pedido, los sellos canjeados vuelven (`redeem_returned`).
  - Si se anula un pedido ya entregado, se quitan los sellos que había sumado (`private.remove_stamp`).
  - Editar el pedido no quita el premio; para quitarlo, se anula y se anota de nuevo.
- **`loyalty_overview(limit)`:** los clientes más cerca del premio.

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
