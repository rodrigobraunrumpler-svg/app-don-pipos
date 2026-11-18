# APP DE GESTIÓN (DON PIPOS, LUEGO VARMAR) — CONTEXTO DEL PROYECTO

> **Estado:** borrador para acordar. Todavía no hay nada construido.
> **Versión:** 0.2 · **Fecha:** 2026-11-18 · **Idioma de la app:** español (Perú).
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

1. **Inicio:** lo vendido hoy, cuántos pedidos van, qué alfajor se está acabando y cuánto entró por cada medio de pago.
2. **Pedidos**
   - Se anotan en segundos: botones + y − por alfajor, el cliente se completa solo al escribir su teléfono, canal (WhatsApp, local, web), retiro en el local o delivery con dirección, y un medio de pago marcado por defecto.
   - Cada pedido lleva un **número corto y correlativo** (#0001), para hablar con el cliente por WhatsApp.
   - **Descuento o precio especial,** con su motivo, para que lo registrado sea igual a lo cobrado.
   - **Pagos:** cada pago con su monto, medio y fecha. Admite adelanto y saldo (pedidos para eventos) y pagos mixtos (mitad Yape, mitad efectivo). El pedido queda **pagado** cuando los pagos cubren el total; si no, queda **por cobrar**, con lo que falta.
   - **Borrador que no se pierde:** si se corta la señal o se cierra la app, el pedido a medio llenar queda guardado.
   - **Mensajes de WhatsApp con un toque** (D17): confirmación con el número y el total, «tu pedido va en camino» y recordatorio de cobro con lo que falta. Se abre el WhatsApp del dueño en el chat del cliente con el texto listo, y él lo envía. Los textos se editan en Ajustes.
   - Estados: nuevo → preparando → en camino (delivery) o listo para recoger (local) → entregado. O anulado, con su motivo.
   - **Venta en el mostrador:** se registra de una vez como entregada y pagada, sin pasar por los demás estados.
   - **Pedido con anticipación** (por ejemplo, para un evento): lleva fecha de entrega y aparece en «Próximos».
   - **El stock baja al registrar el pedido,** no al entregarlo, para no vender lo que ya está comprometido. Al anularlo, los alfajores vuelven al stock.
3. **Stock** (de alfajores terminados, ver D3)
   - Lo que se produce suma («+50 Coqueta») y lo que se vende resta solo.
   - Las mermas (rotos, vencidos, regalos) se anotan con su motivo.
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
8. **Usuario:** uno solo, el dueño, como administrador. Entra con correo y contraseña la primera vez y después con su huella. Si pierde el celular, al cambiar su contraseña se cierra la sesión en todos lados.
9. **Ajustes:** productos y precios, tipos de gasto, medios de pago, stock mínimo, costo del delivery, cada cuántos días produce, cuántos días dura cada alfajor, los textos de los mensajes de WhatsApp y un botón de soporte con el WhatsApp de la agencia.
10. **Sin señal:** lo ya cargado se sigue viendo, con un aviso claro de que no hay conexión, y nada a medio llenar se pierde. Trabajar del todo sin internet sigue para después (§4).
11. **Clientes**
    - Se registran solos al anotar un pedido, por su teléfono: nombre, direcciones y una nota.
    - Ficha de cada cliente: cuántos pedidos hizo, cuánto gastó, cuándo fue el último y su historial.
    - Clientes que no vuelven: los que no piden hace más de 30 días (se cambia en Ajustes), para escribirles.
    - La venta en el mostrador puede ir sin nombre, como «cliente de mostrador», para no frenar la venta.
12. **Fidelidad**
    - Tarjeta de sellos digital: cada compra suma. Al llegar a la meta, la app avisa y el premio se aplica como descuento con el motivo «fidelidad».
    - La meta y el premio los decide el dueño en Ajustes. Queda apagada hasta que los defina.

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
  - cierre de caja diario (contar el efectivo y ver la diferencia con lo registrado);
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

Todas tomadas el 2026-11-18.

## 6. Reglas del negocio

- **Stock como movimientos:** producción (+), venta (−), merma (−, con motivo) y ajuste. El stock es la suma de los movimientos, nunca un número que se sobrescribe. Así siempre se sabe por qué hay lo que hay y se corrige sin perder historia.
- **Nada se borra:** un pedido anulado queda anulado, con su fecha, y devuelve su stock.
- **Pagos como movimientos** (D10) y **precio congelado** en cada línea del pedido (D9).
- **Descuentos:** el cliente los hace (confirmado el 2026-11-18). Van por pedido, con su motivo.
- **Número de pedido** corto y correlativo, por negocio.
- **Clientes:** uno por teléfono en cada negocio (D14). El premio de fidelidad se aplica como descuento con el motivo «fidelidad» (D15).
- **Qué cuenta cada reporte:** ingresos por fecha de pago; ventas y ranking por fecha de entrega (D11).
- **Sugerencia de producción** (D16), por alfajor:
  - venta esperada de los próximos días: el promedio de cada día de la semana en las últimas 4 semanas (el sábado se compara con los sábados);
  - más el stock mínimo, menos el stock actual, redondeado hacia arriba;
  - nunca más de lo que se puede vender antes de que el alfajor deje de estar bueno (los días que dura, en Ajustes);
  - sin historial de ventas, todavía no sugiere.
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
  - cada cuántos días produce y cuántos días dura cada alfajor;
  - si quiere la fidelidad, con qué meta y qué premio. Pregunta lista para enviar: «¿Quieres premiar a tus clientes frecuentes? Por ejemplo, por cada 10 alfajores, 1 gratis. ¿Qué premio darías y cada cuánto?».

## 8. Conexión con la web

- **Precios y disponibilidad salen de la app (D13):** una función de Supabase copia a Sanity el precio (`priceMinor`) y la disponibilidad (`isAvailable`), y la web se refresca con el webhook firmado que ya existe. Fotos y descripciones siguen en el panel de la web.
- **«Agotado» automático:** cuando un alfajor llega a cero, esa función marca `isAvailable: false`; al reponer stock, vuelve a `true`.
- **El token de Sanity** se guarda como secreto en Supabase, nunca dentro de la app.
- **Fase 2:** los pedidos hechos en la web entran solos a la app.

## 9. Estructura de carpetas (acordada)

```
app/
├── src/
│   ├── app/                       Pantallas (Expo Router). Solo arman la pantalla
│   │   ├── _layout.tsx            Sesión, TanStack Query y colores para toda la app
│   │   ├── (auth)/sign-in.tsx     Ingresar
│   │   └── (main)/                Todo lo que pide sesión
│   │       ├── _layout.tsx        Pestañas de abajo
│   │       ├── index.tsx          Inicio: el resumen del día
│   │       ├── orders/            index · new · [id]
│   │       ├── stock/             index · production
│   │       ├── expenses/          index · new
│   │       ├── reports/           index
│   │       └── settings/          index · products
│   ├── features/                  Un módulo por tema del negocio
│   │   ├── orders/
│   │   │   ├── api.ts             Lo único que habla con Supabase
│   │   │   ├── queries.ts         Consultas de TanStack Query y sus claves
│   │   │   ├── schema.ts          Validación y tipos del módulo
│   │   │   ├── rules.ts           Cuentas puras: totales, estados
│   │   │   ├── rules.test.ts
│   │   │   ├── components/        Piezas propias del módulo
│   │   │   └── index.ts           Lo que otros módulos pueden usar
│   │   ├── stock/  expenses/  income/  reports/  products/
│   │   ├── businesses/            Negocio activo y qué módulos usa cada uno
│   │   └── auth/                  Sesión y huella
│   ├── components/ui/             Piezas comunes, sin nada del negocio
│   ├── lib/                       supabase · money (céntimos) · dates (hora de Lima)
│   ├── theme/                     Colores y letras de cada marca
│   └── types/database.ts          Generado desde Supabase; no se edita a mano
├── supabase/
│   ├── migrations/                Cada cambio de la base de datos, en orden
│   ├── tests/                     Pruebas de las reglas de acceso
│   ├── functions/                 Tareas en el servidor (avisar «Agotado» a la web)
│   ├── seed.sql                   Datos de prueba, solo para desarrollar
│   └── config.toml
├── e2e/                           Recorridos completos en Android
├── assets/                        Ícono, pantalla de carga, fuentes
├── scripts/                       Copia de seguridad diaria y similares
├── docs/                          Este documento, especificación y decisiones
├── app.config.ts                  Nombre, ícono y pe.varmar.app
├── eas.json                       Cómo se arma la APK y sus canales de actualización
├── .env.example                   Variables, sin secretos
├── CLAUDE.md                      Las reglas de esta estructura
└── package.json
```

**Cómo crece sin rehacer nada**
- **Un módulo nuevo,** como las mesas de VarMar: una carpeta en `features/` y sus pantallas.
- **Un negocio nuevo:** un registro en la base de datos y la lista de módulos que usa.
- **Un cliente nuevo:** sus datos separados por las reglas de Supabase, y su nombre y su ícono en `app.config.ts`.
- **Un panel web, si algún día hace falta:** lo común pasa a paquetes compartidos, sin tocar los módulos.

## 10. Reglas del código

### 10.1 Las reglas

1. **Pantallas delgadas:** cada pantalla pide los datos a su módulo y los muestra. No hace consultas ni cuentas.
2. **Un solo punto de contacto con Supabase:** el `api.ts` de cada módulo.
3. **Módulos que no se pisan:** un módulo usa otro solo a través de su `index.ts`, nunca por dentro.
4. **Lo común no sabe del negocio:** `components/ui` y `lib` sirven para cualquier módulo y no importan de ninguno.
5. **Cuentas probadas:** totales, stock y días que alcanza van en archivos sin pantalla, con sus pruebas.
6. **Base de datos con migraciones:** la base de datos solo cambia con migraciones, y los tipos se generan a partir de ella.
7. **Cada dato con su negocio:** las reglas de acceso filtran por negocio.
8. **Montos y fechas centralizados:** céntimos y hora de Lima, siempre con las funciones de `lib`.
9. **Idioma:** el código en inglés; los textos que ve el dueño, en español.
10. **Sin librerías de más:** TanStack Query para los datos y el estado propio de React para lo demás.
11. **Lo que se repite sube:** cuando algo se usa en dos módulos, pasa a `components/ui` o a `lib`.
12. **Módulos con la misma forma:** un comando crea el módulo nuevo con su plantilla.

### 10.2 Cómo se hacen cumplir solas

- **Lint de estructura:** falla si una pantalla habla directo con Supabase, si un módulo entra en otro por dentro, si `components/ui` o `lib` importan de un módulo, o si hay importaciones en círculo.
- **Lint contra valores sueltos:** falla si aparece un color escrito a mano fuera de `theme/`.
- **TypeScript estricto.**
- **Antes de cada commit y en GitHub:** lint, tipos y pruebas. Si algo falla, el cambio no entra.

### 10.3 Dónde va cada cosa

| Si es… | Va en… |
|---|---|
| Una pantalla | `src/app/`, y solo arma la pantalla |
| Hablar con Supabase | `features/<módulo>/api.ts` |
| Una cuenta (total, stock) | `features/<módulo>/rules.ts`, con su prueba |
| Una pieza que usan dos o más módulos | `components/ui/` |
| Una función común (montos, fechas) | `lib/` |
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
- **Copia diaria de la base de datos** desde el VPS (Vultr, Santiago, plan de US$ 24 al mes, el mismo de la web) a un almacenamiento externo, por ejemplo Cloudflare R2 (gratis hasta 10 GB). Restaurarla de verdad al menos una vez.
- **La APK** se arma con Expo (EAS Build). Las actualizaciones llegan por internet con EAS Update (gratis hasta 1,000 usuarios al mes), en dos canales: prueba y producción. La llave de firma la guarda Expo; tener un respaldo.
- **Google:** desde 2027 exige un desarrollador verificado también para las APK instaladas fuera de Play Store. Hay que registrarse antes.
- **Avisos de errores:** Sentry, plan gratis.
- **Monitor gratis (UptimeRobot):** avisa al equipo si Supabase se pausa o se cae. La app muestra un mensaje claro en vez de una pantalla en blanco.

## 12. Seguridad y datos personales

- **Reglas de acceso (RLS) en todas las tablas:** solo el dueño, con su sesión, lee y escribe. La llave pública de Supabase va dentro de la APK; la llave de servicio, nunca.
- **Cuentas a nombre de la agencia** (Supabase, Expo, GitHub), con verificación en dos pasos y las contraseñas en un gestor.
- **De los clientes, solo lo necesario** para el pedido (nombre, teléfono, dirección), cuidado como pide la ley de datos personales (Ley 29733).
- **Promociones solo con permiso:** si el dueño va a escribirles con promociones, la app guarda si cada cliente aceptó recibirlas.
- **Los datos son del cliente:** puede exportarlos cuando quiera.

## 13. Calidad

- **Primero la prueba**, como en la web.
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
| Estilos | NativeWind 4 (Tailwind v3) | Colores y tamaños solo en `theme/`; el lint prohíbe `bg-[#…]`. Oficialmente llega a SDK 57: se comprueba en SDK 58 al crear el proyecto |
| Formularios | React Hook Form y Zod 4 | Zod también valida lo que llega de la base de datos |
| Gráficos | react-native-gifted-charts | Barras, líneas y tortas. Usa react-native-svg, que Expo Go ya trae |
| Montos | Dinero.js 2 | Céntimos enteros; el sol (PEN) viene incluido |
| Fechas | date-fns 4 y @date-fns/tz | Siempre en `America/Lima` (Perú, UTC−5 todo el año) y en español |
| Sesión y huella | Supabase Auth, expo-local-authentication y expo-secure-store | Correo y contraseña la primera vez, después la huella |
| Fotos de boletas | expo-image-picker y compresión antes de subir | Se guardan en Supabase Storage, privado |
| Exportar | CSV con expo-file-system y expo-sharing | Excel lo abre directamente |
| Errores | Sentry, plan gratis | En Expo Go solo registra errores de JavaScript; completo en la APK |
| Base de datos | Supabase: PostgreSQL con RLS, funciones (todo o nada), vistas para reportes y Edge Functions | Reportes calculados en la base, no en el celular |
| Pruebas | Jest (jest-expo) y Testing Library; pgTAP para la base; Playwright sobre la versión web | En esta PC no hay emulador de Android |
| Calidad | ESLint con las reglas de §10, Prettier, lefthook y GitHub Actions | |
| Entrega | EAS Build (APK) y EAS Update (canales de prueba y producción) | |
| Herramientas | Node 24 y pnpm 10 | Como la web |

### 14.1 Entornos

- **Desarrollo:** un proyecto de Supabase en la nube, que da el equipo, solo con datos inventados. Los cambios van por migraciones del repositorio, así que se puede reiniciar de cero con un comando.
- **Producción:** un proyecto nuevo y limpio, creado con las mismas migraciones. El de desarrollo sigue para los cambios futuros sin tocar los datos reales del cliente. Esto ocupa los 2 proyectos gratis de la cuenta.
- **Probar en el celular:** Expo Go de la Play Store, en modo túnel desde WSL.
  - Expo Go solo abre proyectos de la versión más reciente de Expo. Cuando salga la 59, hay que actualizar o pasar a una versión de desarrollo de la app.
  - Solo se usan librerías que Expo Go ya trae (todas las de la tabla lo cumplen).
- **Credenciales:** la URL del proyecto y la llave pública van en `.env.local`. La llave de servicio y la contraseña de la base de datos nunca van en el chat ni en el repositorio: el equipo hace `supabase login` y `supabase link` en su terminal una vez.
- **Pruebas de la base en GitHub Actions:** usan Supabase en Docker allá; en la PC no hace falta Docker.

## 15. Modelo de cobro (por definir)

- **La idea:** una mensualidad que cubra la app, el servidor, el mantenimiento y los cambios a medida que el negocio crece.
- **Costos actuales:** VPS US$ 24 al mes (compartido con otros clientes), Supabase US$ 0 (US$ 25 con el plan Pro) y el dominio S/ 110 al año, a nombre del cliente.
- **Propuesta:** mínimo S/ 40 al mes por servidor, copias y mantenimiento. La primera versión, con un pago inicial o con una mensualidad más alta y un plazo mínimo.
- **Por escrito:** qué incluye la mensualidad (arreglos, copias, actualizaciones y hasta unas 2 horas de cambios al mes). Lo grande (un módulo nuevo, VarMar, boletas SUNAT) se cotiza aparte.

## 16. Plan

1. Publicar la web (VPS y dominio).
2. Acordar este documento.
3. Decidir el stack completo.
4. **Maqueta de las pantallas y aprobación del cliente.** ← aquí estamos
5. Especificación y plan de trabajo.
6. Primera versión: unas 4 a 5 semanas con pruebas y ajustes (cálculo inicial; eran 3 a 4 antes de sumar clientes y fidelidad).
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
