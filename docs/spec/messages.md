# Mensajes de WhatsApp (`features/messages`)

## 1. Qué resuelve

Los textos que la app arma para avisar al cliente por WhatsApp (D17). El dueño los revisa y los envía desde su propio WhatsApp con un toque: un enlace `wa.me`, sin API y sin costo.

**Pantallas de la maqueta que cubre:**
- Mensajes de WhatsApp.
- Los avisos en Pedido guardado, Un pedido, Por cobrar y Clientes.

## 2. Datos

### `message_templates`

| Columna | Tipo | Regla |
|---|---|---|
| `business_id`, `key` | | Llave primaria. `key` es uno de estos: `confirmation`, `on_the_way`, `ready`, `delivered`, `balance_reminder`, `we_miss_you` |
| `body` | text | El texto, con marcadores: `{nombre}`, `{numero}`, `{detalle}`, `{total}`, `{adelanto}`, `{entrega}`, `{pago}`, `{falta}`, `{sellos}` |
| `version` | int | Para detectar dos ediciones a la vez |

Al crear el negocio se cargan los textos por defecto, los mismos de la maqueta (`private.default_templates`). `{sellos}` queda vacío hasta la fidelidad (fase 7).

### Índices

La llave primaria basta: son 6 filas por negocio.

## 3. Funciones de la base

- **`list_templates()`.**
- **`update_template(key, expected_version, body)`:** rechaza los marcadores que no existen y los textos vacíos (`invalid`), y con otra versión responde `conflict`. Cada cambio queda en el registro (`private.audit_log`).
- **`reset_template(key)`:** vuelve al texto por defecto.

## 4. Permisos

Los comunes: el dueño lee sus textos y los cambia solo con las funciones.

## 5. Cuentas en el celular (`rules/`)

- **`fill.ts`:** `fillTemplate(body, context)` reemplaza los marcadores.
  - Ejemplo: «Hola {nombre}, tu pedido {numero} va en camino. Total a pagar: {falta} ({pago}).», con Ana, #0042, S/ 42.00 y «Yape, Plin, transferencia o efectivo», da «Hola Ana, tu pedido #0042 va en camino. Total a pagar: S/ 42.00 (Yape, Plin, transferencia o efectivo).».
  - `{adelanto}` y `{entrega}` se reemplazan por una frase completa o por nada. Por ejemplo, sin adelanto no aparece la frase del adelanto.
- **`placeholders.ts`:** qué marcadores vale cada plantilla, y la validación, con el mismo criterio que la base.
- **El enlace** lo arma `lib/whatsapp.ts`, que es común: `waLink("+51987654321", texto)` → `https://wa.me/51987654321?text=…`, codificado para que pasen la ñ, las tildes y los saltos de línea.

## 6. Pantallas y estados

- **Mensajes de WhatsApp:**
  - cada plantilla como un acordeón, con su texto;
  - chips con los marcadores, para insertarlos;
  - la vista previa en una burbuja, con datos de ejemplo;
  - «Volver al texto original».
- **Los avisos:** la burbuja con el texto ya lleno y «Enviar por WhatsApp», que abre WhatsApp con ese texto.

## 7. Con otros módulos

**Usa:** ninguno.

**Expone:**
- `templatesQuery` y las mutaciones.
- `fillTemplate`.
- `MessagePreview`: la burbuja con su botón.

## 8. Pruebas que deben pasar

**Base (pgTAP):**
- Un negocio nuevo tiene sus textos por defecto.
- Un marcador desconocido se rechaza.
- `reset_template` vuelve al texto original.

**Cuentas (Jest):**
- `fill.ts` con todos los marcadores y con datos vacíos.
- `waLink` codifica bien la ñ, las tildes y los saltos de línea.

**Pantallas:** la vista previa cambia mientras se escribe.

## 9. Fuera de esta versión

El envío automático, que necesita la API de WhatsApp Business (§4).
