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
- Ajustes (el ⚙ de Inicio, fase 7c): las filas «Medios de pago», «Delivery», «Producción» y «Clientes que no vuelven», con sus hojas.
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
| `active_payment_methods` | `payment_method[]` | Por defecto `cash`, `yape`, `plin`, `transfer`; al menos uno |
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

- **`private.owned_business_ids()`:** devuelve la lista (`uuid[]`) de los negocios del usuario (`owner_id = (select auth.uid())`).
  - Es `security definer` y `stable`, y vive en el esquema `private`, que la API no expone.
  - La usan todas las reglas de acceso.
- **`private.current_business_id()`:** el negocio con el que trabaja el usuario; sin negocio responde `not_found`. La usan las funciones que escriben. Hoy cada dueño tiene uno; cuando haya varios, aquí se elige el activo.
- **`get_business()`:** el negocio activo con sus ajustes y si falta la puesta en marcha. Lee con las reglas de acceso. Devuelve `{ id, name, modules, setupDone, settings }`, y `settings` trae `activePaymentMethods`, `deliveryFeeCents`, `deliveryZone`, `productionIntervalDays`, `lapsedAfterDays`, `reminders` y `version`.
- **`update_settings(p_expected_version, p_patch)`:** cambia uno o varios ajustes y devuelve el objeto `settings` nuevo. Cada cambio queda en el registro de cambios (`private.audit_log`).
  - `p_patch` trae una o más de las claves de `settings` (menos `version`), y ninguna otra.
  - Valida todo antes de guardar: de 1 a 4 medios de pago válidos y sin repetir; el delivery, un entero de 0 a 1,000,000 céntimos; producir cada 1 a 14 días; «no vuelve» de 7 a 120 días; la zona, un texto de hasta 120 caracteres (vacío se guarda como `null`); los recordatorios, con sus tres claves.
  - Cualquier otra forma responde `invalid` y no guarda nada. Con otra versión responde `conflict`.
- **`complete_setup(p_request_id, p_stock, p_categories)`:** en una sola operación (decidido en la fase 7b):
  - carga el stock de hoy de cada producto. `p_stock` trae todos los alfajores como `[{ productId, counted }]`. Como en un conteo, el ajuste es lo contado menos lo que debería haber en la nevera (libre + apartado): un movimiento `adjustment` con motivo `initial` («Stock inicial»), y sin diferencia no hay movimiento;
  - crea los tipos de gasto elegidos, `[{ name, icon }]` (de 0 a 20; la tabla pide el ícono). Un nombre que ya existe (sin mirar mayúsculas) o repetido no se crea otra vez;
  - marca `setup_done_at`;
  - devuelve `{ adjustments, categories }`.

  Lleva código de pedido como las demás escrituras: una respuesta perdida devuelve lo mismo. Los productos ya los cargó el equipo con el catálogo confirmado (§7 de `PROJECT_CONTEXT.md`); en el paso 1 el dueño solo los revisa. Una segunda puesta en marcha (otro código) responde `conflict`, y la app lo toma como «ya estaba hecha».
- **La copia de seguridad:**
  - `private.record_backup(started_at, finished_at, ok, size_bytes, error)`: la llama el script del VPS al terminar cada copia, buena o fallida, con la misma conexión a la base que usa `pg_dump` (fase 8: así el VPS no guarda otro secreto).
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

- **`settings-labels.ts`:** los textos de las filas de Ajustes.
  - `production_interval_days` 1 → «Cada día»; 7 → «Cada 7 días».
  - Delivery 500 → «S/ 5.00»; 0 → «Sin costo».
  - Medios activos `cash`, `yape`, `plin` → «3».
  - «No vuelven» 30 → «30 días».
  - Recordatorios: «3 activos», «1 activo» o «Apagados».

## 6. Pantallas y estados

- **El layout raíz decide adónde va:**
  - sin sesión → Ingresar (`auth.md`);
  - con sesión pero sin puesta en marcha → la puesta en marcha (`src/app/setup/`: un grupo `(setup)` pondría su primer paso en «/», que ya es la entrada);
  - si no → Inicio.
  - Mientras se sabe si falta (el primer ingreso, un instante), la entrada muestra el fondo. Si no se puede saber (sin señal, o falló una vez), entra a Inicio sin esperar los reintentos: la app nunca se queda bloqueada.
- **Puesta en marcha:**
  - Paso 1, «Tus productos»: la lista con sus precios. «Agregar otro producto» usa `products`.
  - Paso 2, «Tu stock de hoy»: + y − por alfajor. Cada uno empieza en lo que ya hay en la nevera (0 en un negocio nuevo): «Terminar» sin tocarlo no cambia el stock de un negocio que ya lo llevaba.
  - Paso 3, «Tus tipos de gasto»: chips con los cinco de la maqueta (Insumos, Empaques, Delivery, Servicios, Otros), los cuatro primeros marcados. Son sugerencias de pantalla: nada se crea sin «Terminar».
  - «Terminar» muestra «Todo listo» y lleva a Inicio con el consejo de la primera vez («Toca + abajo…», «Entendido»). El consejo sale una sola vez: una marca en el celular que «Entendido» borra.
  - Cada paso es una pantalla de la pila: se puede volver atrás sin perder lo puesto.
- **Ajustes** (fase 7c: la pestaña Más ya no existe) se abre con el ⚙ de Inicio, como una pantalla de la pila con «Volver». Tiene tres grupos:
  - *Tu negocio:* Productos y precios, Medios de pago, Delivery, Producción y Tipos de gasto.
  - *Tus clientes:* Fidelidad, Mensajes de WhatsApp y Clientes que no vuelven.
  - *Tu cuenta y este celular:* tu número, la huella, cuándo pedir huella o PIN, Recordatorios, cambiar PIN y cerrar sesión (`auth.md`).

  Algunos se abren también donde se usan: Productos y precios desde Stock, Tipos de gasto desde Gastos, Fidelidad y Clientes que no vuelven desde Pedidos › Clientes. La campana de Inicio muestra los avisos, no los interruptores de Recordatorios.
- **Ajustes, sus hojas:**
  - «Medios de pago»: interruptores. Los apagados dejan de aparecer al anotar pedidos y gastos.
  - «Delivery»: el costo. La zona de reparto no se muestra ni se pide hasta que algo la use (la web, en su fase 2).
  - «Producción»: cada cuántos días produce. Inicio y Stock sugieren para ese periodo.
  - «Clientes que no vuelven»: a partir de cuántos días sin pedir un cliente sale en «No vuelven» (decidido en la fase 7b; la maqueta no tiene la fila).
- **Ajustes, arriba:** «Tus datos están respaldados. Última copia de seguridad: hoy, 03:00» (con los días de Lima). Si está atrasada, en ámbar: «La copia de seguridad está atrasada. El equipo ya está avisado». Sin ninguna copia todavía, sin alarma: «Todavía no hay copias de seguridad de tus datos.» (este proyecto también es el de producción, y el plan gratis no hace copias). Cargando o con error, no sale nada.
- **Vistas:** «Guardando…». Sin internet, las hojas dicen «Sin conexión. Los cambios esperan a que vuelva la señal» y no dejan guardar hasta que vuelva (los guardados de la app salen al momento y avisan si no hay señal). Un cambio que llegó antes responde «Otro cambio llegó antes: revisa los ajustes y vuelve a guardar», sin perder lo escrito, y la hoja muestra «Lo guardado ahora: …». El delivery llega hasta S/ 10,000 (la hoja lo dice antes de guardar).

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
- Cambiar de negocio dentro de la app. Cuando entre VarMar, será un selector en Ajustes.
