# Plan de trabajo

Cómo se construye la app de Don Pipos, por fases. Cada fase deja algo que funciona y que el dueño del proyecto prueba en su celular con Expo Go.

- **Qué se construye:** `docs/spec/` (un archivo por módulo), `docs/PROJECT_CONTEXT.md` (decisiones y reglas) y `docs/glossary.md` (nombres).
- **Cómo se ve:** la maqueta aprobada, en `docs/design/pantallas/`.
- **Cómo se hace:** este plan. Cada fase tiene su archivo detallado, tarea por tarea.

## Cómo se trabaja cada fase

1. **Su plan detallado se escribe justo antes de empezarla,** no todos al inicio. Cada fase usa los nombres y las firmas que dejó la anterior, y lo aprendido en una cambia la siguiente.
2. **Primero la prueba, después el código,** en cada tarea.
3. **Una fase está terminada cuando:**
   - `pnpm lint`, `pnpm lint:rules`, `pnpm typecheck` y `pnpm test` pasan;
   - desde la fase 1, también pasan las pruebas de la base y el medidor de rendimiento;
   - se probó en el celular lo que dice la columna «Qué pruebas tú»;
   - si algo cambió respecto de la especificación, la especificación se actualizó primero;
   - está en commits chicos, uno por tarea.

## Las fases

| Fase | Qué se construye | Qué pruebas tú en el celular | Especificación | Días |
|---|---|---|---|---|
| **0. El proyecto** ([plan](fase-0-proyecto.md)) | Expo 58 con la estructura de carpetas, las reglas de lint probadas, el tema claro y oscuro, lo común de `lib`, el generador de módulos, los commits vigilados y el CI | La app abre con el logo y la letra, y cambia a oscuro con el celular | `PROJECT_CONTEXT.md` §9, §10 y §14 | 2 |
| **1. Los cimientos de la base** | Permisos cerrados, esquema `private`, tipos reutilizables, columnas y trigger comunes, idempotencia, registro de cambios, negocio y ajustes, pruebas de la base, medidor de rendimiento y tipos generados | Nada en pantalla: las pruebas de la base salen en verde con un comando | `spec/README.md`, `businesses.md` | 3 |
| **2. El acceso** ([plan](fase-2-acceso.md)) | PIN revisado en el servidor con los intentos contados, huella, bloqueo, sesión cifrada, variables de entorno revisadas al arrancar, las pestañas vacías y Más → Cuenta. La APK y Sentry pasan a la entrega (decidido el 2026-11-19) | Ingresar con el número y el PIN de prueba, entrar con la huella, el bloqueo al volver y cambiar el PIN | `auth.md` | 4 |
| **3. Productos y stock** ([plan](fase-3-productos-stock.md)) | Productos y precios, stock, producción, merma, conteo y «Un alfajor». La sugerencia pasa a la fase 4: sale de las ventas de los pedidos | Cambiar un precio, registrar una producción y deshacerla, anotar una merma y contar | `products.md`, `stock.md` | 4 |
| **4. Pedidos**, en dos partes: 4a «anotar y entregar» ([plan](fase-4a-pedidos.md)) y 4b «corregir y cobrar» ([plan](fase-4b-pedidos.md)) | Pedidos, pagos y devoluciones, venta de mostrador, demorados y por cobrar. Clientes por teléfono y mensajes por defecto. La sugerencia de producción, «alcanza hasta» y «Cómo se vende» | Anotar un pedido de punta a punta, vender en el mostrador, cobrar, anular y cambiar un medio de pago; ver la producción sugerida | `orders.md`, `customers.md` (registro), `messages.md` (por defecto), `stock.md` (sugerencia) | 8 |
| **5. Gastos, ingresos y caja** ([plan](fase-5-gastos-caja.md)) | Gastos con foto, ingresos a mano y cuadre de caja | Anotar un gasto con su boleta y cuadrar la caja del día | `expenses.md`, `income.md`, `cash.md` | 3 |
| **6. Inicio y reportes** ([plan](fase-6-inicio-reportes.md)) | Inicio con lo urgente, reportes, más vendidos y exportar a Excel | Ver cómo va el día y el mes, y exportar | `reports.md` | 3 |
| **7. Clientes, fidelidad y primera vez**, en dos partes: 7a «clientes, fidelidad y mensajes» ([plan](fase-7a-clientes-fidelidad.md)) y 7b «primera vez, avisos y ajustes» | 7a: Clientes y la ficha del cliente, «no vuelven», la tarjeta de sellos con su premio y editar los mensajes. 7b: la puesta en marcha y el consejo de la primera vez, los recordatorios del celular, las hojas de ajustes de Más y la campana de Inicio | El recorrido completo de un dueño nuevo, la tarjeta de sellos y un aviso del celular | `customers.md`, `loyalty.md`, `messages.md`, `reminders.md`, `businesses.md` (puesta en marcha y ajustes) | 4 |
| **8. Web y entrega** | Copia de precios y «Agotado» a la web, copia de seguridad y su estado, proyecto de producción, APK final con actualizaciones y guía de uso | Cambiar un precio y verlo en la web; instalar la APK final | `products.md` (envío a la web), `businesses.md` (copia de seguridad) | 3 |

**Total: unos 34 días de trabajo completos, alrededor de 7 semanas.** Es más que el cálculo anterior (unas 5 semanas) porque la especificación creció: idempotencia, registro de cambios, devoluciones, el día de cada pedido, todos los «Deshacer» y las correcciones de pedidos entregados.

## Por qué en este orden

- **Las reglas antes que las pantallas (fase 0).** Así el orden lo hace cumplir el lint desde el primer archivo.
- **La base se construye por módulo, no toda al inicio.** La fase 1 deja solo lo común; después, cada fase trae sus tablas, sus funciones, sus pruebas y sus pantallas juntas. Por eso todas terminan en algo que se puede probar.
- **El acceso va primero** porque todo lo demás lee datos con la sesión del dueño.
- **Los pedidos necesitan productos, stock, clientes y mensajes.** Por eso van después de la fase 3, y traen consigo el registro de clientes y los mensajes por defecto.
- **La puesta en marcha va en la fase 7** porque usa productos, stock y tipos de gasto, que recién existen juntos después de la fase 5. Hasta entonces, el negocio de desarrollo se carga con un script.

## Riesgos que se enfrentan temprano

| Riesgo | Dónde se resuelve | Si falla |
|---|---|---|
| NativeWind 4 en Expo 58 (oficialmente llega a SDK 57) | Fase 0, tarea 3, con un criterio escrito. En Expo Go se ve bien (2026-11-19); falta mirar el modo oscuro | Estilos con `StyleSheet` y el tema; no cambia nada más |
| ESLint: Expo 58 solo admite la versión 9, que ya no recibe soporte | Fase 0, tarea 2. Las reglas ya se probaron con ESLint 9.39 | Se sube a la 10 cuando Expo la admita |
| Los esquemas declarativos de Supabase están en alfa y necesitan una base local | Fase 1: no hay Docker, así que se aplicó el plan B | Migraciones escritas a mano, ordenadas por módulo, y probadas antes de enviarse |
| Que la APK compile | La entrega (fase 8). Hasta entonces la app usa solo librerías que Expo Go ya trae, así compilar la APK no da sorpresas | Se corrige antes de entregarla al cliente |
| Abrir la sesión desde el servidor con el PIN | Fase 2, primera tarea | Se ajusta el diseño de `auth.md` antes de construir lo demás |
| Rendimiento con años de datos | Desde la fase 1: el medidor corre en cada fase | Se agrega el índice que falte, y la prueba lo confirma |

## Lo que hace falta de tu parte

| Antes de | Qué | Para qué |
|---|---|---|
| Fase 0 | Nada. Opcional: crear el repositorio privado en GitHub | Con el repositorio, el CI empieza a correr |
| Fase 0, tarea 7 (**postergado por ti el 2026-11-19**, hasta que digas) | Instalar gitleaks en tu máquina y activar los hooks: los dos comandos están en `fase-0-proyecto.md`, «Lo que falta» | Bloquear llaves y secretos, y revisar cada commit antes de que entre |
| Fase 0, tarea 8 (**casi hecho**, 2026-11-19: faltan el modo oscuro y la letra grande) | Abrir la app en tu celular con Expo Go y mirar cinco cosas (`fase-0-proyecto.md`, «Lo que falta») | Confirmar los estilos y las fechas en un Android de verdad |
| Fase 1 (**hecho**, 2026-11-19) | Un proyecto de Supabase para desarrollo, su sesión de la CLI, y la llave publicable y la contraseña de la base en `.env.local` | La base de desarrollo |
| Fase 1 (**resuelto**: sin Docker por ahora) | Decidir si se instala Docker dentro de WSL. Sin Docker, las migraciones se escriben a mano y las pruebas corren contra el proyecto de desarrollo; si un día se activa, las mismas pruebas sirven, pero el corredor necesita conectarse a la base local en vez de la de desarrollo | Cómo se trabaja la base |
| Fase 2 (**hecho**, 2026-11-19) | La llave secreta de Supabase en tu `.env.local` (nunca en el chat), el permiso para subir funciones y cerrar el registro, y el WhatsApp del equipo | Los scripts que crean al dueño y su PIN, y los botones de «Olvidé mi PIN» |
| Fase 8 | Una cuenta de Expo (o las herramientas de Android en tu PC) y una de Sentry | La APK que se le entrega al cliente y ver sus errores |
| Fase 7 | Los datos del cliente (§7 de `PROJECT_CONTEXT.md`) | La puesta en marcha real |
| Fase 8 | Un token de Sanity con permiso de escritura, el VPS, el proyecto de Supabase de producción y la verificación de desarrollador de Google | Copia a la web, copias de seguridad y la APK final |

## Estado

| Fase | Estado |
|---|---|
| 0. El proyecto | Construida y revisada el 2026-11-19, en la rama `fase-0`; las correcciones de la revisión final están en `fase-0-proyecto.md`, «Después de la revisión final». En el celular, junto con la fase 2 (2026-11-19), se vieron los estilos, la letra y la fecha; quedan por mirar el modo oscuro y la letra grande. Gitleaks y los hooks quedaron postergados por el dueño del proyecto hasta antes de la fase 2 |
| 1. Los cimientos de la base | Construida y revisada el 2026-11-19, en la rama `fase-1`; las correcciones están en `fase-1-base.md`, «Después de la revisión final». Las pruebas de la base salen en verde con `pnpm db:check` |
| 2. El acceso | Construida y revisada el 2026-11-19, en la rama `fase-2`; las correcciones están en `fase-2-acceso.md`, «Después de la revisión final». Probada en tu celular el 2026-11-19. Tu decisión sobre el bloqueo con 10 intentos queda para antes de producción (fase 8) |
| 3. Productos y stock | Construida, revisada y juntada en `main` el 2026-11-19; las correcciones están en `fase-3-productos-stock.md`, «Después de la revisión final». Falta tu prueba en el celular («Lo que falta») |
| 4a. Pedidos: anotar y entregar | Construida, revisada y juntada en `main` el 2026-11-19; las correcciones están en `fase-4a-pedidos.md`, «Después de la revisión final». Falta tu prueba en el celular («Lo que falta») |
| 4b. Pedidos: corregir y cobrar | Construida, revisada y juntada en `main` el 2026-11-20; las correcciones están en `fase-4b-pedidos.md`, «Después de la revisión final». Falta tu prueba en el celular («Lo que falta») |
| 5. Gastos, ingresos y caja | Construida, revisada y juntada en `main` el 2026-11-20; las correcciones están en `fase-5-gastos-caja.md`, «Después de la revisión final». Falta tu prueba en el celular («Lo que falta») |
| 6. Inicio y reportes | Construida, revisada y juntada en `main` el 2026-11-20; las correcciones están en `fase-6-inicio-reportes.md`, «Después de la revisión final». Falta tu prueba en el celular («Lo que falta») |
| 7a. Clientes, fidelidad y mensajes | Construida, revisada y juntada en `main` el 2026-11-20; las correcciones están en `fase-7a-clientes-fidelidad.md`, «Después de la revisión final». Falta tu prueba en el celular («Lo que falta») |
| 7b y 8 | Su plan se escribe al terminar la fase anterior |

Las fases 0, 1 y 2 se juntaron en `main` el 2026-11-19, con todas sus pruebas en verde.
