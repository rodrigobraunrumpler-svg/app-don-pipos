# Productos, precios y copia a la web (`features/products`)

## 1. Qué resuelve

- Los alfajores con su precio, su costo, su stock mínimo y si se ven en la web.
- El precio, si se ve y «Agotado» se copian solos a la web (D13).

**Pantallas de la maqueta que cubre:**
- Productos y precios, y su hoja.
- El paso 1 de la puesta en marcha.
- Los precios que usan Nuevo pedido y Venta de mostrador.

## 2. Datos

### `products`

| Columna | Tipo | Regla |
|---|---|---|
| `name` | text | Único en el negocio, sin importar mayúsculas |
| `price_cents` | int > 0 | |
| `cost_cents` | int > 0, puede ir vacío | Para la ganancia por alfajor |
| `min_stock` | int ≥ 0 | 0 hasta que el dueño lo ponga |
| `show_on_web` | bool | Es el `isVisible` de la web; sí por defecto |
| `is_active` | bool | Un producto no se borra: se desactiva |
| `sort_order` | int | Su orden en la app |
| `sanity_id` | text, puede ir vacío | Su documento en la web |
| `image_url` | text, puede ir vacío | La foto de la web (CDN de Sanity). La completa el equipo al enlazar el producto |
| `version` | int | Para detectar dos ediciones a la vez |

### `private.web_sync_outbox` (lo que falta copiar a la web)

| Columna | Tipo | Regla |
|---|---|---|
| `product_id` | uuid | |
| `payload` | jsonb | `{ priceMinor, isAvailable, isVisible }`, con los nombres de la web |
| `attempts` | int ≥ 0 | |
| `last_error` | text, puede ir vacío | |
| `sent_at` | timestamptz, puede ir vacío | Vacío = falta enviar |

### Índices

| Tabla | Índice | Sirve para |
|---|---|---|
| `products` | único `(business_id, lower(name))` | Que no se repitan los nombres |
| `products` | parcial `(business_id, sort_order)`, si está activo | La lista de la app |
| `products` | único parcial `(sanity_id)`, si tiene | El enlace con la web |
| `private.web_sync_outbox` | parcial `(created_at)`, si falta enviar | Lo pendiente, del más viejo al más nuevo |
| `private.web_sync_outbox` | `(business_id, product_id)` | La llave foránea |

## 3. Funciones de la base

- **`list_products()`:** los activos, cada uno con su stock (`stock_levels`) y su estado.
- **`save_product(id, expected_version, name, price_cents, cost_cents, min_stock, show_on_web)`:** crea o cambia un producto.
  - Si cambia el precio o si se ve, deja una fila en el outbox en la misma operación, y el cambio queda en el registro (`private.audit_log`): «¿cuándo subí el precio?».
  - Con otra versión responde `conflict`.
- **`set_product_active(id, active)`.**
- **La disponibilidad («Agotado»)** cambia cuando el stock cruza el cero. La base deja una fila en el outbox con `isAvailable` dentro de los movimientos de stock (`stock.md`).
- **El envío a la web:**
  - Un trigger llama al momento a la Edge Function `sync-to-web`, por pg_net. Además, pg_cron la llama cada minuto para reintentar lo pendiente.
  - La función manda los cambios a Sanity con su token, que es un secreto de Supabase y nunca está en la app. Después marca `sent_at`.
  - Si falla, suma un intento y guarda el error. Con 10 intentos fallidos avisa al equipo (Sentry).
  - La web se refresca con el webhook firmado que ya existe.

## 4. Permisos

- El dueño lee sus productos. Escribe solo con las funciones.
- `private.web_sync_outbox` vive en un esquema que la API no expone: es solo del servidor.

## 5. Cuentas en el celular (`rules/`)

- **`margin.ts`:** la ganancia por alfajor es el precio menos el costo.
  - 1200 − 510 → 690, un 57,5 %.
  - Sin costo, no hay dato.
- **Los precios que se escriben** se convierten con `lib/money`: «12,50» → 1250. Se rechazan el 0 y los negativos.

## 6. Pantallas y estados

- **Productos y precios:**
  - cada alfajor con su foto o sus iniciales, el precio, «Mínimo 6, cuesta S/ 5.10» y «En la web» u «Oculto»;
  - el aviso «Se copian solos a la web».
- **La hoja del producto:**
  - precio, costo (opcional), stock mínimo e interruptor «Se ve en la web»;
  - al guardar: «Coqueta guardado: S/ 12.00. En la web se ve en unos segundos.».
- **Agregar producto:** nombre y precio. La foto y la descripción se ponen en el panel de la web, y el equipo enlaza el producto.
- **Vistas:** cargando (skeleton), y sin internet: los cambios esperan a que vuelva la señal.

## 7. Con otros módulos

**Usa:** ninguno. El stock de cada producto llega ya junto desde `list_products`.

**Expone:**
- `productsQuery` y las mutaciones.
- El tipo `Product`.
- `ProductAvatar`: la foto o las iniciales, que usan `stock`, `orders` y `reports`.

## 8. Pruebas que deben pasar

**Base (pgTAP):**
- Un precio de cero o menos se rechaza, y también un nombre repetido.
- Cambiar el precio o si se ve deja una fila en el outbox.
- Un producto desactivado no aparece en la lista ni en los pedidos nuevos, pero sí en los viejos.
- Con Sanity simulado, `sync-to-web` marca lo enviado o suma un intento si falla.

**Cuentas (Jest):** `margin.ts`.

**Recorrido:** cambiar un precio y verlo en el pedido siguiente; los pedidos anteriores mantienen su precio.

## 9. Fuera de esta versión

- Variantes de presentación: la web no las tiene.
- Subir fotos desde la app: se hace en el panel de la web.
- «Alfajor Tropi» y «Kekes artesanales»: se agregan cuando tengan precio.
