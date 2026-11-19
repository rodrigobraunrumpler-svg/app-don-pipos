# Glosario

Un nombre por concepto (regla 15 de `PROJECT_CONTEXT.md`). En pantalla, en español; en el código y en la base, en inglés.
Un concepto nuevo se agrega aquí antes de usarlo en el código.

- **En el código:** TypeScript en camelCase. Los tipos van en PascalCase (`Order`).
- **En la base:** snake_case. Las tablas van en plural.
- **Los montos** siempre en céntimos enteros, con el sufijo `Cents` (`totalCents`, `total_cents`).

## Negocio y acceso

| En pantalla | En el código | En la base | Nota |
|---|---|---|---|
| Negocio | `business` | `businesses` | Don Pipos ahora, VarMar después |
| Dueño | `owner` | `businesses.owner_id` | El único usuario (D4) |
| PIN | `pin` | `pin_credentials` | Hash, intentos y bloqueo; lo revisa `sign-in-with-pin` (D18) |
| Huella | `biometrics` | — | Solo en el celular |
| Entrar (huella o PIN) | `unlock` | — | Las veces siguientes, sin internet |
| Pedir huella o PIN | `autoLock` | — | Minutos en segundo plano |
| Puesta en marcha | `setup` | `businesses.setup_done_at` | Productos, stock de hoy y tipos de gasto |
| Ajustes | `settings` | `business_settings` | Medios de pago, delivery, días de producción |
| Módulos del negocio | `modules` | `businesses.modules` | Lo que usa cada negocio: `orders`, `stock`… |
| Falta la puesta en marcha | `setupDone` | `businesses.setup_done_at` | `false` mientras la fecha esté vacía |
| Medios de pago activos | `activePaymentMethods` | `active_payment_methods` | Los apagados no aparecen al anotar pedidos y gastos |
| Zona de reparto | `deliveryZone` | `delivery_zone` | Pendiente con el cliente |
| «No vuelve» a los… días | `lapsedAfterDays` | `lapsed_after_days` | 30 por defecto |
| Recordatorios activos | `reminders` | `business_settings.reminders` | `scheduled`, `stock` y `balances` |
| Versión esperada | `expectedVersion` | `p_expected_version` | La versión que la app tenía al abrir el formulario |

## Productos y stock

| En pantalla | En el código | En la base | Nota |
|---|---|---|---|
| Producto, alfajor | `product` | `products` | |
| Precio | `priceCents` | `price_cents` | Se copia a la web (D13) |
| Costo | `costCents` | `cost_cents` | Opcional, para la ganancia por alfajor |
| Agotado en la web | `isAvailable` | — | Sale del stock: se copia a Sanity como `isAvailable` |
| Se ve en la web, Oculto | `showOnWeb` | `show_on_web` | Se copia a Sanity como `isVisible` |
| Pendiente de copiar a la web | `webSyncOutbox` | `web_sync_outbox` | Se envía con reintentos (`products.md`) |
| Stock libre | `onHand` | `stock_levels.on_hand` | Lo que se puede vender: la suma de los movimientos, guardada en la misma operación que cada uno |
| Apartado | `reserved` | — | Los alfajores de pedidos sin entregar ni anular |
| En la nevera | `physical` | — | Libre + apartado: lo que se cuenta al contar el stock |
| Faltan para pedidos | `owed` | estado `owed` | Lo libre es negativo por pedidos comprometidos: hay que producir |
| Movimiento de stock | `stockMovement` | `stock_movements` | Con `kind` (los cinco de abajo) |
| Producción | `production` | `kind = 'production'` | Suma |
| Venta | `sale` | `kind = 'sale'` | Resta al registrar el pedido |
| Devolución por anulación | `cancellation` | `kind = 'cancellation'` | Suma al anular |
| Merma | `waste` | `kind = 'waste'` | Resta, con motivo |
| Ajuste, conteo | `adjustment`, `stockCount` | `kind = 'adjustment'` | El conteo guarda la diferencia como ajuste |
| Stock mínimo | `minStock` | `min_stock` | |
| Sugerencia de producción | `productionSuggestion` | función `production_suggestion` | D16 |
| Produces cada… días | `productionIntervalDays` | `production_interval_days` | En los ajustes |

## Pedidos

| En pantalla | En el código | En la base | Nota |
|---|---|---|---|
| Pedido | `order` | `orders` | |
| Número de pedido (#0042) | `orderNumber` | `orders.number` | Correlativo por negocio; lo asigna la base con `business_counters` |
| Lo pagado | `paidCents` | `orders.paid_cents` | Lo mantiene la base con cada pago |
| Lo que lleva (una línea) | `orderLine` | `order_lines` | |
| Precio congelado | `unitPriceCents` | `order_lines.unit_price_cents` | D9; también `unit_cost_cents` |
| Canal | `channel` | `channel` | `whatsapp`, `local`, `web` |
| Entrega | `fulfillment` | `fulfillment` | `delivery`, `pickup` (recoge en el local), `counter` (mostrador) |
| Estado | `status` | `status` | Los seis de abajo |
| Nuevo | `new` | `'new'` | |
| Preparando | `preparing` | `'preparing'` | |
| En camino | `onTheWay` | `'on_the_way'` | Solo delivery |
| Listo para recoger | `ready` | `'ready'` | Solo recoge en el local |
| Entregado | `delivered` | `'delivered'` | |
| Anulado | `cancelled` | `'cancelled'` | Con motivo; el stock vuelve |
| Línea de tiempo | `statusEvents` | `order_status_events` | Cada cambio de estado con su hora |
| Hora acordada | `promisedAt` | `promised_at` | Para saber si va tarde |
| Pedido para otro día, Próximos | `scheduledFor` | `scheduled_for` | |
| Día del pedido | `dueDate` | `due_date` | `scheduled_for`, o el día de Lima en que se anotó; ordena «Hoy», «Por entregar» y «Próximos» |
| Atrasado | `overdue` | — | Su día ya pasó y no se entregó |
| Demorado, «10 min tarde» | `lateness` | — | Se calcula en el celular con la hora acordada |
| Venta de mostrador | `counterSale` | función `create_counter_sale` | Pedido entregado y pagado, sin cliente |
| Cliente de mostrador | `walkIn` | `customer_id is null` | |
| Descuento | `discountCents`, `discountReason` | `discount_cents`, `discount_reason` | |
| Costo del delivery | `deliveryFeeCents` | `delivery_fee_cents` | |
| Motivo de anulación | `cancelReason` | `cancel_reason` | |

## Pagos e ingresos

| En pantalla | En el código | En la base | Nota |
|---|---|---|---|
| Pago | `payment` | `payments` | D10: monto, medio y fecha |
| Medio de pago | `paymentMethod` | `method` | `cash` (efectivo), `yape`, `plin`, `transfer` (transferencia) |
| Adelanto | — | — | Un pago hecho antes de entregar; no es otra cosa |
| Cambiar medio de pago | `changePaymentMethod` | función `change_payment_method` | Anula el pago y crea uno igual con el medio correcto |
| Devolución | `refund` | `payments.kind = 'refund'` | La plata que se devuelve: resta en su día y en su caja; no se borra el pago original |
| Falta cobrar | `amountDueCents` | — | Total menos pagos; lo calcula la base |
| Por cobrar | `receivables` | función `list_receivables` | |
| Ingreso | `income` | — | Pagos recibidos más ingresos anotados a mano, por fecha de pago (D11) |
| Ingreso anotado a mano | `manualIncome` | `manual_incomes` | Una venta a un café, un evento |

## Gastos y caja

| En pantalla | En el código | En la base | Nota |
|---|---|---|---|
| Gasto | `expense` | `expenses` | |
| Tipo de gasto | `expenseCategory` | `expense_categories` | |
| Foto de la boleta | `receiptPhoto` | `receipt_path` | Supabase Storage, privado |
| Corregir un gasto | `correctExpense` | `replaces_id` | El viejo queda anulado y el nuevo lo apunta |
| Cuadre de caja | `cashCount` | `cash_counts` | |
| Abriste con | `openingCents` | `opening_cents` | |
| Debería haber | `expectedCents` | — | Con cuánto abrió + cobrado en efectivo − gastos en efectivo |
| Hay en la caja (contado) | `countedCents` | `counted_cents` | |
| Diferencia: cuadra, sobra, falta | `differenceCents` | — | Contado menos lo que debería haber |
| Cerrar el día | `closeDay` | `cash_counts.closed_at` | |

## Clientes, fidelidad y mensajes

| En pantalla | En el código | En la base | Nota |
|---|---|---|---|
| Cliente | `customer` | `customers` | Uno por teléfono en cada negocio (D14) |
| Ficha del cliente | `customerProfile` | — | |
| No vuelven | `lapsedCustomers` | — | Más de 30 días sin pedir (se cambia en Ajustes) |
| Acepta promociones | `acceptsPromotions` | `accepts_promotions` | Sin permiso, no se le escriben promociones |
| Borrar sus datos | `anonymizeCustomer` | `anonymized_at` | Ley 29733; los pedidos quedan como «Cliente eliminado» |
| Fidelidad | `loyalty` | `loyalty_settings` | Apagada hasta que el dueño la defina (D15) |
| Sello | `stamp` | `loyalty_stamps` | Movimientos: +1 por pedido entregado, −meta al canjear |
| Meta, premio | `goal`, `reward` | `goal`, `reward` | |
| Sello por pedido o por alfajor | `stampUnit` | `stamp_unit` | `order` o `item`; lo elige el dueño |
| Canjear | `redeem` | — | Se aplica como descuento con motivo «fidelidad» |
| Mensaje de WhatsApp | `messageTemplate` | `message_templates` | Confirmación, en camino, listo, entregado, recordatorio de saldo, «te extrañamos» |
| Recordatorio | `reminder` | — | Aviso del celular |

## Reportes y web

| En pantalla | En el código | En la base | Nota |
|---|---|---|---|
| Reportes | `report` | funciones `report_*` | Calculados en la base (§14.3) |
| Ventas | `sales` | — | Pedidos entregados, por fecha de entrega (D11) |
| Ganancia | `profit` | — | Ingresos menos gastos |
| Más vendidos | `ranking` | función `report_ranking` | En unidades y en soles |
| Periodo | `period` | — | `week`, `month`, `custom` |
| Copia a la web | `webSync` | función `sync-to-web` | Precio y «Agotado» a Sanity (D13) |

## Generales

| En pantalla | En el código | En la base | Nota |
|---|---|---|---|
| Fecha del negocio | `businessDate` | — | El día en `America/Lima` |
| Copia de seguridad | `backup` | `private.backup_runs` | La anota el VPS; el dueño ve la última en Más |
| Página de una lista | `Page<T>` | — | `{ items, meta: { limit, total, hasMore, nextCursor } }` (§14.3) |
| Error | `AppError` | — | Tipos: `offline`, `notFound`, `forbidden`, `invalid`, `conflict` y `unexpected` (cualquier otra cosa) |
| Código de la operación | `requestId` | `request_id`, en `private.idempotency_keys` | Evita que un reintento duplique un pedido, un pago o un gasto |
| Versión de una fila | `version` | `version` | Detecta dos ediciones a la vez (`conflict`) |
| Registro de cambios | `auditLog` | `private.audit_log` | Precios, ajustes y anulaciones, con lo de antes y lo de después |
| Lo interno | — | esquema `private` | Tablas y funciones que la API no expone |
| Datos del momento | `productName`, `customerName`, `itemsSummary` | `order_lines.product_name`, `orders.customer_name`, `orders.items_summary` | Cómo era cada cosa al momento del pedido, como el precio |
