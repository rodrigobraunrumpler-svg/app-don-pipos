# Pedidos (`features/orders`)

## 1. Qué resuelve

- Anotar un pedido en segundos.
- Seguirlo por estado hasta entregarlo.
- Cobrarlo en uno o varios pagos.
- Vender en el mostrador sin cliente.
- Avisar cuando un pedido va tarde.

**Pantallas de la maqueta que cubre:**
- Nuevo pedido (pasos 1 y 2), Pedido guardado, Venta de mostrador.
- Lista de pedidos, Un pedido, Por cobrar.
- Las filas de pedidos en Inicio.

## 2. Datos

### `orders`

| Columna | Tipo | Regla |
|---|---|---|
| `number` | int | Correlativo por negocio, sin huecos; único con `business_id`. Lo asigna la base |
| `customer_id` | uuid, puede ir vacío | Vacío = cliente de mostrador. Delivery y recoge llevan cliente: el mensaje de confirmación necesita a quién escribirle (D14) |
| `channel` | text | `whatsapp`, `local` o `web` |
| `fulfillment` | text | `delivery`, `pickup` o `counter` |
| `status` | text | `new`, `preparing`, `on_the_way`, `ready`, `delivered` o `cancelled` |
| `promised_at` | timestamptz, puede ir vacío | Hora acordada (recoge o entrega) |
| `scheduled_for` | date, puede ir vacío | Pedido para otro día, si el dueño eligió otra fecha |
| `due_date` | date | El día del pedido: `scheduled_for` o, si está vacío, el día de Lima en que se anotó. Lo pone `create_order` y lo usan «Hoy», «Por entregar», «Próximos» y lo atrasado |
| `delivery_address` | text, puede ir vacío | Obligatorio si es delivery |
| `delivery_fee_cents` | int ≥ 0 | Copia del costo del delivery al crear el pedido |
| `discount_cents` | int ≥ 0 | Si es mayor que cero, `discount_reason` es obligatorio |
| `discount_reason` | text, puede ir vacío | «fidelidad», «precio especial»… |
| `subtotal_cents`, `total_cents` | int ≥ 0 | Los calcula la base: total = subtotal + delivery − descuento |
| `paid_cents` | int ≥ 0 | Pagos menos devoluciones, sin anular. La base lo actualiza en cada movimiento; falta cobrar = total − pagado |
| `delivered_at` | timestamptz, puede ir vacío | Para las ventas por fecha de entrega (D11) |
| `cancel_reason` | text, puede ir vacío | Obligatorio si está anulado |
| `note` | text, puede ir vacío | |
| `customer_name` | text, puede ir vacío | El nombre del cliente al momento del pedido. «Cliente eliminado» si se borran sus datos |
| `items_summary` | text | «2 Coquetas, 1 Pipo Crush», armado al crear o editar |
| `items_count` | int > 0 | Cuántos alfajores lleva |
| `version` | int | Sube con cada cambio; para detectar dos ediciones a la vez |

**Reglas de la tabla** (`CHECK`):
- `total_cents = subtotal_cents + delivery_fee_cents − discount_cents`, y nunca negativo.
- `paid_cents ≤ total_cents`.
- `on_the_way` solo existe en delivery, y `ready` solo en recoge en el local.
- La venta de mostrador nace `delivered`.
- Si es delivery, `delivery_address` no está vacío; si hay descuento, `discount_reason` tampoco; si está anulado, `cancel_reason` tampoco.

**Espacio libre:** `fillfactor` 85, porque los pedidos cambian de estado varias veces al día (README, «Rendimiento de la base»).

### `order_lines`

| Columna | Tipo | Regla |
|---|---|---|
| `order_id`, `product_id` | uuid | Un producto una sola vez por pedido. Las llaves llevan `business_id` |
| `product_name` | text | El nombre del alfajor al momento del pedido, como el precio |
| `quantity` | int > 0 | |
| `unit_price_cents` | int > 0 | Precio congelado (D9) |
| `unit_cost_cents` | int, puede ir vacío | Costo congelado, para la ganancia por alfajor |

### `order_status_events`

Una fila por cambio de estado: `order_id`, `status`, `at` y `reverted_at`. Es la línea de tiempo del pedido. El «Deshacer» de un estado no borra la fila: la marca deshecha (`reverted_at`) y la línea de tiempo la oculta.

### `payments`

| Columna | Tipo | Regla |
|---|---|---|
| `order_id` | uuid | La llave lleva `business_id` |
| `kind` | text | `payment` (pago) o `refund` (devolución) |
| `method` | `payment_method` | `cash`, `yape`, `plin` o `transfer` |
| `amount_cents` | int > 0 | Siempre positivo; la devolución resta por su `kind` |
| `paid_at` | timestamptz | Ahora, por defecto. En una devolución, el día en que se devolvió |
| `voided_at`, `void_reason` | puede ir vacío | Solo para un error al anotar; devolver plata es una devolución, no una anulación |

**Por qué la devolución es otra fila** (decidido al revisar la especificación): así el ingreso del día en que se cobró no cambia, un día con la caja ya cerrada sigue cuadrando, y la devolución resta en el día y la caja en que salió la plata.

### Índices

| Tabla | Índice | Sirve para |
|---|---|---|
| `orders` | único `(business_id, number)`, que además guarda (`INCLUDE`) `status`, `fulfillment`, `total_cents`, `paid_cents`, `customer_name`, `items_summary` y `promised_at` | El número correlativo, buscar «#0042» y «Todos» por páginas. Cada página sale solo del índice |
| `orders` | `(business_id, due_date)` | «Hoy» y «Próximos» |
| `orders` | parcial `(business_id, due_date, number desc)`, si no está entregado ni anulado | «Por entregar», lo atrasado, lo que va tarde, lo apartado del stock y lo que está en curso en Inicio |
| `orders` | parcial `(business_id, number desc)`, si `paid_cents < total_cents` y no está anulado | «Por cobrar» |
| `orders` | parcial `(business_id, delivered_at)`, si está entregado | Ventas y ranking por fecha de entrega (D11) |
| `orders` | parcial `(business_id, customer_id, created_at desc)`, si tiene cliente | La llave foránea, el historial del cliente, su último pedido y «no vuelven» |
| `order_lines` | único `(order_id, product_id)` | Las líneas de un pedido |
| `order_lines` | `(business_id, product_id)` | La llave foránea y el ranking por producto |
| `order_status_events` | `(order_id, at)` | La línea de tiempo |
| `payments` | `(order_id)` | Los pagos de un pedido |
| `payments` | parcial `(business_id, paid_at)`, si no está anulado | Los ingresos por fecha de pago (D11) y el efectivo del día en el cuadre |

## 3. Funciones de la base

Todas comprueban que el negocio sea del usuario y devuelven el pedido con sus totales y lo que falta cobrar.

- **`create_order(request_id, draft)`:** crea el pedido entero en un solo paso. Si ese `request_id` ya llegó, devuelve el pedido que creó (README, idempotencia).
  - Le asigna su número desde el contador del negocio (`business_counters`, en businesses). El contador se bloquea dentro de la misma operación, así no quedan huecos aunque se creen dos pedidos a la vez.
  - Congela precios, costos y el nombre de cada alfajor, y guarda el nombre del cliente, el resumen y la cantidad.
  - Resta el stock: un movimiento `sale` por línea, con su `order_id` y sin `request_id` (así «Deshacer» del stock nunca lo toca).
  - Registra el pago que venga: uno solo al anotar (todo, una parte o nada), como la maqueta; después, los que hagan falta con `add_payment`.
  - Anota el estado inicial.
  - Si no hay stock, avisa pero no bloquea (D12).
- **`create_counter_sale(request_id, items, method)`:** la venta de mostrador. Es como `create_order`, pero sin cliente, `counter`, entregada y con un pago por el total.
- **`advance_order(order_id, from_status)`:** pasa al siguiente estado según la entrega.
  - Si el estado ya no es `from_status` (por un doble toque o una pantalla vieja), responde `conflict`.
  - Al entregar, anota `delivered_at` y, si la fidelidad está activa y hay cliente, suma un sello (loyalty).
- **`revert_status(order_id, expected_status)`:** el «Deshacer» del cambio de estado.
  - Solo vuelve atrás si ese es el último cambio y si pasaron menos de 10 minutos.
  - Si se había sumado un sello, lo quita.
- **El «Deshacer» de anular y de editar** (decidido al revisar la especificación; la maqueta los ofrece):
  - `revert_cancel(order_id)`: vuelve al estado anterior, vuelve a restar el stock y anula la devolución que se había creado;
  - `revert_edit(order_id, version)`: vuelve a las líneas de antes, guardadas en el registro de cambios;
  - los dos valen solo para el último cambio y dentro de los 10 minutos, igual que `revert_status`. En pantalla, «Deshacer» se ve los 5 segundos del aviso.
- **El «Deshacer» de la venta de mostrador** es anularla con devolución completa. El número queda usado y la venta se ve anulada: así no quedan huecos y nada se borra. En la maqueta, deshacer devolvía el número; en la app no.
- **`edit_order(request_id, order_id, expected_version, lines, refund_cents, refund_method)`:** solo antes de entregar; con otra versión responde `conflict`. Vuelve a armar el resumen y la cantidad.
  - Si el total nuevo queda por debajo de lo pagado, la hoja pide registrar la devolución de la diferencia en la misma llamada. Sin ella, responde `invalid`. No hay saldo a favor en esta versión.
  - Las líneas que ya estaban mantienen su precio; las nuevas toman el precio de hoy.
  - El stock se ajusta con la diferencia.
- **`cancel_order(request_id, order_id, reason, refund_cents, refund_method)`:** anula el pedido y devuelve el stock (movimientos `cancellation`).
  - **Se puede anular en cualquier estado, también ya entregado o una venta de mostrador** (decidido por el dueño, 2026-11-18). Sirve para corregir lo que se anotó mal: se anula y se vuelve a anotar bien.
  - Si estaba entregado, deja de contar en las ventas y en el ranking (D11), se actualizan los totales del cliente y se quitan sus sellos (`private.remove_stamp`).
  - Si tenía pagos, la hoja pregunta «¿Devolviste el dinero?» y cuánto, con todo lo pagado por defecto. Se puede devolver una parte, por ejemplo cuando el adelanto no se devuelve.
  - Lo devuelto queda como una devolución con su medio y la fecha de hoy. Lo que no se devuelve sigue contando como ingreso.
- **`change_payment_method(request_id, payment_id, method)`:** corrige el medio de un pago o de una devolución, por ejemplo de efectivo a Yape (decidido por el dueño, 2026-11-18).
  - Anula el movimiento con el motivo «cambio de medio de pago» y crea otro igual, con el mismo monto y la misma fecha, pero con el medio correcto.
  - Así los totales por medio de ese día y el cuadre de caja se corrigen solos.
  - Queda en el registro de cambios. Cambiar el monto de un pago no entra en esta versión (§9).
- **`add_payment(request_id, order_id, method, amount_cents)`:** el monto no puede pasar de lo que falta cobrar (`invalid`).
- **`list_orders(filter, search, limit, cursor)`:** la lista por páginas.
  - Filtros, todos por `due_date` en el día de Lima:
    - `today`: los de hoy, más los de días anteriores que siguen sin entregar (atrasados);
    - `to_deliver`: sin entregar ni anular, de hoy o atrasados. Es el mismo número que muestra Inicio;
    - `upcoming`: de días que vienen, sin anular;
    - `to_collect` y `all`.
  - Busca por nombre del cliente o por número, sin importar mayúsculas. Sin tildes, cuando se active `unaccent` (fase 7, con la búsqueda de clientes).
  - Ordena del número mayor al menor.
  - Devuelve `{ items, meta }` (§14.3).
- **`order_counts()`:** cuántos pedidos hay en cada filtro, para los chips.
- **`get_order(order_id)`:** el pedido con sus líneas, pagos, línea de tiempo y los datos básicos del cliente.
- **`list_receivables(limit, cursor)`:** los pedidos con saldo, sin los anulados. Cada uno dice si ya corresponde recordarle el saldo: está entregado o es un adelanto con fecha.

**Decidido al planear la fase 4b (2026-11-19):**
- Nuevo pedido son tres pantallas (qué lleva, entrega y pago, guardado); guardado reemplaza el recorrido, así «Volver» lleva a donde se empezó.
- Editar por debajo de lo pagado devuelve exactamente la diferencia; si el total no baja de lo pagado, no se manda devolución (`invalid`).
- «Recordar» aparece si el pedido está entregado o tiene un adelanto (la nota de la maqueta).
- Por cobrar ordena del número mayor al menor (su índice), y se entra desde el filtro «Por cobrar» de Pedidos hasta que llegue Inicio (fase 6).
- Los sellos (`remove_stamp`) llegan con la fidelidad (fase 7): anular todavía no toca sellos.

## 4. Permisos

- El dueño lee los pedidos, líneas, eventos y pagos de su negocio.
- Nadie inserta ni cambia esas tablas directo: solo con las funciones de §3.
- No hay forma de borrar.

## 5. Cuentas en el celular (`rules/`)

Solo para la vista previa y para mostrar. Lo guardado lo calcula la base.

- **`totals.ts`:** el total del borrador mientras se arma.
  - 2 Coquetas (S/ 12.00) + 1 Pipo Crush (S/ 13.00) + delivery S/ 5.00 → **S/ 42.00**.
  - El mismo pedido con un descuento de S/ 10.00 por fidelidad → **S/ 32.00**.
  - El total nunca es negativo.
- **`status.ts`:**
  - El siguiente estado:
    - delivery: nuevo → preparando → en camino → entregado;
    - recoge: nuevo → preparando → listo para recoger → entregado;
    - el mostrador nace entregado.
  - Si se puede editar: antes de entregar y sin anular.
  - Si se puede anular: en cualquier estado menos anulado, también entregado.
- **`lateness.ts`:** si va tarde y cuánto. «Hecho» es listo o entregado si recoge, y entregado si es delivery.
  - **Atrasado:** su `due_date` ya pasó y no está hecho → «Atrasado desde ayer» o «desde el lunes».
  - **Tarde:** es de hoy, tiene hora acordada, la hora ya pasó y no está hecho → los minutos.
  - Recoge a las 11:30, son las 11:40, preparando → **10 min tarde**.
  - El mismo pedido, ya listo → no va tarde.
  - Delivery a las 13:00, son las 13:05, en camino → **5 min tarde**.
  - De ayer y sin entregar → **atrasado desde ayer**.
  - Para otro día, o de hoy sin hora acordada → no va tarde.
- **`payment.ts`:** el texto de cobro de la fila, a partir de lo que falta, que manda la base.
  - Anulado → «Anulado».
  - No falta nada → «Pagado».
  - Hay pagos y falta → «Falta S/ X».
  - No hay pagos → «Cobrar S/ X».

## 6. Pantallas y estados

- **Pedidos (lista):**
  - Búsqueda por cliente o número.
  - Filtros con su cantidad (`order_counts`).
  - En «Hoy», dos grupos: «En curso» arriba y «Terminados» abajo, más apagados.
  - Cada fila dice:
    - el número y el tipo de entrega;
    - el cliente, con «X min tarde» si va tarde;
    - qué pidió;
    - el estado, el total y el cobro.
  - «Todos» llega de 20 en 20: «Mostrando X de N», carga sola al llegar al final, tiene el botón «Cargar 20 más» y termina con «No hay más pedidos».
  - Vistas: cargando (skeleton), actualizando, sin datos, error y sin internet.
- **Nuevo pedido, paso 1:**
  - Los alfajores con + y −, con su stock: avisa sin bloquear.
  - «Repetir el último pedido» del cliente.
  - Un borrador que no se pierde.
- **Paso 2:**
  - El cliente por su teléfono (customers).
  - La entrega (recoge, delivery o mostrador), con su hora y su dirección.
  - Hoy u otro día.
  - Descuento con motivo, incluido el premio de fidelidad.
  - Pago ahora (todo, una parte o nada) y su medio.
  - El resumen.
  - «Guardar» espera con «Guardando…».
- **Pedido guardado:** el número, el resumen y el mensaje de confirmación (messages), con «Avisar por WhatsApp» y «Anotar otro pedido».
- **Un pedido:**
  - La línea de tiempo.
  - La acción principal fija abajo: el siguiente estado o, ya entregado, «Registrar pago de S/ X».
  - El aviso de WhatsApp del estado, como botón secundario.
  - Las líneas con sus precios congelados, los pagos y el cliente con su mapa.
  - Editar (antes de entregar) y anular (en cualquier estado, también entregado), en hojas.
  - En cada pago, «Cambiar medio de pago», con los medios en chips.
  - «Deshacer» del cambio de estado.
  - Si no se pudo guardar, vuelve atrás y lo dice.
- **Por cobrar:** cuánto le deben en total y la lista. «Recordar» aparece solo cuando corresponde.
- **Venta de mostrador:**
  - Los alfajores con + y −.
  - El total.
  - Cobrar con efectivo primero, luego Yape, Plin y transferencia.
  - «Deshacer».
- **En Inicio:** las filas de «Por entregar» y «Próximos». Los demorados entran en lo urgente; esa unión la hace la pantalla de Inicio.

## 7. Con otros módulos

**Usa, siempre por su `index.ts`:**
- `products`: precios y stock para los avisos.
- `customers`: buscar o crear por teléfono.
- `messages`: las plantillas.
- `loyalty`: si hay un premio listo.
- `businesses`: el costo del delivery y los medios de pago activos.

Los movimientos de stock y los sellos los crea la base dentro de las funciones de §3, no el celular.

**Expone:**
- Componentes: `OrderRow`, `StatusChip` y las piezas de las pantallas de §6.
- Consultas: `ordersQuery(filter)`, `orderQuery(id)`, `orderCountsQuery()` y `receivablesQuery()`.
- Las mutaciones.
- Los tipos `Order`, `OrderLine`, `Payment` y `OrderStatus`.
- `lateness`, para lo urgente de Inicio.

## 8. Pruebas que deben pasar

**Base (pgTAP):**
- Los números salen correlativos, sin huecos ni repetidos, aunque se creen dos pedidos a la vez.
- Los precios y costos quedan congelados: cambiar el precio del producto después no cambia el pedido.
- El stock baja al crear, vuelve al anular y se ajusta al editar. Vender sin stock lo deja en negativo, sin bloquear.
- `advance_order` sigue el flujo de cada entrega y responde `conflict` con un estado viejo.
- `revert_status` solo deshace el último cambio y quita el sello si lo había.
- `add_payment` rechaza montos de cero o menos, y los que pasan de lo que falta.
- Anular con devolución crea la devolución con la fecha de hoy y deja los pagos originales; se puede devolver una parte.
- Editar por debajo de lo pagado sin registrar la devolución responde `invalid`.
- Anular un pedido entregado devuelve el stock, lo saca de las ventas y del ranking, actualiza los totales del cliente y quita sus sellos.
- `change_payment_method` deja el pago viejo anulado y uno nuevo con el mismo monto y la misma fecha. Los totales por medio de ese día cambian y el total del pedido no.
- `due_date`: un pedido anotado hoy para el jueves sale en «Próximos», no en «Hoy». El jueves pasa a «Hoy» y a «Por entregar». Si nadie lo entrega, el viernes sale como atrasado.
- «Por entregar» de Inicio y el filtro `to_deliver` dan el mismo número.
- `list_orders`:
  - páginas de 20, con `total` y `hasMore` correctos;
  - `limit` de 50 como máximo;
  - el cursor no repite ni salta pedidos aunque entren nuevos.
- Otro usuario no ve ni cambia nada, y nadie puede insertar directo en las tablas.
- `subtotal_cents`, `total_cents` y `paid_cents` siempre coinciden con sus líneas y sus pagos sin anular.
- El mismo `request_id` dos veces crea un solo pedido o un solo pago, y la segunda llamada devuelve lo mismo.
- Una línea que apunta al producto de otro negocio se rechaza (llave foránea con `business_id`).
- Renombrar un alfajor no cambia el nombre en los pedidos viejos.
- `edit_order` con una versión vieja responde `conflict`.

**Rendimiento** (con los datos de prueba grandes, ver `README.md`): `list_orders`, `order_counts`, `get_order` y `list_receivables` usan sus índices (sin `Seq Scan` en `orders` ni `payments`) y responden en menos de 50 ms.

**Cuentas (Jest):** los ejemplos de §5, con 100 % de cobertura.

**Pantallas (Testing Library):**
- La fila muestra qué, cuánto, estado, cobro y demora.
- «Hoy» agrupa en curso y terminados.
- La acción fija cambia según el estado.
- «Guardando…» bloquea el botón.

**Recorridos (Playwright):**
- Un delivery desde anotarlo hasta entregarlo y cobrarlo.
- Una venta de mostrador y su «Deshacer»: queda anulada con su devolución, y el número no se repite.
- Un pedido demorado que deja de estarlo al marcarlo listo.

## 9. Fuera de esta versión

- Los pedidos que llegan de la web (fase 2).
- Cambiar el monto de un pago ya registrado. Si falta, se registra otro pago; si sobra, lo corrige el equipo con una función.
- Trabajar del todo sin internet (§4 de `PROJECT_CONTEXT.md`).
