# APP DE GESTIÓN (DON PIPOS, LUEGO VARMAR) — CONTEXTO DEL PROYECTO

> **Estado:** borrador para acordar. Todavía no hay nada construido.
> **Versión:** 0.1 · **Fecha:** 2026-11-18 · **Idioma de la app:** español (Perú).
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
   - Se anotan en segundos: alfajores y cantidades, cliente, canal (WhatsApp, local, web), retiro en el local o delivery con dirección, y medio de pago.
   - Cada pedido queda **pagado** o **por cobrar**.
   - Estados: nuevo → preparando → en camino (delivery) o listo para recoger (local) → entregado. O anulado, con su motivo.
   - **Venta en el mostrador:** se registra de una vez como entregada y pagada, sin pasar por los demás estados.
   - **Pedido con anticipación** (por ejemplo, para un evento): lleva fecha de entrega y aparece en «Próximos».
   - **El stock baja al registrar el pedido,** no al entregarlo, para no vender lo que ya está comprometido. Al anularlo, los alfajores vuelven al stock.
3. **Stock** (de alfajores terminados, ver D3)
   - Lo que se produce suma («+50 Coqueta») y lo que se vende resta solo.
   - Las mermas (rotos, vencidos, regalos) se anotan con su motivo.
   - Aviso cuando queda poco, y para cuántos días alcanza según lo que se vende.
   - Cuando un alfajor llega a cero, la web lo muestra «Agotado»; al reponerlo, se quita solo (ver §8).
4. **Gastos (egresos):** monto, fecha y tipo (insumos, empaques, delivery…), con foto de la boleta si quiere.
5. **Ingresos:** salen solos de los pedidos pagados. Los demás (una venta a un café, un evento) se anotan a mano.
6. **Reportes**
   - Ingresos, gastos y ganancia, por semana y por mes.
   - Ranking de alfajores más vendidos, en unidades y en soles.
   - Ventas por canal.
   - Ganancia por alfajor, si el dueño carga un costo aproximado por alfajor.
   - Exportar a Excel para el contador.
7. **Productos:** un solo catálogo con la web. Puede tener productos que todavía no salen en la web.
8. **Usuario:** uno solo, el dueño, como administrador. Propuesta: entra con correo y contraseña la primera vez y después con su huella.

## 4. Fuera de la primera versión

- Boletas y facturas electrónicas (SUNAT).
- Cobros en línea.
- Leer o responder WhatsApp de forma automática.
- Stock de ingredientes y empaques, con recetas.
- Trabajar sin internet.
- Más usuarios con permisos distintos.
- VarMar (mesas, cocina).
- **Fase 2:** que los pedidos hechos en la web entren solos a la app.

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

Todas tomadas el 2026-11-18.

## 6. Reglas del negocio

- **Stock como movimientos:** producción (+), venta (−), merma (−, con motivo) y ajuste. El stock es la suma de los movimientos, nunca un número que se sobrescribe. Así siempre se sabe por qué hay lo que hay y se corrige sin perder historia.
- **Nada se borra:** un pedido anulado queda anulado, con su fecha, y devuelve su stock.
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
  - si cobra el delivery, cuánto, y su zona de reparto.

## 8. Conexión con la web

- **«Agotado» automático:** cuando un alfajor llega a cero, una función de Supabase marca `isAvailable: false` en Sanity, y la web se refresca con el webhook firmado que ya existe. Al reponer stock, vuelve a `true`. El token de Sanity se guarda como secreto en Supabase, nunca dentro de la app.
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
- **Desarrollo con Supabase en la PC** (Docker); en la nube, solo el proyecto de producción.
- **Copia diaria de la base de datos** desde el VPS (Vultr, Santiago, plan de US$ 24 al mes, el mismo de la web) a un almacenamiento externo, por ejemplo Cloudflare R2 (gratis hasta 10 GB). Restaurarla de verdad al menos una vez.
- **La APK** se arma con Expo (EAS Build). Las actualizaciones llegan por internet con EAS Update (gratis hasta 1,000 usuarios al mes), en dos canales: prueba y producción. La llave de firma la guarda Expo; tener un respaldo.
- **Google:** desde 2027 exige un desarrollador verificado también para las APK instaladas fuera de Play Store. Hay que registrarse antes.
- **Avisos de errores:** Sentry, plan gratis (propuesta).

## 12. Seguridad y datos personales

- **Reglas de acceso (RLS) en todas las tablas:** solo el dueño, con su sesión, lee y escribe. La llave pública de Supabase va dentro de la APK; la llave de servicio, nunca.
- **Cuentas a nombre de la agencia** (Supabase, Expo, GitHub), con verificación en dos pasos y las contraseñas en un gestor.
- **De los clientes, solo lo necesario** para el pedido (nombre, teléfono, dirección), cuidado como pide la ley de datos personales (Ley 29733).
- **Los datos son del cliente:** puede exportarlos cuando quiera.

## 13. Calidad

- **Primero la prueba**, como en la web.
- **Antes de cada commit y en GitHub:** lint, tipos y pruebas.
- **Pruebas de las reglas de acceso** en `supabase/tests/`, y recorridos completos en Android en `e2e/`.
- **Revisión contra §10 al cerrar cada módulo.**

## 14. Stack

- **Decidido:** React Native, Supabase, TanStack Query y TypeScript estricto.
- **Propuesto:** Expo (EAS Build y EAS Update) y Expo Router.
- **Por decidir (siguiente paso):** estilos y tokens de marca, formularios y validación, gráficos, herramientas de prueba (unitarias y recorridos en Android), avisos de errores, gestor de paquetes, versión de Node y versión de Expo.

## 15. Modelo de cobro (por definir)

- **La idea:** una mensualidad que cubra la app, el servidor, el mantenimiento y los cambios a medida que el negocio crece.
- **Costos actuales:** VPS US$ 24 al mes (compartido con otros clientes), Supabase US$ 0 (US$ 25 con el plan Pro) y el dominio S/ 110 al año, a nombre del cliente.
- **Propuesta:** mínimo S/ 40 al mes por servidor, copias y mantenimiento. La primera versión, con un pago inicial o con una mensualidad más alta y un plazo mínimo.
- **Por escrito:** qué incluye la mensualidad (arreglos, copias, actualizaciones y hasta unas 2 horas de cambios al mes). Lo grande (un módulo nuevo, VarMar, boletas SUNAT) se cotiza aparte.

## 16. Plan

1. Publicar la web (VPS y dominio).
2. **Acordar este documento.** ← aquí estamos
3. Decidir el stack completo.
4. Maqueta de las pantallas y aprobación del cliente.
5. Especificación y plan de trabajo.
6. Primera versión: unas 3 a 4 semanas con pruebas y ajustes (cálculo inicial).
7. Una o dos semanas de uso real, y ajustes.
8. Fase 2: pedidos de la web. Después, VarMar.

## 17. Pendientes

- **Con el cliente:** los datos de §7.
- **Del equipo:**
  - definir el modelo de cobro;
  - crear las cuentas de la agencia (Supabase, Expo, GitHub);
  - subir los dos repositorios a GitHub en privado (hoy la web solo existe en la PC).
