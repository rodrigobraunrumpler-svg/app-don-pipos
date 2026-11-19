# Stock (`features/stock`)

## 1. Qué resuelve

- Cuántos alfajores hay de cada uno, y por qué: los movimientos.
- Para cuántos días alcanzan.
- Cuánto conviene producir (D16).
- Anotar la producción, las mermas y los conteos.
- Avisa, no bloquea (D12).

**Pantallas de la maqueta que cubre:**
- Stock, Registrar producción y Un alfajor (el historial).
- Las hojas Anotar merma y Contar stock.
- La bandeja y la sugerencia de Inicio.

## 2. Datos

### `stock_movements`

| Columna | Tipo | Regla |
|---|---|---|
| `product_id` | uuid | |
| `kind` | text | `production`, `sale`, `cancellation`, `waste` o `adjustment` |
| `quantity` | int ≠ 0 | Con signo: positivo en `production` y `cancellation`, negativo en `sale` y `waste`, cualquiera en `adjustment` |
| `reason` | text, puede ir vacío | Obligatorio en `waste` (rota, regalo, otra…) y en `adjustment` (conteo, stock inicial, deshacer) |
| `order_id` | uuid, puede ir vacío | En `sale` y `cancellation` |
| `happened_at` | timestamptz | Ahora, por defecto |

### `stock_levels` (la suma ya hecha)

| Columna | Tipo | Regla |
|---|---|---|
| `product_id` | uuid | Llave primaria |
| `on_hand` | int | Puede ser negativo (D12) |

- Se actualiza en la misma operación que cada movimiento; solo lo hacen las funciones.
- `fillfactor` 70: cambia con cada venta y así se actualiza sin reescribir sus índices.
- Si el stock pasa de cero o menos a más de cero, o al revés, deja una fila en el outbox de la web (`products.md`).

### Índices

| Tabla | Índice | Sirve para |
|---|---|---|
| `stock_movements` | `(business_id, product_id, happened_at desc)` | El historial de un alfajor y las ventas por día de la semana para la sugerencia |
| `stock_movements` | parcial `(business_id, order_id)`, si tiene pedido | La llave foránea; los movimientos de un pedido |
| `stock_levels` | Llave primaria `(product_id)` | El stock de cada alfajor |

Si algún día `stock_movements` pasa de millones de filas, un índice BRIN en `happened_at` cuesta casi nada. Hoy no hace falta.

## 3. Funciones de la base

- **`stock_overview()`:** por alfajor devuelve tres números, su estado, hasta qué día alcanza y lo sugerido.
  - Los tres números:
    - **libre** (`on_hand`): lo que se puede vender. Si es cero o menos, la web lo muestra «Agotado»;
    - **apartado:** los alfajores de los pedidos sin entregar ni anular. Se suma con el índice de pedidos en curso, que son pocos;
    - **en la nevera:** libre + apartado.
  - Los estados (decidido al revisar la especificación):
    - `check`: en la nevera da menos de cero. Los números no cuadran: «2 vendidos de más: cuenta y ajusta»;
    - `owed`: lo libre es negativo, pero en la nevera no. Hay pedidos comprometidos y falta producir: «Faltan 14 para pedidos: produce»;
    - `out`: lo libre es cero;
    - `low`: lo libre está en el mínimo o debajo, o alcanza para un día o menos;
    - `ok`: todo lo demás.
- **`production_suggestion()`:** la fórmula de D16, por alfajor.
  - **La venta esperada** es el promedio de cada día de la semana, para los próximos `production_interval_days` días. Se calcula con las líneas de los pedidos del mismo día, por su `due_date` y sin anular, ya con sus ediciones.
  - **Los pedidos para otro día y los de eventos no cuentan para el promedio:** ya restaron el stock libre, así que entran en la cuenta por ahí, y no inflan los lunes durante 4 semanas.
  - **Las semanas:** usa las últimas 4. Con menos, usa las que haya, desde 7 días de ventas. Con menos de 7 días, no sugiere y la pantalla pide anotar lo que hizo. Así el primer mes de uso ya sugiere desde la segunda semana.
  - Le suma el mínimo y le resta lo libre. Redondea hacia arriba y nunca da negativo.
  - Esa misma venta esperada se usa para «alcanza hasta», para el estado `low` y para el aviso de que algo se acaba.
  - Devuelve también el porqué, para «Por qué 36»: las ventas de lunes a viernes, las de sábado y domingo, el mínimo y el stock.
- **`register_production(request_id, items)`:** suma al stock. Devuelve los alfajores que vuelven a estar disponibles en la web.
- **`register_waste(request_id, product_id, quantity, reason)`.**
- **`register_stock_count(request_id, counts)`:** el dueño cuenta todo lo que hay en la nevera, incluido lo apartado para pedidos. Por cada alfajor, el ajuste es lo contado menos lo que debería haber en la nevera (libre + apartado), y solo se crea si hay diferencia. Así un conteo nunca borra lo comprometido.
- **`revert_movement(movement_id)`:** el «Deshacer» de una producción, una merma o un conteo. Crea un movimiento contrario con motivo «deshacer». Solo vale para lo creado en los últimos 10 minutos.
- **`list_product_movements(product_id, limit, cursor)`:** el historial, por páginas.
- **`product_sales_by_weekday(product_id)`:** el gráfico «Cómo se vende», de las últimas 4 semanas.

## 4. Permisos

Los comunes: el dueño lee su stock y escribe solo con las funciones.

## 5. Cuentas en el celular (`rules/`)

- **`coverage.ts`:** el texto de hasta cuándo alcanza, siendo hoy miércoles 18.
  - Hasta el 19 → «Alcanza hasta mañana».
  - Hasta el 20 → «Alcanza hasta el viernes».
  - Stock 0 → «Sin stock».
  - Libre −14 y en la nevera 10 → «Faltan 14 para pedidos: produce».
  - En la nevera −2 → «2 vendidos de más: cuenta y ajusta».
- **`count.ts`:** la vista previa al contar. Con 11 libres y 2 apartados, debería haber 13 en la nevera:
  - se contaron 13 → sin diferencia;
  - se contaron 12 → «−1».
- **`production.ts`:** el total a guardar, la suma de lo puesto: «Guardar producción: 145 alfajores».

## 6. Pantallas y estados

- **Stock:**
  - «Actualizado a las…» y «Contar stock»;
  - la sugerencia: «Esta semana conviene hacer 145 alfajores»;
  - cada alfajor con su foto, su estado en color, el número grande y «Agotado en la web» o «Ya disponible en la web»;
  - «Anotar merma» y «Registrar producción».
  - Vistas: cargando, actualizando, sin datos (sin productos), error y sin internet.
- **Registrar producción:**
  - lo sugerido por alfajor, con «Por qué 36» desplegable;
  - + y −;
  - «Guardar producción: 145 alfajores»;
  - «Producción guardada», con los alfajores que vuelven a la web y «Deshacer»;
  - sin historial: «Anota cuántos hiciste».
- **Un alfajor:**
  - el stock, los días que alcanza y el mínimo;
  - el gráfico por día de la semana;
  - los movimientos por páginas;
  - «Contar stock» y «Anotar merma».
- **Hojas:**
  - merma: cantidad y motivo;
  - conteo: cada alfajor con «Deberías tener 13 en la nevera (11 libres y 2 apartados para pedidos)», lo contado y la diferencia.
- **En Inicio:** la bandeja con el estado de cada alfajor y la sugerencia con «Registrar producción».

## 7. Con otros módulos

**Usa:** `products`: los nombres, `ProductAvatar` y el mínimo.

**Expone:**
- Consultas: `stockOverviewQuery` y `productionSuggestionQuery`.
- Las mutaciones.
- `StockTray`, la bandeja de Inicio.
- Los tipos.

## 8. Pruebas que deben pasar

**Base (pgTAP):**
- `stock_levels` siempre es igual a la suma de los movimientos, después de cada función y también con datos al azar.
- Vender sin stock deja el número en negativo.
- La merma exige un motivo.
- El conteo solo crea ajustes donde hay diferencia, y compara con lo libre más lo apartado: contar con pedidos sin entregar no infla el stock.
- Un pedido para otro día más grande que lo libre deja el alfajor en `owed`, no en `check`.
- La sugerencia no cuenta los pedidos para otro día; con 7 días de ventas ya sugiere, y con menos no.
- La producción devuelve los alfajores que vuelven a la web y deja la fila en el outbox.
- La sugerencia, con ventas de ejemplo: 5 al día de lunes a viernes, 9 los sábados y domingos, cada 7 días, mínimo 6 y stock 13 → 5 × 5 + 9 × 2 + 6 − 13 = **36**. Sin historial, devuelve vacío.
- `revert_movement` solo deshace lo de los últimos 10 minutos.
- El mismo `request_id` dos veces registra la producción, la merma o el conteo una sola vez.

**Rendimiento:** `stock_overview` y `production_suggestion` responden en menos de 50 ms con años de movimientos.

**Cuentas (Jest):** `coverage.ts`, `count.ts` y `production.ts`.

**Recorridos:**
- Registrar la producción sugerida y deshacerla.
- Anotar una merma.
- Contar el stock.

## 9. Fuera de esta versión

- Ingredientes y recetas (D3).
- Lotes y vencimientos: los alfajores se guardan en la nevera (§6 de `PROJECT_CONTEXT.md`).
