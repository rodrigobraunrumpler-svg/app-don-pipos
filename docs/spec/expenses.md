# Gastos (`features/expenses`)

## 1. Qué resuelve

- Anotar en segundos lo que se gasta (insumos, empaques, delivery…), con la foto de la boleta si quiere.
- Corregir o anular un gasto sin perder la historia.

**Pantallas de la maqueta que cubre:**
- Gastos y Anotar gasto.
- Las hojas Corregir y Anular.
- Tipos de gasto: en Ajustes (el ⚙ de Inicio) y arriba de Gastos. Gastos se abre desde la tarjeta «Gastos» de Reportes (fase 7c).

## 2. Datos

### `expenses`

| Columna | Tipo | Regla |
|---|---|---|
| `category_id` | uuid | La llave lleva `business_id` |
| `description` | text, puede ir vacío | «Chocolate de cobertura» |
| `amount_cents` | int > 0 | |
| `method` | `payment_method` | El mismo tipo que los pagos de los pedidos |
| `spent_at` | timestamptz | Ahora, por defecto |
| `receipt_path` | text, puede ir vacío | La foto, en Supabase Storage (privado) |
| `voided_at`, `void_reason` | puede ir vacío | Anulado: no cuenta |
| `replaces_id` | uuid, puede ir vacío | Si corrige otro gasto; el viejo queda anulado |

### `expense_categories`

| Columna | Tipo | Regla |
|---|---|---|
| `name` | text | Único en el negocio |
| `icon` | text | El nombre del ícono, elegido entre unos pocos (insumos, empaques, delivery, servicios, local, otros…). Si la app no lo conoce, dibuja el de «otros» |
| `is_active` | bool | |
| `sort_order` | int | |

### Índices

| Tabla | Índice | Sirve para |
|---|---|---|
| `expenses` | parcial `(business_id, spent_at desc)`, si no está anulado | La lista, el total del mes, los reportes y el efectivo del día en el cuadre |
| `expenses` | `(business_id, category_id)` | La llave foránea y los gastos por tipo |
| `expenses` | parcial `(business_id, replaces_id)`, si tiene | La llave foránea |
| `expense_categories` | único `(business_id, lower(name))` | Que no se repitan los nombres |

### La foto de la boleta

- Va en el bucket `receipts`, que es privado, en la ruta `{business_id}/{expense_id}.jpg`.
- Las políticas de Storage dejan al dueño leer y subir solo en la carpeta de su negocio.

## 3. Funciones de la base

- **`list_expense_categories()`:** los tipos del negocio, en su orden (decidido en el plan de la fase 5, como `list_products`).
- **`create_expense(request_id, category_id, amount_cents, method, description, spent_at)`:** con el mismo `request_id`, devuelve el gasto ya creado.
- **`attach_receipt(expense_id, receipt_path)`:** se llama después de subir la foto.
- **`correct_expense(request_id, id, category_id, amount_cents, method, description)`:** anula el gasto viejo y crea el nuevo con `replaces_id`, en una sola operación; la fecha y la boleta pasan al nuevo. Se corrigen el monto, el tipo, el medio y la descripción (la maqueta mostraba solo el monto). Las correcciones y anulaciones quedan en el registro (`private.audit_log`).
- **`void_expense(id, reason)`.**
- **`revert_expense_change(expense_id)`:** el «Deshacer» de corregir o anular, dentro de los 10 minutos. Vuelve a dejar el gasto como estaba.
- **`list_expenses(from, to, limit, cursor)`:** los gastos que cuentan (sin anular), del más nuevo al más viejo. Uno corregido trae cuánto era antes; uno anulado sale de la lista.
- **`expenses_summary(from, to)`:** el total y lo gastado por tipo, para las barras de «Gastado en noviembre».
- **`save_expense_category(…)` y `set_category_active(…)`.**

## 4. Permisos

Los comunes, más las políticas de Storage de §2.

## 5. Cuentas en el celular

- **Los montos que se escriben** se convierten con `lib/money`.
- **La foto se achica antes de subir**, con `lib/images.ts`, que es común: el lado mayor queda en 1600 px, en JPEG 0,7. Normalmente pesa menos de 300 KB.

## 6. Pantallas y estados

- **Gastos:**
  - «Gastado en noviembre S/ 1,245.50» y las barras por tipo;
  - «Anotar gasto»;
  - los últimos gastos, con su ícono, fecha, medio y monto;
  - «Ver todos», de 20 en 20 en la misma pantalla;
  - corregir y anular, con «Deshacer».
  - Vistas: cargando, sin datos, error y sin internet.
- **Anotar gasto:**
  - el monto grande, con teclado numérico;
  - el tipo, en chips;
  - la descripción;
  - el medio de pago, en chips, solo con los activos;
  - «Tomar foto de la boleta»;
  - «Guardar gasto de S/ X», con «Guardando…».

  La foto sube después de guardar el gasto, con su propio corte de 60 s. Si falla, el aviso ofrece reintentar, y la hoja del gasto deja agregarla después: el gasto nunca se pierde.
  Sin señal, «Guardar» se apaga y lo dice: no queda un borrador guardado (son tres datos).
- **Tipos de gasto:** una hoja, que se abre desde Ajustes y desde arriba de Gastos.

## 7. Con otros módulos

**Usa:** `businesses`, para los medios de pago activos.

**Expone:**
- Consultas: `expensesQuery` y `expensesSummaryQuery`.
- Las mutaciones.
- El tipo `Expense`.

El efectivo del día para el cuadre lo suma la base, en `cash`.

## 8. Pruebas que deben pasar

**Base (pgTAP):**
- El monto tiene que ser mayor que cero.
- Los gastos anulados no cuentan en ningún total.
- Corregir deja la historia: el viejo anulado y el nuevo con `replaces_id`.
- El resumen por tipo suma bien.
- Storage no deja leer la boleta de otro negocio.
- `revert_expense_change` deja el gasto como estaba, y después de 10 minutos responde `conflict`.

**Rendimiento:** la lista y el resumen responden en menos de 50 ms con años de gastos.

**Recorridos:**
- Anotar un gasto con foto.
- Corregirlo y deshacer.

## 9. Fuera de esta versión

- Gastos que se repiten, como la luz o el alquiler (para después).
- Proveedores y cuentas por pagar.
