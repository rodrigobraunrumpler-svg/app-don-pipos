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
| **2. El acceso** | PIN revisado en el servidor, huella, bloqueo, sesión cifrada, variables de entorno revisadas al arrancar, las pestañas vacías y Más → Cuenta. Sentry sin datos personales y la primera APK de prueba | Ingresar con tu número y tu PIN, entrar con la huella, el bloqueo a los 5 minutos e instalar la APK | `auth.md` | 4 |
| **3. Productos y stock** | Productos y precios, stock, producción, merma, conteo, sugerencia y «Un alfajor» | Cambiar un precio, registrar la producción sugerida, anotar una merma y contar | `products.md`, `stock.md` | 4 |
| **4. Pedidos** | Pedidos, pagos y devoluciones, venta de mostrador, demorados y por cobrar. Clientes por teléfono y mensajes por defecto | Anotar un pedido de punta a punta, vender en el mostrador, cobrar, anular y cambiar un medio de pago | `orders.md`, `customers.md` (registro), `messages.md` (por defecto) | 7 |
| **5. Gastos, ingresos y caja** | Gastos con foto, ingresos a mano y cuadre de caja | Anotar un gasto con su boleta y cuadrar la caja del día | `expenses.md`, `income.md`, `cash.md` | 3 |
| **6. Inicio y reportes** | Inicio con lo urgente, reportes, más vendidos y exportar a Excel | Ver cómo va el día y el mes, y exportar | `reports.md` | 3 |
| **7. Clientes, fidelidad y primera vez** | Ficha del cliente y «no vuelven», fidelidad, editar mensajes, recordatorios, puesta en marcha y el consejo de la primera vez | El recorrido completo de un dueño nuevo, la tarjeta de sellos y un aviso del celular | `customers.md`, `loyalty.md`, `messages.md`, `reminders.md`, `businesses.md` (puesta en marcha) | 4 |
| **8. Web y entrega** | Copia de precios y «Agotado» a la web, copia de seguridad y su estado, proyecto de producción, APK final con actualizaciones y guía de uso | Cambiar un precio y verlo en la web; instalar la APK final | `products.md` (envío a la web), `businesses.md` (copia de seguridad) | 3 |

**Total: unos 33 días de trabajo completos, alrededor de 6 semanas y media.** Es más que el cálculo anterior (unas 5 semanas) porque la especificación creció: idempotencia, registro de cambios, devoluciones, el día de cada pedido, todos los «Deshacer» y las correcciones de pedidos entregados.

## Por qué en este orden

- **Las reglas antes que las pantallas (fase 0).** Así el orden lo hace cumplir el lint desde el primer archivo.
- **La base se construye por módulo, no toda al inicio.** La fase 1 deja solo lo común; después, cada fase trae sus tablas, sus funciones, sus pruebas y sus pantallas juntas. Por eso todas terminan en algo que se puede probar.
- **El acceso va primero** porque todo lo demás lee datos con la sesión del dueño.
- **Los pedidos necesitan productos, stock, clientes y mensajes.** Por eso van después de la fase 3, y traen consigo el registro de clientes y los mensajes por defecto.
- **La puesta en marcha va en la fase 7** porque usa productos, stock y tipos de gasto, que recién existen juntos después de la fase 5. Hasta entonces, el negocio de desarrollo se carga con un script.

## Riesgos que se enfrentan temprano

| Riesgo | Dónde se resuelve | Si falla |
|---|---|---|
| NativeWind 4 en Expo 58 (oficialmente llega a SDK 57) | Fase 0, tarea 3, con un criterio escrito | Estilos con `StyleSheet` y el tema; no cambia nada más |
| ESLint: Expo 58 solo admite la versión 9, que ya no recibe soporte | Fase 0, tarea 2. Las reglas ya se probaron con ESLint 9.39 | Se sube a la 10 cuando Expo la admita |
| Los esquemas declarativos de Supabase están en alfa y necesitan una base local | Antes de la fase 1 (ver «Lo que hace falta de tu parte») | Migraciones escritas a mano, ordenadas por módulo |
| Que la APK compile | Fase 2, al final: primera APK de prueba | Se corrige con el acceso recién hecho, no al final del proyecto |
| Abrir la sesión desde el servidor con el PIN | Fase 2, primera tarea | Se ajusta el diseño de `auth.md` antes de construir lo demás |
| Rendimiento con años de datos | Desde la fase 1: el medidor corre en cada fase | Se agrega el índice que falte, y la prueba lo confirma |

## Lo que hace falta de tu parte

| Antes de | Qué | Para qué |
|---|---|---|
| Fase 0 | Nada. Opcional: crear el repositorio privado en GitHub | Con el repositorio, el CI empieza a correr |
| Fase 0, tarea 7 | Instalar gitleaks en tu máquina (el plan trae el comando) | Bloquear llaves y secretos antes de cada commit |
| Fase 1 | Un proyecto de Supabase para desarrollo; `supabase login` y `supabase link` en tu terminal; la URL y la llave publicable en `.env.local` | La base de desarrollo |
| Fase 1 | **Decidir: ¿instalamos Docker Engine dentro de WSL?** Es gratis y no usa Docker Desktop. Con Docker, las pruebas de la base y los esquemas por módulo corren en tu máquina sin tocar la nube. Sin Docker, las migraciones se escriben a mano y las pruebas corren contra el proyecto de desarrollo | Cómo se trabaja la base |
| Fase 2 | Una cuenta de Expo; la llave secreta de Supabase en tu `.env.local` (nunca en el chat) | La primera APK y los scripts que crean al dueño y su PIN |
| Fase 7 | Los datos del cliente (§7 de `PROJECT_CONTEXT.md`) | La puesta en marcha real |
| Fase 8 | Un token de Sanity con permiso de escritura, el VPS, el proyecto de Supabase de producción y la verificación de desarrollador de Google | Copia a la web, copias de seguridad y la APK final |

## Estado

| Fase | Estado |
|---|---|
| 0. El proyecto | Plan listo; sin empezar |
| 1 a 8 | Su plan se escribe al terminar la fase anterior |
