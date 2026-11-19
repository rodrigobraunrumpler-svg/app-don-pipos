# APP DE GESTIÓN (DON PIPOS, LUEGO VARMAR) — CONTEXTO DEL PROYECTO

> **Estado:** acordado y en construcción. La fase 0 (el proyecto con su estructura y sus reglas) está construida y revisada en la rama `fase-0`; el avance de cada fase está en `docs/plan/README.md`.
> **Versión:** 0.3 · **Fecha:** 2026-11-18 · **Idioma de la app:** español (Perú).
> **Relacionado:** la web está en `/home/javier/var-mar/product`. Su `CLAUDE.md` (§2) y su `docs/PROJECT_CONTEXT.md` (§6) son la fuente del catálogo confirmado de Don Pipos.

---

## 1. De dónde sale

- **El cliente:** VarMar (restobar y marisquería en Huamanga, Ayacucho) y su marca de alfajores **Don Pipos**. Don Pipos vende en el local y por delivery, con pedidos por WhatsApp.
- **La web** (varmar.pe) está terminada y el cliente la aprobó el 2026-11-18. Falta publicarla (VPS y dominio).
- **El pedido (2026-11-18):** «un sistema», empezando por Don Pipos. Quiere gestionar sus pedidos, saber qué alfajores se venden más, y llevar su stock y su inventario. En sus palabras (audio):

  > «Hacer un inventario de cuánto invierto, de cuánto, por ejemplo, ingresos y egresos, ¿no? Más que nada. Y cuánto stock tengo, cuánto se me va agotando y todo eso.»

- **Lo que busca** (nuestra lectura): saber cuánto le deja Don Pipos y no quedarse sin producto.

## 2. Qué es

Una app para el celular del dueño (Android) que registra los pedidos, el stock, los gastos y los ingresos de Don Pipos, y le muestra cuánto vende y cuánto gana. Más adelante suma VarMar en la misma app.

## 3. Primera versión: qué tiene

1. **Inicio:** lo vendido hoy, cuántos pedidos van, qué alfajor se está acabando y cuánto entró por cada medio de pago. Arriba, lo urgente: un pedido que va tarde, un alfajor agotado o por revisar.
2. **Pedidos**
   - Se anotan en segundos: botones + y − por alfajor, el cliente se completa solo al escribir su teléfono, canal (WhatsApp, local, web), retiro en el local o delivery con dirección, y un medio de pago marcado por defecto.
   - Cada pedido lleva un **número corto y correlativo** (#0001), para hablar con el cliente por WhatsApp.
   - **Descuento o precio especial,** con su motivo, para que lo registrado sea igual a lo cobrado.
   - **Pagos:** cada pago con su monto, medio y fecha. Admite adelanto y saldo (pedidos para eventos) y pagos mixtos (mitad Yape, mitad efectivo). El pedido queda **pagado** cuando los pagos cubren el total; si no, queda **por cobrar**, con lo que falta.
   - **Borrador que no se pierde:** si se corta la señal o se cierra la app, el pedido a medio llenar queda guardado.
   - **Mensajes de WhatsApp con un toque** (D17). Al cambiar el estado, la app ofrece avisar al cliente: se abre el WhatsApp del dueño en el chat del cliente con el texto listo, y él decide si lo envía. Los textos se editan en Ajustes.
     - **Nuevo → confirmación:** número, detalle y total. Si ya pagó todo o una parte, lo dice.
     - **En camino:** el aviso y el monto a pagar al recibir, con los medios de pago. Si ya está pagado, lo dice.
     - **Listo para recoger:** el aviso y el monto a pagar, igual que «en camino».
     - **Entregado:** el agradecimiento y, si la fidelidad está activa, cuántos sellos lleva.
     - **Recordatorio de saldo:** no va en el recorrido normal. Solo aparece en «por cobrar», cuando quedó debiendo después de recibir o falta el saldo de un pedido con adelanto.
     - En la venta en el mostrador no hay mensajes: el cliente está ahí.
   - Estados: nuevo → preparando → en camino (delivery) o listo para recoger (local) → entregado. O anulado, con su motivo.
   - **Corregir lo que se anotó mal,** aunque ya esté entregado (decidido el 2026-11-18):
     - **Anular** también un pedido entregado o una venta de mostrador, con motivo y la pregunta de la devolución, y volver a anotarlo bien. Deja de contar en las ventas y se quitan sus sellos.
     - **Cambiar el medio de pago** de un pago (por ejemplo, de efectivo a Yape). El cuadre de caja se corrige solo.
     - Las dos quedan en el registro de cambios.
   - **Venta en el mostrador:** se registra de una vez como entregada y pagada, sin pasar por los demás estados.
   - **Venta de mostrador rápida:** desde el botón +, en una sola pantalla y sin cliente: se tocan los alfajores y se cobra con Efectivo, Yape o Plin. Se puede deshacer.
   - **Pedido demorado:** si pasa la hora de un pedido y todavía no está listo (o entregado, si es delivery), se marca «10 min tarde» en la lista y en lo urgente de Inicio.
   - **Pedido con anticipación** (por ejemplo, para un evento): lleva fecha de entrega y aparece en «Próximos».
   - **El stock baja al registrar el pedido,** no al entregarlo, para no vender lo que ya está comprometido. Al anularlo, los alfajores vuelven al stock.
3. **Stock** (de alfajores terminados, ver D3)
   - Lo que se produce suma («+50 Coqueta») y lo que se vende resta solo.
   - Las mermas (rotos, vencidos, regalos) se anotan con su motivo.
   - **Al contar,** se cuenta todo lo que hay en la nevera, incluido lo apartado para pedidos sin entregar. La app lo compara con lo libre más lo apartado, así un conteo nunca borra lo comprometido.
   - Aviso cuando queda poco, y para cuántos días alcanza según lo que se vende.
   - **Avisar, no bloquear:** si se vende sin stock registrado, la app avisa pero deja vender, y el número negativo pide un ajuste.
   - **Sugerencia de producción** (D16): cuánto hacer de cada alfajor para los próximos días (por defecto, una semana), con el porqué a la vista. Un toque la convierte en «registrar producción», con las cantidades ya puestas.
   - Cuando un alfajor llega a cero, la web lo muestra «Agotado»; al reponerlo, se quita solo (ver §8).
4. **Gastos (egresos):** monto, fecha y tipo (insumos, empaques, delivery…), con foto de la boleta si quiere.
5. **Ingresos:** salen solos de los pagos recibidos, por fecha de pago. Los demás (una venta a un café, un evento) se anotan a mano.
6. **Reportes**
   - Ingresos, gastos y ganancia, por semana y por mes.
   - Ranking de alfajores más vendidos, en unidades y en soles. Ventas y ranking cuentan los pedidos entregados, por fecha de entrega (D11).
   - Ventas por canal.
   - Ganancia por alfajor, si el dueño carga un costo aproximado por alfajor.
   - Clientes que más compran, en soles y en número de pedidos.
   - Exportar a Excel para el contador.
7. **Productos:** precios y disponibilidad se manejan aquí y se copian solos a la web; fotos y descripciones siguen en el panel de la web (D13). Puede tener productos que todavía no salen en la web.
8. **Usuario:** uno solo, el dueño, como administrador. Sin correo, sin contraseña y sin SMS: el equipo le crea la cuenta con su número de celular y un PIN de 6 números. La primera vez en un celular escribe los dos; después entra con su huella o su PIN (D18). Si pierde el celular, el equipo cierra su sesión y le da un PIN nuevo.
9. **Ajustes:** productos y precios, tipos de gasto, medios de pago, stock mínimo, costo del delivery, cada cuántos días produce, los textos de los mensajes de WhatsApp y un botón de soporte con el WhatsApp de la agencia.
10. **Sin señal:** lo ya cargado se sigue viendo, con un aviso claro de que no hay conexión, y nada a medio llenar se pierde. Trabajar del todo sin internet sigue para después (§4).
11. **Clientes**
    - Se registran solos al anotar un pedido, por su teléfono: nombre, direcciones y una nota.
    - Ficha de cada cliente: cuántos pedidos hizo, cuánto gastó, cuándo fue el último y su historial.
    - Clientes que no vuelven: los que no piden hace más de 30 días (se cambia en Ajustes), para escribirles.
    - La venta en el mostrador puede ir sin nombre, como «cliente de mostrador», para no frenar la venta.
12. **Fidelidad**
    - Tarjeta de sellos digital: cada compra suma. Al llegar a la meta, la app avisa y el premio se aplica como descuento con el motivo «fidelidad».
    - La meta y el premio los decide el dueño en Ajustes. Queda apagada hasta que los defina.
13. **Cuadre de caja** al cerrar el día
    - Debería haber en efectivo: con cuánto abrió, más lo cobrado en efectivo, menos los gastos pagados en efectivo.
    - Escribe lo que contó y ve si cuadra, sobra o falta. El cierre queda anotado.
    - Yape, Plin y transferencias van aparte, para compararlos con lo que muestran sus apps.

## 4. Fuera de la primera versión

- Boletas y facturas electrónicas (SUNAT).
- Cobros en línea.
- Leer o responder WhatsApp de forma automática.
- Stock de ingredientes y empaques, con recetas.
- Trabajar sin internet.
- Más usuarios con permisos distintos.
- VarMar (mesas, cocina).
- **Fase 2:** que los pedidos hechos en la web entren solos a la app.
- **Para una versión siguiente:**
  - gastos que se repiten cada mes (alquiler, luz), anotados solos;
  - proveedores: a quién le compra y cuánto le gasta;
  - un resumen semanal escrito con IA, solo si el cliente lo quiere. Con un plan de pago, porque en los planes gratis (como el de Gemini) Google puede usar los datos y leerlos personas de su equipo.

## 5. Decisiones tomadas

| N.º | Decisión | Por qué |
|---|---|---|
| D1 | App para Android, entregada como **APK**. Sin Play Store ni App Store. | El dueño usa Android y hace todo desde el celular. |
| D2 | **Una sola app modular** para los negocios del dueño: Don Pipos primero, VarMar después. | Mismo dueño: una APK y un usuario. Gastos, stock y reportes se programan una vez. |
| D3 | **Stock de alfajores terminados**, no de ingredientes. Lo invertido se ve en los gastos. | Es simple de usar a diario. El stock de ingredientes queda para después y se puede sumar sin rehacer nada. |
| D4 | **Un solo usuario:** el dueño, administrador. | Solo él usará la app. |
| D5 | Datos en **Supabase** y manejo de datos en la app con **TanStack Query**. | Elección del equipo: inicio de sesión, base de datos y fotos ya resueltos. |
| D6 | Carpeta `/home/javier/var-mar/app`. Identificador de Android **`pe.varmar.app`** (no se puede cambiar después). Nombre en el celular: «Don Pipos» (sí se puede cambiar). | Coincide con el dominio del cliente y sirve cuando entre VarMar. |
| D7 | El **código en inglés**, como la web. Todo lo que ve el dueño, en **español (es-PE)**. | Consistencia con la web. |
| D8 | **Estados del pedido:** nuevo, preparando, en camino o listo para recoger, entregado y anulado (§3). | Cubren el delivery, el retiro en el local y la venta en el mostrador. |
| D9 | **Precio congelado:** cada línea del pedido guarda el precio y el costo con que se vendió. | Cambiar un precio no altera lo ya vendido ni los reportes. |
| D10 | **Pagos como movimientos:** monto, medio y fecha de cada pago. | Admite adelantos, pagos mixtos y la lista de lo que se debe. |
| D11 | **Ingresos** son los pagos recibidos, por fecha de pago. **Ventas y ranking** son los pedidos entregados, por fecha de entrega. | Reportes sin dudas sobre qué se cuenta. |
| D12 | **Stock: avisar, no bloquear.** | El registro puede no estar al día, y bloquear frustra. |
| D13 | **Una sola fuente por dato:** precios y disponibilidad de Don Pipos en la app, copiados a la web; fotos y descripciones en el panel de la web. | Nunca un precio distinto en la app y en la web. |
| D14 | **Clientes registrados por su teléfono,** uno por negocio. El mostrador puede vender sin nombre. | Saber quién compra más sin frenar la venta rápida. |
| D15 | **Fidelidad con tarjeta de sellos,** apagada hasta que el dueño defina la meta y el premio. | No inventar reglas de su negocio; el premio usa los descuentos que ya existen. |
| D16 | **Sugerencia de producción con una fórmula,** no con IA (§6). | Es aritmética: exacta, gratis, explicable y sin enviar datos del negocio a terceros. |
| D17 | **Mensajes de WhatsApp por enlace** (`wa.me`), enviados por el dueño desde su WhatsApp. | Sin API, sin costo y sin envíos automáticos. |
| D18 | **Entrar con su número de celular y un PIN de 6 números que crea el equipo,** sin correo, contraseña ni SMS. Número y PIN solo la primera vez en cada celular; después, huella o PIN. El servidor cuenta los intentos (§12). | Rápido como la app del banco y sin pagar un servicio de SMS. Su número es público (está en la web), así que un PIN de 6 números solo es seguro si el servidor limita los intentos. |

Todas tomadas el 2026-11-18.

## 6. Reglas del negocio

- **Stock como movimientos:** producción (+), venta (−), merma (−, con motivo) y ajuste. El stock es la suma de los movimientos, nunca un número que se sobrescribe. Así siempre se sabe por qué hay lo que hay y se corrige sin perder historia. Para leerlo rápido, la base guarda la suma ya hecha (`stock_levels`) en la misma operación que crea cada movimiento, y una prueba confirma que siempre coinciden.
- **Nada se borra:** un pedido anulado queda anulado, con su fecha, y devuelve su stock.
- **Pagos como movimientos** (D10) y **precio congelado** en cada línea del pedido (D9).
- **Descuentos:** el cliente los hace (confirmado el 2026-11-18). Van por pedido, con su motivo.
- **Número de pedido** corto y correlativo, por negocio.
- **Clientes:** uno por teléfono en cada negocio (D14). El premio de fidelidad se aplica como descuento con el motivo «fidelidad» (D15).
- **Qué cuenta cada reporte:** ingresos por fecha de pago; ventas y ranking por fecha de entrega (D11).
- **Sugerencia de producción** (D16), por alfajor:
  - venta esperada de los próximos días: el promedio de cada día de la semana en las últimas 4 semanas (el sábado se compara con los sábados), solo con los pedidos del mismo día y sin anulados. Los pedidos para otro día y los de eventos no cuentan para el promedio: ya restaron el stock;
  - más el stock mínimo, menos el stock actual, redondeado hacia arriba;
  - con menos de 4 semanas usa las que haya, desde 7 días de ventas; con menos de 7 días, todavía no sugiere.
- **Sin vencimientos:** los alfajores se guardan en la nevera y no tienen un número fijo de días, así que la app no controla vencimientos (dicho por el cliente, 2026-11-18).
- **Montos en céntimos** (enteros), en soles (PEN), con el formato «S/ 12.00».
- **Días y cierres en hora de Lima** (`America/Lima`).
- **Cada dato lleva su negocio** (`business_id`).
- **Los datos del negocio se editan en la app, nunca en el código:** productos y precios, tipos de gasto, medios de pago, stock mínimo por alfajor y costo del delivery.
- **Medios de pago:** Yape, Plin, transferencia y efectivo (efectivo confirmado el 2026-11-18).
- **No inventar datos del negocio** (la misma regla que en la web): lo que el cliente no confirmó queda marcado como pendiente.

## 7. Datos iniciales

- **Catálogo confirmado:** Alfajor Coqueta S/ 12.00, Alfajor Morenita S/ 12.00, Alfajor Limon Kiss S/ 12.00, Alfajor de Manteadita S/ 12.00 y Alfajor Pipo Crush S/ 13.00.
- **Sin precio todavía:** «Alfajor Tropi» y «Kekes artesanales». Se agregan cuando haya precio.
- **Para empezar, el cliente tiene que dar:**
  - el stock de cada alfajor el día que empiece;
  - los tipos de gasto que maneja;
  - un costo aproximado por alfajor, si quiere ver la ganancia de cada uno;
  - si cobra el delivery, cuánto, y su zona de reparto;
  - cada cuántos días produce;
  - si quiere la fidelidad, con qué meta y qué premio. Pregunta lista para enviar: «¿Quieres premiar a tus clientes frecuentes? Por ejemplo, por cada 10 compras, o por cada 10 alfajores, 1 gratis. ¿Qué premio darías y cada cuánto?».

## 8. Conexión con la web

- **Precios y disponibilidad salen de la app (D13):** una función de Supabase copia a Sanity el precio (`priceMinor`) y la disponibilidad (`isAvailable`), y la web se refresca con el webhook firmado que ya existe. Fotos y descripciones siguen en el panel de la web.
- **«Agotado» automático:** cuando un alfajor llega a cero, esa función marca `isAvailable: false`; al reponer stock, vuelve a `true`.
- **El token de Sanity** se guarda como secreto en Supabase, nunca dentro de la app.
- **Fase 2:** los pedidos hechos en la web entran solos a la app.

## 9. Estructura de carpetas (acordada; actualizada con la maqueta el 2026-11-18 y con la fase 0 el 2026-11-19)

```
app/
├── src/
│   ├── app/                        Pantallas (Expo Router): solo arman la pantalla
│   │   ├── _layout.tsx             Sesión, datos, colores claro/oscuro y letra
│   │   ├── (auth)/
│   │   │   ├── sign-in.tsx         Número + PIN, la primera vez en el celular
│   │   │   └── unlock.tsx          Huella o PIN, las demás veces
│   │   ├── (setup)/                Puesta en marcha: productos, stock, gastos
│   │   └── (main)/                 Todo lo que pide sesión
│   │       ├── _layout.tsx         Pestañas: Inicio, Pedidos, +, Stock, Más
│   │       ├── index.tsx           Inicio
│   │       ├── orders/             index · new · [id] · counter · receivables
│   │       ├── stock/              index · production · [productId]
│   │       ├── expenses/           index · new
│   │       ├── cash.tsx            Cuadre de caja
│   │       ├── reports/            index · ranking
│   │       ├── customers/          index · [id]
│   │       └── more/               index · products · messages · loyalty
│   ├── features/                   Un módulo por tema, todos con la misma forma (§9.1)
│   │   ├── orders/                 Pedidos, estados, pagos, venta de mostrador, demorados
│   │   ├── stock/                  Movimientos, producción, merma, conteo, sugerencia
│   │   ├── products/               Precios, costo y disponibilidad (se copian a la web)
│   │   ├── expenses/               Gastos, tipos y foto de la boleta
│   │   ├── income/                 Pagos recibidos e ingresos anotados a mano
│   │   ├── cash/                   Cuadre y cierre del día
│   │   ├── reports/                Resumen, comparación y ranking
│   │   ├── customers/              Clientes, su ficha, los que no vuelven
│   │   ├── loyalty/                Sellos y premio
│   │   ├── messages/               Plantillas de WhatsApp
│   │   ├── reminders/              Avisos del celular
│   │   ├── businesses/             Negocio activo, sus módulos y sus ajustes
│   │   └── auth/                   PIN, huella y bloqueo
│   ├── components/ui/              Piezas sin nada del negocio: botón, chip, hoja, aviso
│   │                               con Deshacer, skeleton, teclado del PIN, contador +/−
│   ├── lib/                        supabase · query · env · errors · money · dates · haptics · whatsapp · images
│   ├── test/                       Ayudas de prueba (render con proveedores, datos de ejemplo) y, en routes/, las pruebas de las pantallas
│   ├── theme/                      Colores claro y oscuro, Manrope y tamaños
│   └── types/database.ts           Generado desde Supabase; no se edita a mano
├── supabase/
│   ├── schemas/                    Un archivo por módulo: tablas, índices, funciones y permisos
│   ├── migrations/                 Cada cambio, en orden; se generan desde schemas/, no a mano
│   ├── functions/
│   │   ├── sign-in-with-pin/       Revisa el PIN y cuenta los intentos (D18)
│   │   └── sync-to-web/            Precio y «Agotado» a la web (D13)
│   ├── tests/                      Permisos, totales, paginado e intentos del PIN
│   ├── seed.sql                    Datos DEMO, solo para desarrollar
│   └── config.toml
├── e2e/                            Recorridos completos (Playwright sobre la versión web)
├── templates/feature/              Plantilla de un módulo nuevo
├── scripts/                        Crear un módulo · probar las reglas de lint (con la tabla de §9.1, celda por celda) · copia diaria de la base
├── tools/lint-fixtures/            Archivos hechos para romper cada regla: prueban que el lint las atrapa
├── assets/                         Ícono, pantalla de carga y las demás imágenes y letras
├── docs/
│   ├── PROJECT_CONTEXT.md          Este documento
│   ├── glossary.md                 Un nombre por concepto, en el código y en pantalla
│   ├── design/pantallas/           La maqueta aprobada
│   ├── spec/                       La especificación, un archivo por módulo
│   └── plan/                       Las fases de la implementación
├── .github/workflows/              Lint, tipos y pruebas en cada cambio
├── eslint.config.mjs               Las reglas del código (§10.2)
├── eslint/structure.mjs            Quién puede usar a quién (§9.1)
├── eslint/colors.mjs               Los colores escritos a mano que el lint no deja pasar
├── lefthook.yml                    Lo mismo antes de cada commit
├── app.config.ts · eas.json · tsconfig.json · commitlint.config.js · .env.example · package.json
├── babel.config.js · metro.config.js · tailwind.config.js · jest.config.js · jest.setup.js
└── CLAUDE.md                       Las reglas de esta estructura
```

### 9.1 Por dentro de cada módulo

Todos los módulos tienen las mismas carpetas; uno chico solo tiene menos archivos. Así queda `orders`, el más grande:

```
features/orders/
├── index.ts                    Lo único que ven las pantallas y los otros módulos
├── constants.ts                Estados, flujos (delivery, recoge, mostrador) y límites
├── schema/                     La forma de los datos (Zod) y sus tipos
│   ├── order.ts                Pedido, línea, estado
│   ├── payment.ts              Pago y medio de pago
│   └── draft.ts                El pedido a medio llenar
├── api/                        Lo único que habla con Supabase (sin React)
│   ├── orders.ts               Listar (paginado), uno, crear, editar, avanzar, anular
│   ├── payments.ts             Registrar pago
│   └── counter-sale.ts         Venta de mostrador: pedido y pago en una sola función de la base
├── queries/                    TanStack Query
│   ├── keys.ts                 Las claves: todos, lista por filtro, uno
│   ├── orders.ts               Consultas: la lista por páginas, uno, por cobrar
│   └── mutations.ts            Avanzar, pagar, crear, anular, vender (cada una dice qué refrescar)
├── rules/                      Cuentas puras, cada una con su prueba al lado
│   ├── totals.ts + totals.test.ts         El total del borrador (vista previa)
│   ├── status.ts + status.test.ts         El siguiente estado según la entrega
│   ├── lateness.ts + lateness.test.ts     ¿Va tarde? ¿Cuántos minutos?
│   └── payment.ts + payment.test.ts       Pagado, falta, por cobrar
├── hooks/                      Unen consultas y reglas para la pantalla
│   ├── use-order-draft.ts      El borrador que no se pierde
│   └── use-advance-order.ts    Avanzar con «Deshacer» y vibración
└── components/                 Un componente por archivo, con su prueba al lado
    ├── order-row.tsx           La fila: quién, qué, cuánto, estado, demorado
    ├── status-chip.tsx · order-filters.tsx · order-timeline.tsx
    ├── payment-sheet.tsx · cancel-sheet.tsx
    ├── draft-items.tsx         Paso 1: qué lleva
    ├── draft-delivery.tsx      Paso 2: entrega y pago
    └── counter-sale.tsx
```

**Quién puede usar a quién** (lo revisa el lint, §10.2):

| Carpeta o archivo | Puede usar | No puede usar |
|---|---|---|
| `components/` | hooks, queries, rules, schema y `constants.ts` de su módulo; el `index.ts` de otro módulo; `components/ui`, `theme`, `lib` (menos `lib/supabase.ts`) y las imágenes y letras de `assets/` | api, `lib/supabase.ts` y `@supabase/*` |
| `hooks/` | queries, rules, schema y `constants.ts` de su módulo; el `index.ts` de otro módulo; `lib` (menos `lib/supabase.ts`) | components, api, `components/ui` y `theme` |
| `queries/` | api y schema de su módulo; `lib` (menos `lib/supabase.ts`) | components, hooks, rules y `constants.ts` |
| `api/` | schema de su módulo, `lib` con `lib/supabase.ts`, `types` y `@supabase/*` | React (`react`, `react-native`, `expo-*` y `@tanstack/react-query`), queries, components |
| `rules/` | schema y `constants.ts` de su módulo, `lib/money` y `lib/dates` | cualquier paquete (tampoco Zod), el resto de `lib`, api, queries |
| `schema/`, `constants.ts` | Zod | nada más: ni otra carpeta, ni `lib`, ni otro paquete |
| `index.ts` del módulo | components, hooks, queries, rules y schema de su módulo | api, `constants.ts` y cualquier otro módulo |
| `components/ui` | `theme`, `lib` (menos `lib/supabase.ts`) y las imágenes y letras de `assets/` | cualquier módulo |
| `lib` | `types` | cualquier módulo, `components/ui`, `theme` |
| `lib/supabase.ts` | lo mismo que `lib`, más `@supabase/*` | lo mismo que `lib`. Solo lo importan `api/` y su propia prueba: tampoco otro archivo de `lib` |
| `theme`, `types` | nada de la app | |
| `src/app` (pantallas) | el `index.ts` de los módulos, `components/ui`, `theme`, `lib` (menos `lib/supabase.ts`) y las imágenes y letras de `assets/` | las carpetas de un módulo por dentro, `lib/supabase.ts` y `@supabase/*` |
| `src/test` (ayudas de prueba) | el `index.ts` de los módulos, `components/ui`, `theme`, `lib` (menos `lib/supabase.ts`) y `src/app` | las carpetas de un módulo por dentro y `lib/supabase.ts` |
| Una prueba (`*.test.ts`) | lo mismo que su carpeta, más `src/test` | |
| Otro módulo | solo el `index.ts` | sus carpetas por dentro y su `constants.ts` |

- **Lo que una fila no nombra en «Puede usar» está prohibido.** La tercera columna solo resalta lo que más se intenta. Dentro de su propia carpeta, un archivo usa a los demás sin límite.
- **Paquetes:** `rules/` no importa ninguno, y `schema/` y `constants.ts`, solo Zod. Los demás usan los paquetes instalados, con dos límites: `api/` no usa React, y `@supabase/*` solo se importa en `lib/supabase.ts` y en `api/`.
- **Dentro de un módulo solo existen** `index.ts`, `constants.ts` y las seis carpetas. Otro archivo u otra carpeta, o un archivo de `src` fuera de los lugares de esta tabla, es un error del lint, sea `.ts`, `.tsx` o JavaScript.
- **Las pruebas** viven junto a su archivo, dentro de esas carpetas. En `src/app` no: las de las pantallas van en `src/test/routes/`.
- **`assets/`** es la carpeta de la raíz, y de ella cuentan las imágenes y las letras (`png`, `jpg`, `jpeg`, `webp`, `gif`, `ttf` y `otf`). Una carpeta llamada `assets` dentro de `src` no tiene trato especial.
- **Cada lugar se reconoce desde la raíz del repositorio:** una ruta repetida más adentro (`src/components/ui/src/features/x/api`) no recibe los permisos de la verdadera.
- **La tabla está escrita celda por celda** en `scripts/lint-matrix.mjs`. `pnpm lint:rules` importa cada columna desde cada fila y comprueba que el lint deje pasar solo lo que dice la tabla: si alguien afloja una regla, falla.

**Las pantallas juntan módulos:** si una pantalla necesita dos (la ficha del cliente con su historial de pedidos), los une la pantalla en `src/app/`; un módulo no importa a otro para eso. Así no se forman ciclos.

**Cómo crece sin rehacer nada**
- **Un módulo nuevo,** como las mesas de VarMar: `pnpm new:feature tables` y sus pantallas.
- **Un negocio nuevo:** un registro en la base de datos y la lista de módulos que usa.
- **Un cliente nuevo:** sus datos separados por las reglas de Supabase, y su nombre y su ícono en `app.config.ts`.
- **Un panel web, si algún día hace falta:** lo común pasa a paquetes compartidos, sin tocar los módulos.

## 10. Reglas del código

### 10.1 Las reglas

1. **Pantallas delgadas:** cada pantalla pide los datos a sus módulos y los muestra. No hace consultas ni cuentas. Si junta dos módulos, la unión se hace ahí (§9.1).
2. **Un solo punto de contacto con Supabase:** la carpeta `api/` de cada módulo.
3. **Módulos que no se pisan:** un módulo usa otro solo a través de su `index.ts`, nunca por dentro, y sin ciclos.
4. **Dentro del módulo, cada carpeta en su papel:** la tabla de §9.1.
5. **Lo común no sabe del negocio:** `components/ui` y `lib` sirven para cualquier módulo y no importan de ninguno.
6. **Cuentas probadas, y donde corresponde:** lo guardado (totales, stock, conteos, reportes) lo calcula la base de datos (§14.3). El celular solo calcula la vista previa antes de guardar, como el total mientras se arma un pedido, y esas cuentas van en `rules/`, con sus pruebas.
7. **Archivos chicos:** un componente por archivo y nada de más de 250 líneas; lo que crece se parte por tema.
8. **Base de datos con migraciones:** la base de datos solo cambia con migraciones, generadas desde `supabase/schemas/` (un archivo por módulo), y los tipos se generan a partir de ella.
9. **Cada tabla igual de segura:** lleva `business_id`, `created_at` y `updated_at` (con un trigger común), tiene las reglas de acceso activadas y filtra por negocio. Las funciones de la base fijan su `search_path`.
10. **Montos y fechas centralizados:** céntimos y hora de Lima, siempre con las funciones de `lib`.
11. **Idioma:** el código en inglés; los textos que ve el dueño, en español.
12. **Sin librerías de más:** TanStack Query para los datos y el estado propio de React para lo demás.
13. **Lo que se repite sube:** cuando algo se usa en dos módulos, pasa a `components/ui` o a `lib`.
14. **Módulos con la misma forma:** `pnpm new:feature <nombre>` crea el módulo desde `templates/feature/`; nadie lo arma a mano.
15. **Un nombre por concepto:** manda el glosario (`docs/glossary.md`). Un concepto nuevo se agrega ahí antes de usarlo en el código.
16. **Errores con un solo formato:** `api/` convierte cualquier error en un `AppError` con su tipo (sin conexión, no encontrado, sin permiso, datos inválidos, conflicto). Los textos para el dueño salen de un solo lugar (`lib/errors.ts`); ninguna pantalla muestra un error técnico.
17. **Base rápida desde el principio:** cada consulta tiene un índice compuesto que la sirve (empieza por `business_id`), las llaves foráneas tienen índice, las listas usan cursor y no OFFSET, y lo que se lee mucho se guarda ya calculado. El detalle está en `docs/spec/README.md` y cada módulo lista sus índices.
18. **Que nada se duplique:** cada creación lleva un `request_id`; si la señal falla y el celular reintenta, la base devuelve lo ya creado (`docs/spec/README.md`).

### 10.2 Cómo se hacen cumplir solas

Si algo se sale, el lint, las pruebas o GitHub bloquean el cambio:
- **eslint-plugin-boundaries:** aplica la tabla de §9.1 y prohíbe entrar a un módulo por dentro o que una pantalla hable directo con Supabase. Un archivo fuera de los lugares conocidos también falla.
- **import-x/no-cycle:** prohíbe importaciones en círculo.
- **`max-lines` (250) y `react/no-multi-comp`:** archivos chicos y un componente por archivo.
- **eslint-plugin-check-file:** carpetas y archivos en kebab-case.
- **`index.ts` sin `export *`:** lo público se elige nombre por nombre.
- **Lint contra valores sueltos:** falla si aparece un color escrito a mano fuera de `theme/`: un hexadecimal, `rgb()` o `hsl()`, un valor suelto de Tailwind (`bg-[#…]`, `border-[color:…]`) o un texto como `"red"` en una propiedad de color. La paleta que trae Tailwind se quitó: `bg-red-500` o `text-white` no existen, solo las clases del tema.
- **Cobertura del 100 % en `rules/`,** sin comentarios que saquen una rama de la cuenta (`istanbul ignore`, `c8 ignore`, `v8 ignore`).
- **TypeScript estricto, sin atajos:** prohibidos `any`, `@ts-ignore` y `console.log`. Las reglas de estructura valen igual para un archivo `.js`, `.jsx`, `.mjs` o `.cjs` dentro de `src`.
- **Rutas tipadas de Expo Router** y el alias `@/`: un enlace a una pantalla que no existe no compila. `pnpm typecheck` genera los tipos de las rutas antes de compilar, también en GitHub.
- **Tipos de la base al día:** en GitHub se regenera `types/database.ts` desde las migraciones; si no coincide con el del repositorio, falla.
- **Base de datos revisada:** una prueba falla si alguna tabla no tiene las reglas de acceso activadas, y `supabase db lint` revisa las funciones en cada cambio.
- **Rendimiento medido:** con datos de prueba de varios negocios y años, un script revisa con `EXPLAIN` que las funciones principales usen sus índices y respondan en menos de 50 ms (en GitHub, cuando cambia una migración). Una vez al mes, `supabase inspect db seq-scans` y `supabase inspect db unused-indexes` en producción.
- **Variables de entorno revisadas al arrancar** (`lib/env.ts` con Zod): si falta una, la app lo dice en vez de fallar en silencio.
- **Accesibilidad:** eslint-plugin-react-native-a11y; cada botón con su nombre para el lector de pantalla.
- **Commits:** commitlint (Conventional Commits en inglés, máximo 100 caracteres) y gitleaks, que bloquea cualquier llave o secreto antes de que entre. Ningún archivo `.env` entra al repositorio, salvo la plantilla `.env.example`.
- **Antes de cada commit (lefthook) y en GitHub Actions:** formato, lint, tipos, pruebas y el mensaje del commit. GitHub revisa además la cobertura, el formato de todos los archivos y los secretos en toda la historia. Los hooks se activan una vez por copia del repositorio (`CLAUDE.md`, «Comandos»).

Estas reglas se probaron el 2026-11-19 con ESLint 9.39, la versión que admite la configuración de Expo 58; cuando Expo admita la 10, se sube. Los comentarios `eslint-disable` no tienen efecto (`noInlineConfig`). `pnpm lint:rules` comprueba las propias reglas de dos maneras: con archivos hechos para romperlas, uno por cada caso y con una sola falta cada uno, y con la tabla de §9.1 celda por celda. Apagar o aflojar una regla lo hace fallar (`docs/plan/fase-0-proyecto.md`, tarea 2 y «Después de la revisión final»).

Las herramientas existen y están vigentes (consultado el 2026-11-18: eslint-plugin-boundaries 7, eslint-plugin-check-file 3, eslint-plugin-import-x 4, eslint-config-expo 58, eslint-plugin-react-native-a11y 3.5, commitlint 21, gitleaks 8.30). Las versiones exactas se fijan al crear el proyecto.

### 10.3 Dónde va cada cosa

| Si es… | Va en… |
|---|---|
| Una pantalla, o la unión de dos módulos | `src/app/`, y solo arma la pantalla |
| Hablar con Supabase | `features/<módulo>/api/` |
| Claves, consultas y mutaciones | `features/<módulo>/queries/` |
| La forma de los datos | `features/<módulo>/schema/` |
| Una cuenta (total, estado, demora) | `features/<módulo>/rules/`, con su prueba |
| Una pieza propia del módulo | `features/<módulo>/components/` |
| Una pieza que usan dos o más módulos | `components/ui/` |
| Una función común (montos, fechas) | `lib/` |
| Un error y su texto para el dueño | `lib/errors.ts` |
| Un concepto nuevo del negocio | `docs/glossary.md`, antes que en el código |
| Una ayuda para las pruebas | `src/test/` |
| Un precio, un producto o un límite | La base de datos |
| Un color o un tamaño | `theme/` |
| Un cambio en la base de datos | `supabase/migrations/` |

## 11. Infraestructura y costos

Precios consultados el 2026-11-18.

- **Supabase, plan gratis** (región São Paulo): 500 MB de datos y 1 GB de archivos.
  - No hace copias de seguridad.
  - Se pausa tras 7 días sin uso; se reactiva desde su panel sin perder datos.
  - Máximo 2 proyectos gratis activos por cuenta.
  - Plan Pro: US$ 25 al mes, con copias diarias (7 días) y sin pausas.
- **Desarrollo y producción en dos proyectos de Supabase en la nube** (ver §14.1).
- **Copia diaria de la base de datos** desde el VPS (Vultr, Santiago, plan de US$ 24 al mes, el mismo de la web) a un almacenamiento externo, por ejemplo Cloudflare R2 (gratis hasta 10 GB). Restaurarla de verdad al menos una vez. El script anota cada copia en la base (el dueño ve la última en Más) y avisa a un monitor de latidos: si un día falla, el equipo se entera.
- **La APK** se arma con Expo (EAS Build). Las actualizaciones llegan por internet con EAS Update (gratis hasta 1,000 usuarios al mes), en dos canales: prueba y producción. La llave de firma la guarda Expo; tener un respaldo.
- **Google:** desde 2027 exige un desarrollador verificado también para las APK instaladas fuera de Play Store. Hay que registrarse antes.
- **Avisos de errores:** Sentry, plan gratis.
- **Monitor gratis (UptimeRobot):** avisa al equipo si Supabase se pausa o se cae. La app muestra un mensaje claro en vez de una pantalla en blanco.

## 12. Seguridad y datos personales

- **Reglas de acceso (RLS) en todas las tablas:** solo el dueño, con su sesión, lee y escribe. La llave publicable de Supabase (`sb_publishable_…`) va dentro de la APK; la secreta (`sb_secret_…`), nunca. Las llaves anon y service_role no se usan: Supabase las retira a fines de 2026.
- **Permisos cerrados de base:** nada para `anon` ni para `PUBLIC` (incluido el `EXECUTE` que Postgres da por defecto a las funciones). `authenticated` solo lee lo que la app lee y ejecuta solo las funciones de la app. Lo interno vive en el esquema `private`, que la API no expone.
- **Llaves foráneas con el negocio:** la base impide que un dato apunte a otro negocio aunque el código se equivoque.
- **Se escribe solo por funciones de la base** (`security definer`, con su `search_path` fijo y comprobando que el negocio sea del usuario). La app lee con RLS, pero no inserta ni cambia filas directo, así ningún total, número o stock queda mal guardado (`docs/spec/README.md`).
- **Cuentas a nombre de la agencia** (Supabase, Expo, GitHub), con verificación en dos pasos y las contraseñas en un gestor.
- **Acceso (D18):**
  - **Cuenta creada por el equipo:** registro cerrado en Supabase. El equipo da de alta al dueño con su número y un PIN al azar que no sea fácil, y se lo entrega en persona.
  - **El PIN se revisa en el servidor:** una Edge Function lo compara con su hash (bcrypt, con pgcrypto) y, si es correcto, abre la sesión de Supabase y se la entrega a la app. La cuenta lleva un correo interno y una contraseña larga que solo conoce el servidor; el dueño nunca los ve.
  - **Intentos por cuenta, no por celular:** 5 errores seguidos dan 15 minutos de espera; 10 bloquean la cuenta hasta que el equipo la revise. Supabase solo limita por IP, y su número es público: sin este conteo, alguien podría probar los millones de PIN desde internet.
  - **En el celular:** la sesión queda en expo-secure-store (cifrado con el Keystore de Android). Después entra con huella o PIN, revisado en el celular. 5 errores seguidos borran la sesión de ese celular y vuelve a ingresar con su número y su PIN.
  - **Bloqueo automático:** tras 5 minutos con la app en segundo plano pide huella o PIN otra vez (lo cambia en Ajustes).
  - **Cambiar PIN:** desde Ajustes, con el PIN actual; se cambia en el servidor. Se rechazan los fáciles: seguidos (123456), repetidos (111111, 121212, 123123) y el final de su número.
  - **Olvidó su PIN o perdió el celular:** escribe al equipo por WhatsApp (un enlace, sin servicio de mensajes). El equipo cierra sus sesiones desde Supabase y le crea un PIN nuevo.
- **Sin datos personales en los reportes de errores:** Sentry borra teléfonos, nombres y direcciones antes de enviar (`beforeSend`).
- **De los clientes, solo lo necesario** para el pedido (nombre, teléfono, dirección), cuidado como pide la ley de datos personales (Ley 29733).
- **Promociones solo con permiso:** si el dueño va a escribirles con promociones, la app guarda si cada cliente aceptó recibirlas.
- **Los datos son del cliente:** puede exportarlos cuando quiera.

## 13. Calidad

- **Primero la prueba**, como en la web, con las ayudas compartidas de `src/test/`: un render que ya trae TanStack Query y el tema, y datos de ejemplo listos (un pedido, un producto).
- **Antes de cada commit y en GitHub:** lint, tipos y pruebas.
- **Pruebas de las reglas de acceso** en `supabase/tests/`, y recorridos completos en Android en `e2e/`.
- **Revisión contra §10 al cerrar cada módulo.**
- **Probar en un Android económico,** además del celular del equipo: el del cliente puede ser más lento.

## 14. Stack (acordado el 2026-11-18)

Versiones vigentes en npm ese día.

| Parte | Elección | Notas |
|---|---|---|
| App | Expo SDK 58 (React Native 0.88) y TypeScript estricto | Se prueba con Expo Go y se entrega como APK |
| Pantallas | Expo Router | Pantallas por archivos (§9) |
| Datos en la app | TanStack Query 5 | Guarda lo último cargado y reintenta si falla la señal |
| Estilos | NativeWind 4.2.7 (Tailwind 3.4) | Colores y tamaños solo en `theme/`: Tailwind no trae más colores que los del tema y el lint prohíbe los escritos a mano. Oficialmente llega a SDK 57. En SDK 58 (2026-11-19) compila para Android y en la web se ve igual a la maqueta, en claro y en oscuro; las pruebas de Jest no ven los estilos de las clases, así que no cuentan como comprobación. Falta verlo en el celular (`docs/plan/fase-0-proyecto.md`, «Lo que falta»); si ahí fallara, los estilos pasan a `StyleSheet` con el mismo tema |
| Formularios | React Hook Form y Zod 4 | Zod también valida lo que llega de la base de datos |
| Gráficos | react-native-gifted-charts | Barras, líneas y tortas. Usa react-native-svg, que Expo Go ya trae |
| Montos | Céntimos enteros con `lib/money.ts`, sin librería | Lo guardado lo calcula la base; el celular solo suma enteros para la vista previa. Dinero.js 2 se agrega si aparece un reparto o un porcentaje que lo pida |
| Fechas | date-fns 4 y @date-fns/tz, siempre con `lib/dates.ts` | Hora de Lima y en español. En el celular se usa el desfase fijo UTC−5 (Perú no cambia la hora desde 1994): así las fechas no dependen de lo que el motor de JavaScript del celular sepa de zonas horarias. En la base de datos, la zona `America/Lima`. Una prueba avisa si las dos dejaran de coincidir |
| Listas largas | FlashList v2 | Hecha para la nueva arquitectura, la única desde SDK 55 |
| Imágenes | expo-image | Caché de las fotos de los alfajores |
| Memorizar | React Compiler | Activado; sin `useMemo` ni `useCallback` a mano |
| Avisos del celular | expo-notifications | Recordatorios locales (`docs/spec/reminders.md`) |
| Sesión guardada | `LargeSecureStore` (aes-js, SecureStore y AsyncStorage) | El patrón de la guía de Supabase para Expo |
| Letra | Manrope, una sola familia (@expo-google-fonts/manrope) | La misma del texto de la web. Va dentro de la APK: no depende de internet |
| Acceso | Supabase Auth, una Edge Function que revisa el PIN, expo-local-authentication y expo-secure-store | Número y PIN la primera vez en cada celular, con intentos contados en el servidor; después huella o PIN (D18) |
| Fotos de boletas | expo-image-picker y compresión antes de subir | Se guardan en Supabase Storage, privado |
| Exportar | CSV con expo-file-system y expo-sharing | Excel lo abre directamente |
| Errores | Sentry, plan gratis | En Expo Go solo registra errores de JavaScript; completo en la APK |
| Base de datos | Supabase: PostgreSQL con RLS, funciones (todo o nada), vistas para reportes y Edge Functions | Reportes calculados en la base, no en el celular |
| Pruebas | Jest (jest-expo) y Testing Library; pgTAP para la base; Playwright sobre la versión web | En esta PC no hay emulador de Android |
| Calidad | ESLint con las reglas de §10, Prettier, lefthook y GitHub Actions | |
| Entrega | EAS Build (APK) y EAS Update (canales de prueba y producción) | |
| Herramientas | Node 24 y pnpm 10 | Como la web |

Buenas prácticas de rendimiento 2026–2027: `docs/spec/README.md`.

### 14.1 Entornos

- **Desarrollo:** un proyecto de Supabase en la nube, que da el equipo, solo con datos inventados. Los cambios van por migraciones del repositorio, así que se puede reiniciar de cero con un comando.
- **Producción:** un proyecto nuevo y limpio, creado con las mismas migraciones. El de desarrollo sigue para los cambios futuros sin tocar los datos reales del cliente. Esto ocupa los 2 proyectos gratis de la cuenta.
- **Probar en el celular:** Expo Go de la Play Store, en modo túnel desde WSL.
  - Expo Go solo abre proyectos de la versión más reciente de Expo. Cuando salga la 59, hay que actualizar o pasar a una versión de desarrollo de la app.
  - Solo se usan librerías que Expo Go ya trae (todas las de la tabla lo cumplen).
- **Credenciales:** la URL del proyecto y la llave publicable (`sb_publishable_…`) van en `.env.local`. La llave de servicio y la contraseña de la base de datos nunca van en el chat ni en el repositorio: el equipo hace `supabase login` y `supabase link` en su terminal una vez.
- **Pruebas de la base en GitHub Actions:** usan Supabase en Docker allá; en la PC no hace falta Docker.

### 14.2 Datos en la app: TanStack Query

**La base**
- **Consultas definidas una vez:** `queryOptions`, `infiniteQueryOptions` y `mutationOptions` en `features/<módulo>/queries/`, con claves ordenadas (`['orders', 'list', filtros]`, `['orders', 'detail', id]`).
- **Tiempo de vida por tipo de dato (`staleTime`):** catálogo y ajustes, 30 minutos; stock y pedidos de hoy, 30 segundos; reportes, 5 minutos.
- **Celular:** `onlineManager` con expo-network, `focusManager` con AppState, recarga al volver a una pantalla (`useFocusEffect`) y `subscribed: false` en las pantallas que no se ven.
- **Caché guardada en el celular:** `PersistQueryClientProvider` con `createAsyncStoragePersister`, con `buster` y `maxAge`. Por eso el skeleton sale solo la primera vez.
  - Se descarta al cambiar la versión de la app o el número de esquema de la caché (`CACHE_SCHEMA`, en `lib/query.ts`), que sube cada vez que cambia la forma de lo que devuelve una consulta.
  - Solo se guardan las consultas que cargaron bien y cuyo dato tiene menos de un día. Una consulta queda fuera con `meta: { persist: false }`.
  - Lo que se estaba guardando (las mutaciones, con sus datos) nunca se escribe en el celular.

**Respuesta al instante (optimistic) y cuándo no**
- **Al instante, con vuelta atrás si falla:** cambios de estado, pagos, mermas, producción, conteos, editar cantidades, anular e interruptores. Se usa `onMutate` con `setQueryData`, `onError` para volver atrás y `onSettled` para refrescar.
- **Con «Guardando…» y espera:** crear un pedido (el número correlativo lo da la base de datos), un gasto con foto (hay que subirla), cambiar un precio (se copia a la web) y borrar los datos de un cliente (no se puede deshacer).
- **Sin doble guardado:** `isPending` bloquea el botón.
- **Sin señal, guardar falla al momento** y avisa «Sin conexión» (`networkMode: "always"` en las mutaciones). No queda en espera para enviarse solo más tarde: eso es lo que sigue «para después».

**La experiencia**
- **Filtros sin parpadeo:** `placeholderData: keepPreviousData` al cambiar de filtro o de periodo.
- **Detalle al instante:** `initialData` tomado de la lista. Se precarga el detalle al tocarlo (`prefetchQuery` o `usePrefetchQuery`).
- **Cada pantalla, lo suyo:** `select` para sacar solo lo que necesita.
- **Consultas que esperan:** `enabled`, por ejemplo para buscar al cliente cuando el teléfono tiene 9 dígitos.
- **Inicio en paralelo:** `useQueries` con `combine` para el resumen, el stock y los pedidos, con un solo estado de carga.

**La consistencia**
- **Refresco declarado una vez:** cada mutación dice qué refresca (`meta`) y un `MutationCache` global lo hace.
- **Errores en un solo lugar:** `QueryCache` con `onError`, y un solo tipo de error para toda la app (`Register.defaultError`).
- **Reintentos con criterio:** solo ante fallas de red o del servidor, nunca ante errores de permiso o de validación.
- **Sin choques:** las mutaciones sobre el mismo pedido o alfajor van en fila (`scope`).
- **Sin pedidos de red sobrantes:** la señal de cancelación de cada consulta llega a Supabase (`abortSignal`).

**Calidad**
- **Lint de TanStack:** `@tanstack/eslint-plugin-query`, que avisa, por ejemplo, si a una clave le falta un dato.
- **Pruebas:** un `QueryClient` nuevo por prueba, con `retry: false` y el `api.ts` simulado.

**Para después:** mutaciones sin señal que se envían al volver (`resumePausedMutations`), Supabase Realtime con `setQueryData` si hay más usuarios, y un panel de desarrollo (Rozenite o el plugin de Expo). **No se usan** `useSuspenseQuery` ni `HydrationBoundary`, pensados para webs con servidor.

### 14.3 Paginado y cuentas en el backend

- **La base de datos cuenta; el celular muestra.** Totales, conteos de los filtros, reportes, el número correlativo, el stock y los datos del paginado vienen del backend.
- **Listas paginadas:** historial de pedidos, todos los gastos, movimientos de un alfajor, clientes y los pedidos de un cliente. Las listas cortas (pedidos de hoy, productos, stock) llegan completas.
- **Paginado por cursor:** ordenado por fecha e id, con un índice. Es estable aunque entren pedidos nuevos mientras se baja: no repite ni salta filas.
- **El contrato.** Funciones de la base de datos, con las reglas de acceso (RLS) aplicadas, que devuelven:

  ```json
  {
    "items": [{ "id": "…", "number": 46, "customer": "Sofía L.", "status": "new", "totalMinor": 4100 }],
    "meta": { "limit": 20, "total": 148, "hasMore": true, "nextCursor": "MjAyNi0xMS0xOHw0Ng" }
  }
  ```

  - El backend fija el máximo de `limit` (50) y aplica filtros, orden y búsqueda (sin tildes).
  - El cursor es opaco: la app solo lo devuelve tal cual, nunca calcula páginas ni totales.
  - `api.ts` valida la respuesta con Zod, y el tipo `Page<T>` vive en `lib/`.
- **En la app:** `infiniteQueryOptions` con `getNextPageParam: (ultima) => (ultima.meta.hasMore ? ultima.meta.nextCursor : undefined)` y `maxPages`. La lista pide la página siguiente al llegar al final (`onEndReached` de FlashList), con una fila de skeleton mientras carga y «Mostrando 20 de 148».
- **Conteos de los filtros** («Hoy 6», «Por entregar 2»): en una sola llamada al backend.

### 14.4 Diseño de la app (acordado con la maqueta, 2026-11-18)

- **Una sola acción principal por pantalla**, fija abajo cuando la pantalla es larga (en Un pedido: el siguiente estado o, ya entregado, cobrar lo que falta). Lo demás va con borde o como enlace.
- **Lo urgente arriba:** en Inicio, lo agotado o por revisar va primero y cada aviso lleva a resolverlo. Los números del día abren la lista ya filtrada.
- **Cada fila de pedido dice quién, qué y cuánto,** con el estado y lo que falta cobrar. En «Hoy», lo terminado va abajo y más apagado.
- **Tarjetas planas con borde fino;** la sombra queda solo para lo que flota (el botón +, las hojas, los avisos).
- **Modo oscuro según el ajuste del celular** (`useColorScheme`), con los mismos nombres de colores en `theme/` y valores para claro y oscuro.
- **Título grande que se achica al bajar**, vibración corta al guardar o cambiar de estado (expo-haptics) y un consejo la primera vez, sobre el botón +.

## 15. Modelo de cobro (acordado el 2026-11-18)

- **La idea:** una mensualidad que cubra la app, el servidor, el mantenimiento y los cambios a medida que el negocio crece.
- **Costos actuales:** VPS US$ 24 al mes (compartido con otros clientes), Supabase US$ 0 (US$ 25 con el plan Pro) y el dominio S/ 110 al año, a nombre del cliente.
- **Para empezar: S/ 40 al mes,** sin cobro aparte por la primera versión. Cubre servidor, copias y mantenimiento.
- **Por escrito:** qué incluye la mensualidad (arreglos, copias, actualizaciones y hasta unas 2 horas de cambios al mes). Lo grande (un módulo nuevo, VarMar, boletas SUNAT) se cotiza aparte.

## 16. Plan

1. Publicar la web (VPS y dominio).
2. Acordar este documento.
3. Decidir el stack completo.
4. Maqueta de las pantallas (28, en `docs/design/pantallas/`) y aprobación del cliente.
5. Estructura de carpetas final, especificación (`docs/spec/`) y plan de trabajo por fases (`docs/plan/`).
6. **Primera versión, en 9 fases: unos 33 días de trabajo completos, alrededor de 6 semanas y media** (`docs/plan/README.md`). El cálculo anterior era de unas 5 semanas; creció con la idempotencia, el registro de cambios, las devoluciones y las correcciones de pedidos entregados. ← aquí estamos: la fase 0 está construida (2026-11-19) y sigue la fase 1
7. Una o dos semanas de uso real, y ajustes.
8. Fase 2: pedidos de la web. Después, VarMar.

## 17. Pendientes

- **Con el cliente:** los datos de §7.
- **Del equipo:**
  - definir el modelo de cobro;
  - crear las cuentas de la agencia (Supabase, Expo, GitHub);
  - subir los dos repositorios a GitHub en privado (hoy la web solo existe en la PC);
  - preparar la guía de uso para el dueño, con qué hacer si pierde el celular.
- **En la web,** cuando la app maneje precios y disponibilidad de Don Pipos (D13): esos campos del panel pasan a ser de solo lectura, y se actualizan sus documentos (su `CLAUDE.md` §2 dice hoy que se editan en el panel).
