# Inicio y reportes (`features/reports`)

## 1. Qué resuelve

Saber cómo va el día y el negocio sin sacar cuentas. Todo se calcula en la base (§14.3):
- lo cobrado hoy, lo urgente y lo que falta entregar;
- ingresos, gastos y ganancia por semana o por mes, comparados con el periodo anterior;
- los alfajores más vendidos;
- exportar a Excel.

**Pantallas de la maqueta que cubre:**
- Inicio, en todas sus vistas, incluida «Primera vez».
- Reportes y Más vendidos.
- Exportar a Excel, dentro de Reportes, debajo del periodo.
- Desde la fase 7c, Reportes es una pestaña (la última de la barra de abajo, en el lugar de Más), sin «Volver». Sus tarjetas «Ingresos» y «Gastos» abren su lista (`income.md`, `expenses.md`).

## 2. Datos

No tiene tablas propias. Lee pagos, ingresos, gastos, pedidos y stock con los índices de cada módulo.

## 3. Funciones de la base

- **`home_summary()`,** en una sola consulta:
  - lo cobrado hoy, por medio de pago;
  - los entregados hoy y los que faltan entregar: los de hoy y los atrasados, por `due_date`, con el mismo número que el filtro «Por entregar»;
  - el total por cobrar;
  - si el cuadre de hoy ya se cerró.

  Las listas de Inicio salen de lo que ya existe (decidido en el plan de la fase 6): por entregar y próximos de `list_orders`, «Tu stock» de `stock_overview` y qué producir de `production_suggestion`. Así Inicio y Pedidos nunca difieren.

  Ningún módulo que guarda (pedidos, pagos, gastos, ingresos, caja) conoce a `reports`: sería un círculo. Por eso `reports` escucha todos los guardados y, después de cada uno, vuelve a pedir lo suyo (`useRefreshAfterWrites`, montado en la pila principal). Al volver a Inicio, ya está al día.
- **`report_summary(from, to)`:**
  - ingresos (por fecha de pago, D11), gastos y ganancia;
  - los mismos datos del periodo anterior, del mismo largo, para comparar. La app dice desde cuándo empieza (`p_previous_from`): la semana se compara con los mismos días de la semana pasada y el mes con los mismos días del mes pasado. Sin ese dato, los días justo anteriores;
  - las barras: por día hasta 7 días, por semana hasta 62 días («1 al 7», «8 al 14», «15 a hoy») y por mes en un rango más largo. La base da el desde, el hasta y los montos de cada barra; el texto lo arma la app (`bars.ts`);
  - lo cobrado por medio de pago.
- **`report_ranking(from, to)`:**
  - por alfajor, unidades y soles de los pedidos entregados, por fecha de entrega;
  - los pedidos por canal: WhatsApp, local y web;
  - la ganancia por alfajor: con el costo guardado en cada venta y, si esa venta no lo tiene, con el costo de hoy (el aproximado que se pone en Productos). Sin ninguno de los dos, sin ganancia;
  - los clientes que más compran (la pantalla los muestra con la ficha del cliente, en la fase 7: la maqueta de Más vendidos no los tiene).
- **`export_rows(from, to)`:** los pedidos, pagos, devoluciones, gastos e ingresos a mano del periodo, en un solo archivo con una columna «Tipo» para filtrar en Excel. Hasta un año. Cada fila lleva su día de Lima; un pedido, su día (por eso entra al periodo) y su hora acordada, si la tiene. El celular arma el archivo (`rules/csv.ts`), lo guarda con expo-file-system y lo comparte con expo-sharing. Las filas no se guardan en el celular.

## 4. Permisos

Los comunes: solo lectura, de los datos del negocio del dueño.

## 5. Cuentas en el celular (`rules/`)

- **`period.ts`:** el rango de cada periodo, en el día de Lima.
  - La semana va del lunes a hoy; el mes, del día 1 a hoy.
  - El periodo anterior tiene el mismo largo.
  - Ejemplo: el miércoles 18 de noviembre, la semana es del lunes 16 al miércoles 18, y la anterior del lunes 9 al miércoles 11. El mes, del 1 al 18 frente al 1 al 18 de octubre. Si el mes pasado no tiene ese día (el 31 de marzo), se compara con los mismos días justo antes.
- **`delta.ts`:** el porcentaje y su tono.
  - Ingresos S/ 3,486 frente a S/ 3,112 → «+12 %», bien.
  - Gastos +6 % → ojo.
  - 0 % → neutro.
  - Sin datos del periodo anterior → sin comparación.
- **`bars.ts`:** el texto de la barra tocada: «Del 1 al 7 entró S/ 1,180.00 y salió S/ 410.00.».
- **`csv.ts`:** el archivo para Excel, con separador «;» y BOM UTF-8, para que Excel en español lo abra bien. Los montos van como «12.00». Un texto con «;», comillas o saltos va entre comillas, y uno que empieza con =, +, - o @ lleva «'» delante para que Excel nunca lo tome como fórmula.
- **`urgent.ts`:** lo urgente de Inicio, en este orden:
  1. lo atrasado de días anteriores (del día más viejo) y lo que va tarde hoy (lo prometido antes primero), con `lateness` de `orders`. Mira la primera página de «Por entregar»; si hay más pedidos, una fila «N pedidos más por entregar» lleva a Pedidos;
  2. lo agotado, y lo que no alcanza para los pedidos;
  3. lo que hay que revisar;
  4. lo que se acaba.

  Ejemplo de la maqueta: #0044 va 10 min tarde, Limon Kiss está agotado, Pipo Crush tiene −2 y Morenita alcanza hasta mañana.

## 6. Pantallas y estados

- **Inicio:**
  - lo urgente arriba, en filas que se tocan;
  - «Cobrado hoy», sin los medios en cero (uno en negativo, por una devolución de hoy, sí se ve), con «Cuadrar caja ›» (siempre, también en un día sin nada);
  - los números del día, que abren Pedidos con el filtro puesto;
  - la bandeja de stock y qué producir;
  - por entregar y próximos;
  - el consejo de la primera vez, una sola vez después de la puesta en marcha;
  - en la cabecera, la campana «Avisos» (`reminders.md`).
  - Vistas: cargando, actualizando, sin datos, error, sin internet y servidor en pausa. El consejo de la primera vez llega con la puesta en marcha (fase 7) y «servidor en pausa» con el proyecto de producción (fase 8): saber que está en pausa necesita uno de verdad para confirmar cómo responde.
  - El saludo cambia con la hora de Lima: «Buenos días» hasta las 12:00, «Buenas tardes» hasta las 19:00 y «Buenas noches» después.
- **Reportes:**
  - Semana, Mes o Elegir fechas («Desde» y «Hasta» escritos como día/mes, cada uno la última vez que llegó ese día; hasta un año);
  - la ganancia con su comparación;
  - ingresos y gastos;
  - «Entra y sale», con barras que se tocan;
  - lo cobrado por medio de pago;
  - la cabecera de las pantallas que se abren encima de las pestañas, con «Volver» (decidido en la fase 6, en vez de un título que se achica al bajar);
  - al cambiar de periodo no parpadea: los números de antes quedan atenuados hasta que llegan los nuevos. «Todavía no hay datos» solo si tampoco hubo nada en el periodo anterior (un lunes temprano se ve en cero, con su comparación).
- **Más vendidos:**
  - en unidades o en soles;
  - por canal;
  - la ganancia por alfajor. Sin costos, invita a ponerlos en Productos.
- **Exportar a Excel:** elegir el periodo y compartir el archivo.

## 7. Con otros módulos

**Usa:**
- `orders`: las filas de pedidos y `lateness`.
- `stock`: la bandeja y la sugerencia.
- `products`: las fotos.

Ninguno de esos módulos usa `reports`, así que no hay ciclos.

**Expone:**
- Consultas: `homeSummaryQuery`, `reportSummaryQuery` y `rankingQuery`.
- Los componentes de Inicio y de Reportes.

## 8. Pruebas que deben pasar

**Base (pgTAP), con datos de ejemplo de dos semanas:**
- Los totales coinciden con la suma hecha a mano.
- Los ingresos van por fecha de pago y las ventas por fecha de entrega (D11).
- Los días cortan a las 00:00 de Lima, que son las 05:00 en UTC.
- El periodo anterior tiene el mismo largo.
- Un pedido entregado y después anulado deja de contar en las ventas y en el ranking.

**Rendimiento:** `home_summary`, `report_summary` y `report_ranking` responden en menos de 50 ms con años de datos.

**Cuentas (Jest):** `period.ts`, `delta.ts`, `bars.ts`, `csv.ts` y `urgent.ts`.

**Recorridos:**
- Inicio muestra lo urgente en orden.
- Tocar «por entregar» abre Pedidos con el filtro puesto.
- Exportar el mes.

## 9. Fuera de esta versión

- Un resumen semanal escrito con IA (§4).
- Un panel web.
