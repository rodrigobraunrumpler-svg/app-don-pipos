# Negocio, ajustes y puesta en marcha (`features/businesses`)

## 1. Qué resuelve

- Saber cuál es el negocio activo y qué módulos usa. Hoy es Don Pipos; VarMar entra después, con sus propios módulos.
- Guardar los ajustes del negocio:
  - los medios de pago activos;
  - el costo del delivery;
  - cada cuántos días produce;
  - a partir de cuántos días un cliente «no vuelve».
- La puesta en marcha de la primera vez: revisar los productos, cargar el stock de hoy y elegir los tipos de gasto.

**Pantallas de la maqueta que cubre:**
- Puesta en marcha (3 pasos).
- En Más: las filas «Medios de pago», «Delivery» y «Producción», con sus hojas.
- El consejo de la primera vez en Inicio.

## 2. Datos

### `businesses`

| Columna | Tipo | Regla |
|---|---|---|
| `owner_id` | uuid | El dueño (`auth.users`) |
| `name` | text | «Don Pipos» |
| `modules` | text[] | Los módulos que usa: `orders`, `stock`, `expenses`… |
| `setup_done_at` | timestamptz, puede ir vacío | Vacío = falta la puesta en marcha |

### `business_settings` (una fila por negocio)

| Columna | Tipo | Regla |
|---|---|---|
| `business_id` | uuid | Llave primaria |
| `active_payment_methods` | text[] | Por defecto `cash`, `yape`, `plin`, `transfer`; al menos uno |
| `delivery_fee_cents` | int ≥ 0 | Pendiente con el cliente (§7); 0 hasta que lo diga |
| `delivery_zone` | text, puede ir vacío | Pendiente con el cliente |
| `production_interval_days` | int, de 1 a 14 | 7 por defecto |
| `lapsed_after_days` | int, de 7 a 120 | 30 por defecto |
| `reminders` | jsonb | `{ scheduled, stock, balances }`, todos activos (`reminders.md`) |
| `version` | int | Para detectar dos ediciones a la vez |

### `private.business_counters` (una fila por negocio)

| Columna | Tipo | Regla |
|---|---|---|
| `business_id` | uuid | Llave primaria |
| `next_order_number` | int ≥ 1 | Lo usa `create_order`, que lo bloquea dentro de la misma operación |

### `private.backup_runs` (cada copia de seguridad)

| Columna | Tipo | Regla |
|---|---|---|
| `started_at`, `finished_at` | timestamptz | |
| `ok` | bool | |
| `size_bytes` | bigint, puede ir vacío | |
| `error` | text, puede ir vacío | |

La anota el script de copia del VPS. No lleva `business_id` porque la copia es de toda la base.

### Índices

| Tabla | Índice | Sirve para |
|---|---|---|
| `private.backup_runs` | `(finished_at desc)` | La última copia |
| `businesses` | `(owner_id)` | Las reglas de acceso: los negocios del usuario |
| `business_settings`, `private.business_counters` | Llave primaria | Una fila por negocio |

## 3. Funciones de la base

- **`private.owned_business_ids()`:** devuelve los negocios del usuario (`owner_id = (select auth.uid())`).
  - Es `security definer` y `stable`, y vive en el esquema `private`, que la API no expone.
  - La usan todas las reglas de acceso.
- **`get_business()`:** el negocio activo con sus ajustes y si falta la puesta en marcha.
- **`update_settings(expected_version, patch)`:** cambia uno o varios ajustes. Valida los rangos y que quede al menos un medio de pago. Con otra versión responde `conflict`. Cada cambio queda en el registro de cambios (`private.audit_log`).
- **`complete_setup(stock, expense_category_names)`:** en una sola operación:
  - carga el stock de hoy de cada producto, como movimientos `adjustment` con motivo «stock inicial»;
  - crea los tipos de gasto elegidos;
  - marca `setup_done_at`.

  Los productos ya los cargó el equipo con el catálogo confirmado (§7 de `PROJECT_CONTEXT.md`); en el paso 1 el dueño solo los revisa. Si se llama otra vez, responde `conflict`.
- **La copia de seguridad:**
  - `private.record_backup(...)`: la llama el script del VPS con la llave secreta, que solo está en el VPS, al terminar cada copia.
  - `backup_status()`: devuelve a la app solo la hora de la última copia buena y si está atrasada (más de 26 horas).
  - El script avisa al equipo por un monitor de latidos (por ejemplo, Healthchecks.io); si un día no avisa, el monitor alerta.
- **Al crear un negocio** (con un script del equipo), se crean también:
  - su fila de ajustes;
  - su contador;
  - sus mensajes por defecto (`messages.md`);
  - su fidelidad, apagada (`loyalty.md`).

## 4. Permisos

- El dueño lee su negocio y sus ajustes, y los cambia solo con las funciones.
- Crear negocios: solo el equipo, con la llave secreta y un script.

## 5. Cuentas en el celular (`rules/`)

- **`settings-labels.ts`:** los textos de las filas de Más.
  - `production_interval_days` 1 → «Cada día»; 7 → «Cada 7 días».
  - Delivery 500 → «S/ 5.00»; 0 → «Sin costo».
  - Medios activos `cash`, `yape`, `plin` → «3».

## 6. Pantallas y estados

- **El layout raíz decide adónde va:**
  - sin sesión → Ingresar (`auth.md`);
  - con sesión pero sin puesta en marcha → `(setup)`;
  - si no → Inicio.
- **Puesta en marcha:**
  - Paso 1, «Tus productos»: la lista con sus precios. «Agregar otro producto» usa `products`.
  - Paso 2, «Tu stock de hoy»: + y − por alfajor.
  - Paso 3, «Tus tipos de gasto»: chips.
  - «Terminar» muestra «Todo listo» y lleva a Inicio con el consejo de la primera vez («Toca + abajo…», «Entendido»).
  - Se puede volver atrás entre pasos sin perder lo puesto.
- **Más, hojas de ajustes:**
  - «Medios de pago»: interruptores. Los apagados dejan de aparecer al anotar pedidos y gastos.
  - «Delivery»: el costo. La zona de reparto, pendiente.
  - «Producción»: cada cuántos días produce. Inicio y Stock sugieren para ese periodo.
- **Más, arriba:** «Tus datos están respaldados. Última copia de seguridad: hoy, 03:00». Si está atrasada, en ámbar: «La copia de seguridad está atrasada. El equipo ya está avisado».
- **Vistas:** «Guardando…», y sin internet: los cambios esperan a que vuelva la señal.

## 7. Con otros módulos

**Usa:** `products`, para la lista del paso 1. El stock inicial y los tipos de gasto los crea `complete_setup` en la base.

**Expone:**
- Consultas: `businessQuery` y `settingsQuery`.
- `useSettings()` y las mutaciones.
- Los tipos `Business` y `BusinessSettings`.
- `activePaymentMethods`, que usan `orders`, `expenses` e `income`.

## 8. Pruebas que deben pasar

**Base (pgTAP):**
- `owned_business_ids` devuelve solo los negocios del usuario; otro usuario no ve el negocio.
- `update_settings` rechaza los rangos fuera de límite y dejar el negocio sin medios de pago.
- `complete_setup` crea los movimientos y los tipos de gasto, y marca la fecha. La segunda vez responde `conflict`.
- El contador de un negocio nuevo empieza en 1.
- `backup_status` dice «atrasada» con más de 26 horas sin una copia buena, y no deja ver nada más de `private.backup_runs`.

**Cuentas (Jest):** los ejemplos de §5.

**Pantallas:** el layout manda a la puesta en marcha si falta, y la puesta en marcha guarda al terminar.

**Recorrido:** ingresar → puesta en marcha → Inicio con el consejo.

## 9. Fuera de esta versión

- Varios usuarios por negocio (cajeros) y roles.
- Cambiar de negocio dentro de la app. Cuando entre VarMar, será un selector en Más.
