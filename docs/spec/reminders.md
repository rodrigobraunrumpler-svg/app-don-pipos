# Recordatorios (`features/reminders`)

## 1. Qué resuelve

Avisos del propio celular, que llegan aunque la app esté cerrada:
- el pedido para mañana;
- el alfajor que se acaba;
- el saldo pendiente.

En esta versión no hay un servidor de notificaciones.

**Pantallas de la maqueta que cubre:**
- El celular con avisos, en «Detalles que se sienten».
- Más → Recordatorios.

## 2. Datos

- Los interruptores están en `business_settings.reminders` (`scheduled`, `stock` y `balances`), así se mantienen aunque se reinstale la app.
- Los avisos se programan en el celular, con expo-notifications (avisos locales).

## 3. Cómo se programan

- Cada vez que la app trae datos nuevos (al abrir, al volver de segundo plano y después de guardar), recalcula los avisos. Si lo programado cambió, lo reemplaza; lo de «ahora» (un alfajor que se acaba) sale aparte, una vez por día.
- El permiso del celular se pide la primera vez que hay algo que avisar. Sin permiso, o con los tres interruptores apagados, no queda nada programado.
- **Pedido para otro día:** el día antes de su `due_date`, a las 18:00. «Mañana a las 10:00: pedido de Patricia V. 24 alfajores para recoger. Falta cobrar S/ 138.00.»
  - El cuerpo usa el resumen del pedido, porque la lista no trae la cantidad total: «12 Coquetas, 12 Morenitas para recoger. Falta cobrar S/ 138.00.» Un pedido entregado no avisa, y si la hora ya pasó (anotado después de las 18:00 del día antes), tampoco.
- **Alfajor que se acaba:** con el estado `low` de Stock (lo libre en el mínimo o debajo, o que alcanza para un día o menos; decidido en la fase 7b: así avisa también las primeras semanas, sin 7 días de ventas). Avisa al momento, una sola vez por alfajor y por día. «Morenita se está acabando…»
- **Saldo pendiente:** a las 09:00, si alguien debe desde hace un día o más: un pedido de ayer o antes ya entregado o con adelanto (`remind` de Por cobrar). Un solo aviso para todos: «Jorge P. te debe S/ 24.00…» o «3 clientes te deben S/ 96.00…». Mira la primera página de Por cobrar (los 20 más nuevos).
- **Al tocar un aviso,** se abre su pantalla: el pedido, Registrar producción o Por cobrar.
- **El límite:** los avisos salen con lo último que la app supo. Cuando lleguen los pedidos de la web (fase 2), se suma un aviso desde el servidor.
- **Cerrar la sesión** cancela los avisos programados: llevan nombres de clientes.

## 4. Permisos

Los interruptores siguen los permisos comunes de `business_settings`. Además, los avisos necesitan el permiso de notificaciones del celular.

## 5. Cuentas en el celular (`rules/`)

- **`build.ts`:** `buildReminders(data, settings, now)` devuelve la lista de avisos, cada uno con su hora (de Lima) y su pantalla.
  - Un pedido para el jueves 19 a las 10:00, siendo miércoles 18 a las 11:40 → un aviso el miércoles 18 a las 18:00.
  - Con su interruptor apagado → no hay aviso.
  - Un saldo desde ayer → un aviso hoy a las 09:00 si todavía no son las 09:00; si no, mañana a las 09:00.
  - Un alfajor que alcanza para un día → un aviso ahora, salvo que ya se haya avisado hoy.

## 6. Pantallas y estados

- **Más → Recordatorios:** tres interruptores, cada uno con su descripción («Cuando llegan al mínimo o quedan para un día», en el de los alfajores: fase 7b). Si el celular no dio permiso de avisos, lo dice: si nunca se pidió, «Permitir avisos» lo pide; si se negó, «Abrir ajustes del celular» abre los del sistema. Con el permiso dado desde ahí, los avisos se programan con la próxima recarga de datos.
- **Los avisos** llevan el logo de Don Pipos. En Expo Go llevan el de Expo Go: el de Don Pipos (blanco sobre transparente, como pide Android) entra con la app de verdad (fase 8).
- **La campana de Inicio** abre «Avisos», cada uno con su pantalla, y lleva un punto si hay alguno. Los dice a hoy (`listReminders`): el pedido de mañana (aunque ya pasaron las 18:00), cada alfajor bajo (aunque ya avisó) y quién debe, contado desde hoy. Sigue los interruptores.

## 7. Con otros módulos

**Usa:**
- `orders`: los próximos pedidos y los saldos.
- `stock`: lo que se acaba.
- `businesses`: los interruptores.

**Expone:** `useReminderSync()`, que se monta en el layout principal.

## 8. Pruebas que deben pasar

**Cuentas (Jest):** `buildReminders`, con los ejemplos de §5 y 100 % de cobertura.

**Pantallas:**
- Sin permiso del celular, muestra el aviso.
- Apagar un interruptor cancela sus avisos.

## 9. Fuera de esta versión

Avisos desde el servidor (Expo Push), cuando lleguen los pedidos de la web (fase 2).
