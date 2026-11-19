# Acceso: PIN, huella y bloqueo (`features/auth`)

## 1. Qué resuelve

El dueño entra con su número y un PIN de 6 números que crea el equipo, sin correo, contraseña ni SMS (D18).
- La primera vez en un celular escribe los dos.
- Después entra con la huella o el PIN.
- Es seguro aunque su número sea público.

**Pantallas de la maqueta que cubre:**
- Ingresar en un celular.
- Entrar, con huella o PIN.
- Más → Cuenta.

## 2. Datos

### `private.pin_credentials` (una fila por dueño)

No lleva `business_id`: el PIN es de la persona, no del negocio.

| Columna | Tipo | Regla |
|---|---|---|
| `user_id` | uuid | Llave primaria (`auth.users`); se borra con la cuenta |
| `phone` | `phone_pe` | `+51` y 9 números; único |
| `pin_hash` | text | bcrypt de costo 10 (pgcrypto); nunca sale de la base |
| `pin_changed_at` | timestamptz | |

### `private.sign_in_attempts` (una fila por número que intentó entrar)

Los intentos se cuentan por número, en su propia tabla (decidido al planear la fase 2, 2026-11-19). Así un número que no existe se comporta igual que uno que existe, por construcción: mismas respuestas, en el mismo orden.

| Columna | Tipo | Regla |
|---|---|---|
| `phone` | `phone_pe` | Llave primaria |
| `failed_attempts` | int ≥ 0 | Errores seguidos |
| `locked_until` | timestamptz, puede ir vacío | La espera de 15 minutos |
| `hard_locked_at` | timestamptz, puede ir vacío | Bloqueada hasta que el equipo la revise |
| `updated_at` | timestamptz | |

Son números que alguien escribió: las filas sin cambios hace más de 30 días se borran cada noche, salvo las bloqueadas de un número que sí tiene PIN (Ley 29733).

**La cuenta de Supabase del dueño:** lleva un correo interno y una contraseña larga que calcula el servidor (un HMAC de su id con un secreto de las funciones). Nadie la escribe ni la ve.

### Índices

| Tabla | Índice | Sirve para |
|---|---|---|
| `private.pin_credentials` | único `(phone)` | Encontrar al dueño por su número al ingresar |
| `private.sign_in_attempts` | Llave primaria `(phone)` | Los intentos de un número |

## 3. Funciones del servidor

- **Edge Function `sign-in-with-pin`** (`{ phone, pin }`):
  1. Normaliza el número.
  2. Llama a `private.check_pin(phone, pin)`, que solo puede usar el servidor. En una sola operación revisa los bloqueos, compara el PIN y suma o reinicia los errores: con 5 seguidos, 15 minutos de espera; con 10, la cuenta queda bloqueada.
  3. Si el PIN es correcto, abre la sesión con el correo interno y la contraseña calculada, y devuelve los tokens.
  4. Puede responder:
     - `ok`, con la sesión;
     - `wrong_pin`, con los intentos que quedan;
     - `locked`, con la hora en que se puede volver a intentar;
     - `hard_locked`.

     Un número que no existe responde igual que un PIN incorrecto, y tarda lo mismo.
- **Edge Function `change-pin`** (`{ current, next }`):
  - pide sesión;
  - revisa el PIN actual, que cuenta como intento;
  - responde `same_pin` si el nuevo es igual al actual, y `obvious_pin` si es fácil, con las mismas reglas que `pinIsObvious` (la base las tiene en `private.pin_is_obvious`);
  - guarda el nuevo y responde `ok`.
- **Scripts del equipo** (con la llave secreta, nunca en la app):
  - `owner:create`: crea la cuenta, con su número y su PIN;
  - `owner:reset-pin`: un PIN nuevo y el desbloqueo;
  - `owner:sign-out-everywhere`: cierra todas sus sesiones.

## 4. Permisos

- `private.pin_credentials` vive en un esquema que la API no expone: la app no puede ni verla. Solo la usan las funciones del servidor.
- La llave secreta (`sb_secret_…`) y el secreto del HMAC viven en los secretos de Supabase.

## 5. En el celular

- **La sesión, cifrada.** Usa `LargeSecureStore`, el patrón de la guía de Supabase para Expo: la llave AES va en SecureStore y la sesión cifrada en AsyncStorage. SecureStore no acepta bien valores tan grandes como la sesión.
- **El PIN local, para entrar sin internet.**
  - Al ingresar con éxito se guardan en SecureStore un hash con sal del PIN (expo-crypto, SHA-256 con sal al azar) y el contador de errores.
  - Con 5 errores seguidos: `signOut({ scope: 'local' })`, se borra todo lo local y vuelve a Ingresar.
- **La huella** usa expo-local-authentication, sin el bloqueo del celular como respaldo (`disableDeviceFallback`). Si falla, se usa el PIN de la app.
- **El bloqueo automático:** al volver de segundo plano, si pasaron los minutos elegidos, pide huella o PIN. Se puede elegir 0, 1, 5 o 15 minutos (5 por defecto). Este ajuste se guarda en el celular.

**Cuentas (`rules/`):**
- **`pin.ts`:** `pinIsObvious(pin, phone)`.
  - Son fáciles: 123456, 654321 y 012345 (seguidos, en un sentido o en el otro); 111111 y 121212 (parejas repetidas); 123123 (tríos repetidos); y los últimos 6 números de su celular.
  - 197346 no es fácil.
- **`lock.ts`:** `shouldAskUnlock(backgroundAt, now, minutes)`.
  - Con 0 minutos, pide siempre.
  - Con 5 minutos: si pasaron 4, no pide; si pasaron 5, pide.
- **`attempts.ts`:** el texto de los intentos: 4 → «Te quedan 4 intentos»; 1 → «Te queda 1 intento».

## 6. Pantallas y estados

- **Ingresar en un celular,** en una sola pantalla:
  - el número con +51;
  - el campo del PIN con 6 puntos y un teclado propio. Al sexto número se comprueba solo («Comprobando…»);
  - «PIN incorrecto» con los intentos que quedan;
  - «Espera 15 minutos», con la hora, y «Pedir un PIN nuevo al equipo» (un enlace al WhatsApp de la agencia);
  - sin internet, el teclado se apaga;
  - después de ingresar, ofrece usar la huella.
- **Entrar:**
  - la huella, con «Usar mi PIN»;
  - el PIN, con una tecla de huella;
  - «PIN incorrecto» con los intentos que quedan;
  - «Cerramos la sesión», con «Ingresar de nuevo».
- **Más → Cuenta:** tu número, entrar con huella (interruptor), cuándo pedir huella o PIN (hoja), cambiar PIN y cerrar sesión en este celular.
- **Recién ingresado,** si el celular tiene huella: «¿Entrar con tu huella?» (`/biometrics`), antes de Inicio.
- **El layout raíz:** sin sesión manda a Ingresar; con sesión y bloqueo, a Entrar; recién ingresado, a la huella; si no, a las pestañas. Lo hace con `Stack.Protected`, y la entrada `/` (sin protección) lleva a donde corresponde. Mientras se sabe si hay sesión, solo el fondo.
- **Sin variables de entorno válidas:** «Falta configurar la app», con lo que falta.
- **El WhatsApp del equipo** sale de `EXPO_PUBLIC_SUPPORT_WHATSAPP`; sin él, «Olvidé mi PIN» y «Pedir un PIN nuevo al equipo» no se muestran.

## 7. Con otros módulos

**Usa:** ninguno; `businesses` lo usa a él.

**Expone:**
- `UnlockProvider`, `UnlockConsumer` y `useUnlock()`: la sesión (`sessionStatus`), el candado y sus acciones.
- Las pantallas: `SignInView`, `UnlockView`, `OfferBiometrics`, `ChangePinFlow` y `AccountSection`.

El teclado y los puntos son genéricos y viven en `components/ui`.

## 8. Pruebas que deben pasar

**Servidor:**
- Con 5 errores, espera de 15 minutos; con 10, la cuenta bloqueada. Un acierto reinicia el contador.
- Un número que no existe responde igual que un PIN incorrecto.
- La sesión devuelta sirve para leer los datos del negocio.
- El hash nunca sale en ninguna respuesta.

**Permisos:** `authenticated` no puede leer `private.pin_credentials`.

**Cuentas (Jest):** `pin.ts`, `lock.ts` y `attempts.ts`, con 100 % de cobertura.

**Pantallas:**
- Al sexto número se comprueba solo.
- 5 errores locales cierran la sesión del celular.

**Recorrido:** ingresar, pasar más de 5 minutos en segundo plano, volver y entrar con el PIN.

## 9. Fuera de esta versión

- Códigos por SMS o WhatsApp (descartados, D18).
- Varios usuarios y roles.
