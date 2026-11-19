# Clientes (`features/customers`)

## 1. Qué resuelve

- Registrar al cliente solo con su teléfono, al anotar un pedido.
- Saber quién compra más y quién dejó de venir.
- Cuidar sus datos, como pide la Ley 29733.

**Pantallas de la maqueta que cubre:**
- Clientes y Ficha del cliente.
- El cliente en Nuevo pedido (paso 2) y en Un pedido.

## 2. Datos

### `customers`

| Columna | Tipo | Regla |
|---|---|---|
| `name` | text | |
| `phone` | `phone_pe`, puede ir vacío | `+51` y 9 dígitos; único en el negocio. Solo queda vacío si se borraron sus datos |
| `address` | text, puede ir vacío | La última dirección de delivery |
| `note` | text, puede ir vacío | «Prefiere que le escriban antes de salir» |
| `accepts_promotions` | bool | No, por defecto (§12) |
| `orders_count` | int ≥ 0 | Sus pedidos sin anular. Lo mantiene la base |
| `spent_cents` | int ≥ 0 | La suma de esos pedidos |
| `last_order_at` | timestamptz, puede ir vacío | |
| `stamps` | int ≥ 0 | Sus sellos de hoy. Los mantiene `loyalty` |
| `anonymized_at` | timestamptz, puede ir vacío | Sus datos se borraron porque lo pidió |
| `version` | int | Para detectar dos ediciones a la vez |

### Índices

| Tabla | Índice | Sirve para |
|---|---|---|
| `customers` | único parcial `(business_id, phone)`, si tiene teléfono | Encontrarlo por teléfono al anotar un pedido |
| `customers` | GIN `(business_id, name gin_trgm_ops)`, con `btree_gin` | Encontrar «ana» dentro de «Ana Q.» |
| `customers` | `(business_id, spent_cents desc)` | «Los que más compran» |
| `customers` | `(business_id, last_order_at)` | «No vuelven» y el orden por último pedido |

## 3. Funciones de la base

- **`find_customer_by_phone(phone)`:** completa el nombre mientras se escribe el teléfono.
- **`search_customers(q, filter, limit, cursor)`:** busca por nombre o teléfono. Los filtros:
  - `all`: ordenados por último pedido;
  - `top`: por lo gastado;
  - `lapsed`: sin pedir hace más de `lapsed_after_days`.
- **`get_customer(id)`:** la ficha: sus datos, sus totales, su favorito (el alfajor que más pide) y sus sellos.
- **`update_customer(id, expected_version, name, address, note, accepts_promotions)`:** con otra versión responde `conflict`.
- **`anonymize_customer(id)`:** borra el nombre, el teléfono, la dirección y la nota, y cambia `customer_name` a «Cliente eliminado» en sus pedidos. Los pedidos quedan, para no romper los números del negocio.
- **Los pedidos lo mantienen al día:** `create_order` crea o actualiza al cliente por su teléfono, y mantiene `orders_count`, `spent_cents` y `last_order_at`, también al anular.

## 4. Permisos

Los comunes: el dueño lee sus clientes y escribe solo con las funciones. Otro negocio no los ve.

## 5. Cuentas en el celular (`rules/`)

- **`phone.ts`:**
  - `normalizePhone("987 654 321")` → `"+51987654321"`; `"+51 987-654-321"` → lo mismo.
  - Con 8 dígitos o con letras → inválido.
  - `formatPhone("+51987654321")` → «987 654 321».
- **`last-order.ts`:** el texto del último pedido: «Hoy, 09:30», «Ayer» o «Hace 34 días».
- **Las iniciales** («Lucía R.» → «LR») las hace el avatar de `components/ui`, que no sabe del negocio.

## 6. Pantallas y estados

- **Clientes:**
  - búsqueda por nombre o teléfono;
  - filtros Todos, Los más compran y No vuelven;
  - cada fila con sus iniciales, el nombre, sus pedidos, el último y lo gastado;
  - en «No vuelven», «Escribirle» aparece solo si aceptó promociones (el mensaje «te extrañamos», de `messages`).
  - Vistas: cargando, sin datos y sin internet.
- **Ficha del cliente:**
  - pedidos, gastado y último;
  - su tarjeta de sellos (`loyalty`) y su favorito;
  - su dirección, su nota y si acepta promociones;
  - sus pedidos (de `orders`, los une la pantalla);
  - WhatsApp y Llamar;
  - «Borrar sus datos», con confirmación.
- **Paso 2 del pedido:** al escribir el teléfono aparece el cliente, con su último pedido y «Repetir».

## 7. Con otros módulos

**Usa:** ninguno. La ficha completa la arma la pantalla, uniendo:
- `CustomerCard`, de este módulo;
- la tarjeta de sellos, de `loyalty`;
- los pedidos del cliente, de `orders`;
- el mensaje, de `messages`.

**Expone:**
- Consultas: `customerByPhoneQuery`, `customersQuery(filter)` y `customerQuery(id)`.
- `CustomerCard` y las mutaciones.
- El tipo `Customer` y `normalizePhone`.

## 8. Pruebas que deben pasar

**Base (pgTAP):**
- Hay un solo cliente por teléfono en cada negocio.
- Sus totales se mantienen al crear y al anular pedidos.
- `lapsed` usa el ajuste del negocio.
- La búsqueda por trigramas encuentra «ana» y «lu».
- Anonimizar borra los datos personales y deja los pedidos.
- Otro negocio no ve los clientes.

**Rendimiento:** `search_customers` responde en menos de 50 ms con decenas de miles de clientes.

**Cuentas (Jest):** `phone.ts` y `last-order.ts`.

**Recorridos:**
- Anotar un pedido con un teléfono nuevo y verlo en Clientes.
- Borrar los datos de un cliente.

## 9. Fuera de esta versión

- Varias direcciones por cliente.
- Mensajes masivos o automáticos: necesitan la API de WhatsApp (§4).
- Cumpleaños y segmentos.
