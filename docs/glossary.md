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
| Puesta en marcha | `setup` | `businesses.setup_done_at`, función `complete_setup` | Los tres pasos de la primera vez: productos, stock de hoy y tipos de gasto |
| Ajustes | `settings` | `business_settings` | Medios de pago, delivery, días de producción |
| Módulos del negocio | `modules` | `businesses.modules` | Lo que usa cada negocio: `orders`, `stock`… |
| Falta la puesta en marcha | `setupDone` | `businesses.setup_done_at` | `false` mientras la fecha esté vacía |
| Consejo de la primera vez | `firstTip` | — | «Anota tu primer pedido»: sale una vez en Inicio, después de la puesta en marcha |
| Medios de pago activos | `activePaymentMethods` | `active_payment_methods` | Los apagados no aparecen al anotar pedidos y gastos |
| Zona de reparto | `deliveryZone` | `delivery_zone` | Pendiente con el cliente |
| «No vuelve» a los… días | `lapsedAfterDays` | `lapsed_after_days` | De 7 a 120; 30 por defecto. En Ajustes: «Clientes que no vuelven» |
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
| Motivo de merma | `wasteReason` | `stock_movements.reason` | `broken` (Rota), `expired` (Vencida), `gift` (Regalo), `other` (Otro) |
| Motivo de ajuste | — | `stock_movements.reason` | `count` (conteo), `initial` (stock inicial), `undo` (deshacer) |
| Deshacer | `revertStockChange` | función `revert_stock_change` | Un registro entero (producción, merma o conteo), hasta 10 minutos después |
| Enlazado a la web | `linkedToWeb` | `products.sanity_id` con valor | Solo lo enlazado se copia a la web |
| Stock mínimo | `minStock` | `min_stock` | |
| Sugerencia de producción | `productionSuggestion` | función `production_suggestion` | D16 |
| Venta esperada | `expectedSales` | función `private.expected_sales` | Lo que se vende cada día de la semana: el promedio de hasta 4 semanas, sin anulados ni pedidos para otro día. Con menos de 7 días de historia no hay |
| Le alcanza, alcanza hasta | `coverageDays` | `stock_overview.coverageDays` | Los días desde mañana que cubre lo libre con la venta esperada (hasta 7); alcanzar para un día o menos es «poco» |
| Cómo se vende | `weekdaySales` | función `product_sales_by_weekday` | El gráfico de Un alfajor: la venta esperada de cada día de la semana |
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
| Editar pedido | `editOrder` | función `edit_order` | Antes de entregar; lo que ya estaba conserva su precio. Por debajo de lo pagado, devuelve la diferencia |
| Anular pedido | `cancelOrder` | función `cancel_order` | En cualquier estado menos anulado, con motivo y devolución opcional |
| Deshacer una edición, una anulación | `revertEdit`, `revertCancel` | funciones `revert_edit`, `revert_cancel` | Solo el último cambio del pedido, hasta 10 minutos después |
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
| Recordar (el saldo a un cliente) | `remind` | — | El mensaje `balance_reminder` por WhatsApp, desde Por cobrar; solo si ya se entregó o hubo un adelanto. No es un «Recordatorio» (aviso del celular) |
| Ingreso | `income` | — | Pagos recibidos más ingresos anotados a mano, por fecha de pago (D11) |
| Ingreso anotado a mano | `manualIncome` | `manual_incomes` | Una venta a un café, un evento |

## Gastos y caja

| En pantalla | En el código | En la base | Nota |
|---|---|---|---|
| Gasto | `expense` | `expenses` | |
| Tipo de gasto | `expenseCategory` | `expense_categories` | |
| Foto de la boleta | `receiptPhoto` | `receipt_path` | Supabase Storage, privado |
| Corregir un gasto | `correctExpense` | `replaces_id` | El viejo queda anulado y el nuevo lo apunta |
| Anular un gasto | `voidExpense` | `voided_at`, `void_reason` | No cuenta en ningún total; nada se borra |
| Deshacer (un gasto) | `revertExpenseChange` | función `revert_expense_change` | La última corrección o anulación del gasto, hasta 10 minutos después |
| Gastado en el mes | `expensesSummary` | función `expenses_summary` | El total y lo gastado por tipo |
| Anular un ingreso | `voidManualIncome` | función `void_manual_income` | Solo los anotados a mano; los pagos se corrigen en su pedido |
| Cuadre de caja | `cashCount` | `cash_counts` | Cada conteo queda; el último del día es el que vale |
| Abriste con | `openingCents` | `opening_cents` | Por defecto, lo de hoy si ya se contó, si no lo del último cierre |
| Cobrado en efectivo | `cashInCents` | `cash_in_cents` | Pagos e ingresos a mano en efectivo, sin anular, de ese día |
| Gastos y devoluciones en efectivo | `cashOutCents` | `cash_out_cents` | Gastos y devoluciones en efectivo, sin anular, de ese día |
| Debería haber | `expectedCents` | `expected_cents` | Con cuánto abrió + cobrado en efectivo − gastos y devoluciones en efectivo |
| Hay en la caja (lo contado) | `countedCents` | `counted_cents` | |
| Diferencia: cuadra, sobran, faltan | `differenceCents` | `difference_cents` | Lo contado − lo que debería haber |
| Cerrar el día, volver a contar | `closeCashDay` | función `close_cash_day` | Volver a contar crea otro cierre |

## Clientes, fidelidad y mensajes

| En pantalla | En el código | En la base | Nota |
|---|---|---|---|
| Cliente | `customer` | `customers` | Uno por teléfono en cada negocio (D14) |
| Ficha del cliente | `customerProfile` | — | |
| No vuelven | `lapsedCustomers` | — | Más de 30 días sin pedir (se cambia en Ajustes) |
| Acepta promociones | `acceptsPromotions` | `accepts_promotions` | Sin permiso, no se le escriben promociones |
| Borrar sus datos | `anonymizeCustomer` | `anonymized_at` | Ley 29733; los pedidos quedan como «Cliente eliminado», con «Dirección eliminada» y sin nota |
| Texto de búsqueda | `searchText` | `customers.search_text` | El nombre sin tildes y en minúsculas, con el teléfono; se calcula al escribir |
| Favorito | `favorite` | — | El alfajor que más pide, sin anulados |
| Fidelidad | `loyalty` | `loyalty_settings` | Apagada hasta que el dueño la defina (D15) |
| Sello | `stamp` | `loyalty_stamps` | Movimientos: +1 por pedido entregado, −meta al canjear |
| Meta, premio | `goal`, `reward` | `goal`, `reward` | |
| Sello por pedido o por alfajor | `stampUnit` | `stamp_unit` | `order` o `item`; lo elige el dueño |
| Canjear | `redeem` | `redeemReward` (borrador) | Se aplica como descuento con motivo «Fidelidad»; lo calcula la base |
| Sellos de un pedido | `orderStamps` | `private.sync_order_stamps` | Los deja justos al entregar, deshacer, anular o corregir |
| Mensaje de WhatsApp | `messageTemplate` | `message_templates` | Confirmación, en camino, listo, entregado, recordatorio de saldo, «te extrañamos» |
| Recordatorio | `reminder` | — | Aviso del celular |
| Avisos (la campana de Inicio) | `reminderList` | — | Los recordatorios de ahora, con su pantalla; la misma lista que se programa en el celular |

## Reportes y web

| En pantalla | En el código | En la base | Nota |
|---|---|---|---|
| Reportes | `report` | funciones `report_*` | Calculados en la base (§14.3) |
| Inicio, el resumen de hoy | `homeSummary` | función `home_summary` | Cobrado hoy, entregados, por entregar, por cobrar y si se cerró la caja |
| Periodo, periodo anterior | `period`, `previous` | `p_from`, `p_to` | Semana (lunes a hoy), mes (día 1 a hoy) o fechas elegidas; el anterior tiene el mismo largo |
| Comparación | `delta` | — | «+12 %» frente al periodo anterior, con su tono (bien, ojo o neutro) |
| Entra y sale | `bars` | `report_summary.bars` | Ingresos y gastos por día, semana o mes del periodo |
| Más vendidos, alfajores | `ranking` | función `report_ranking` | Por pedidos entregados, por fecha de entrega |
| Lo urgente | `urgent` | — | Lo atrasado o tarde, lo agotado, lo que hay que revisar y lo que se acaba, en ese orden |
| Exportar a Excel | `exportRows` | función `export_rows` | Un archivo CSV con «;» para Excel en español |
| Ventas | `sales` | — | Pedidos entregados, por fecha de entrega (D11) |
| Ganancia | `profit` | — | Ingresos menos gastos |
| Más vendidos | `ranking` | función `report_ranking` | En unidades y en soles |
| Periodo | `period` | — | `week`, `month`, `custom` |
| Copia a la web | `webSync` | función `sync-to-web` | Precio y «Agotado» a Sanity (D13) |

## Generales

| En pantalla | En el código | En la base | Nota |
|---|---|---|---|
| Fecha del negocio | `businessDate` | — | El día en `America/Lima` |
| Copia de seguridad | `backup` | `private.backup_runs` | La anota el VPS; el dueño ve la última arriba de Ajustes |
| Página de una lista | `Page<T>` | — | `{ items, meta: { limit, total, hasMore, nextCursor } }` (§14.3) |
| Error | `AppError` | — | Tipos: `offline`, `notFound`, `forbidden`, `invalid`, `conflict` y `unexpected` (cualquier otra cosa) |
| Intentos de ingreso | `signInAttempts` | `private.sign_in_attempts` | Contados por número: 5 errores, 15 minutos; 10, cuenta bloqueada |
| Contraseña interna | `ownerPassword` | — | HMAC del id del dueño con `AUTH_PASSWORD_SECRET`; nadie la escribe |
| WhatsApp del equipo | `supportWhatsapp` | — | `EXPO_PUBLIC_SUPPORT_WHATSAPP`, para «Olvidé mi PIN» |
| Ofrecer la huella | `offerBiometrics` | — | Recién ingresado, si el celular tiene huella registrada |
| Código de la operación | `requestId` | `request_id`, en `private.idempotency_keys` | Evita que un reintento duplique un pedido, un pago o un gasto |
| Versión de una fila | `version` | `version` | Detecta dos ediciones a la vez (`conflict`) |
| Registro de cambios | `auditLog` | `private.audit_log` | Precios, ajustes y anulaciones, con lo de antes y lo de después |
| Lo interno | — | esquema `private` | Tablas y funciones que la API no expone |
| Datos del momento | `productName`, `customerName`, `itemsSummary` | `order_lines.product_name`, `orders.customer_name`, `orders.items_summary` | Cómo era cada cosa al momento del pedido, como el precio |
