# Productos, precios y copia a la web (`features/products`)

## 1. Qué resuelve

- Los alfajores con su precio, su costo, su stock mínimo, su descripción, sus alérgenos, su foto y si se ven en la web.
- El dueño crea o cambia un alfajor en la app y sale solo en la web (D13, fase 9): su página, su foto, su precio, «Agotado» y su orden.

**Pantallas de la maqueta que cubre:**
- Productos y precios, Nuevo alfajor, Editar, Vista previa y Ordenar (`docs/design/pantallas/alfajores-web.html`, aprobada el 2026-11-21).
- El paso 1 de la puesta en marcha.
- Los precios que usan Nuevo pedido y Venta de mostrador.

## 2. Datos

### `products`

| Columna | Tipo | Regla |
|---|---|---|
| `name` | text | De 1 a 40 letras. Único en el negocio, sin importar mayúsculas, y también su nombre en la web: «Coqueta» y «Alfajor Coqueta» serían la misma página. En la web va como «Alfajor X» |
| `price_cents` | int > 0 | Hasta S/ 10,000 |
| `cost_cents` | int > 0, puede ir vacío | Para la ganancia por alfajor |
| `min_stock` | int ≥ 0 | 0 hasta que el dueño lo ponga |
| `show_on_web` | bool | Es el `isVisible` de la web; sí por defecto |
| `is_active` | bool | Un producto no se borra: se desactiva |
| `sort_order` | int | Su orden en la app y en la web (allá, `sortOrder` = `sort_order` × 10) |
| `description` | text, puede ir vacío | De 1 a 400 letras. La lee el cliente en la web |
| `allergens` | text[] | Los 13 de la web: `gluten`, `lacteos`, `huevo`, `pescado`, `crustaceos`, `moluscos`, `mani`, `frutos-secos`, `soya`, `ajonjoli`, `mostaza`, `apio`, `sulfitos`. Vacío por defecto |
| `photo_path` | text, puede ir vacío | La foto en Storage: `<negocio>/<alfajor>/<uuid>.jpg` |
| `web_photo_path` | text, puede ir vacío | La foto que ya está en Sanity: si es la misma, no se vuelve a subir |
| `sanity_id` | text, puede ir vacío | Su documento en la web |
| `web_slug` | text, puede ir vacío | Su dirección en la web: `/don-pipos/<slug>` |
| `web_published_at` | timestamptz, puede ir vacío | Cuándo la copia creó su página. Con eso lleva «Nuevo» por 30 días; los que ya estaban en la web no lo llevan |
| `image_url` | text, puede ir vacío | La foto de la web (CDN de Sanity). La guarda la copia al subir la foto, o el equipo al enlazar |
| `version` | int | Para detectar dos ediciones a la vez |

### La foto (Storage, bucket `product-photos`)

Privado, de hasta 4 MB y solo JPEG. El dueño sube y lee solo en la carpeta de su negocio; la función `sync-to-web` la lee con la llave del servidor para subirla a Sanity.

### `private.web_sync_outbox` (lo que falta copiar a la web)

| Columna | Tipo | Regla |
|---|---|---|
| `product_id` | uuid | |
| `kind` | text | `state`: precio, stock, si se ve, orden y «Nuevo». `content`: nombre, descripción, alérgenos y foto |
| `payload` | jsonb | El estado al anotarse, como registro. Se manda el de ahora |
| `attempts` | int ≥ 0 | |
| `last_error` | text, puede ir vacío | |
| `sent_at` | timestamptz, puede ir vacío | Vacío = falta enviar |

- **Un alfajor enlazado** (`sanity_id` con valor) anota todos sus cambios.
- **Uno que todavía no está en la web** anota solo su contenido, y solo si se ve y está activo: no hay nada allá que actualizar. Prender «Se ve» cuenta como contenido, porque es lo que crea su página.

### Índices

| Tabla | Índice | Sirve para |
|---|---|---|
| `products` | único `(business_id, lower(name))` | Que no se repitan los nombres |
| `products` | único `(business_id, lower(private.web_name(name)))` | Que no se repitan en la web |
| `products` | parcial `(business_id, sort_order)`, si está activo | La lista de la app |
| `products` | único parcial `(sanity_id)`, si tiene | El enlace con la web |
| `private.web_sync_outbox` | parcial `(created_at)`, si falta enviar | Lo pendiente, del más viejo al más nuevo |
| `private.web_sync_outbox` | `(business_id, product_id)` | La llave foránea |

## 3. Funciones de la base

- **`list_products()`:** los activos del negocio, en su orden. El stock llega con `stock_overview` (`stock.md`). Cada uno trae además `description`, `allergens`, `hasPhoto`, `webSlug`, `isNew` y `webState`:
  - `none`: no va a la web;
  - `incomplete`: quiere salir, pero le falta la foto o la descripción;
  - `waiting`: está completo y espera que la copia cree su página;
  - `pending`: tiene un cambio por mandar;
  - `failing`: un cambio pendiente ya falló 3 veces o más;
  - `sent`: está en la web, al día;
  - `hidden`: está enlazado, pero oculto.

  Lo pendiente lo lee `private.web_sync_pending` (definer, solo para los negocios de quien pregunta): la app no lee el outbox.
- **`save_product(id, expected_version, name, price_cents, cost_cents, min_stock, show_on_web, description, allergens)`:** crea o cambia un producto.
  - Anota `content` si cambia el nombre, la descripción o los alérgenos, o si uno que todavía no está en la web prende «Se ve». Si no, anota `state` cuando cambia el precio o si se ve. El cambio queda en el registro (`private.audit_log`): «¿cuándo subí el precio?».
  - No exige la descripción para «Se ve»: la copia espera (`incomplete`) y la app no deja prenderlo sin ella.
  - Sin descripción o sin alérgenos (`null`, o sin mandarlos) los deja como están; vacíos a propósito (`''` y `'{}'`), los borra. La app siempre los manda.
  - Un nombre repetido (también en la web) responde `conflict`, igual que otra versión.
- **`set_product_photo(id, path)`:** guarda la foto que la app acaba de subir y anota `content`. La ruta tiene que ser de su negocio y de ese alfajor; si no, `invalid`. No cambia la versión: la sube la app sola, y no debe chocar con guardar justo después ni con «Deshacer».
- **`reorder_products(ids)`:** los alfajores en ese orden (los ↑↓ de la app) y la lista como queda. Uno de otro negocio responde `not_found`; uno repetido, `invalid`. Anota el estado de todos los enlazados, y no cambia la versión de nadie: el orden no se edita en el formulario, así que no debe causar conflictos.
- **«Los más vendidos primero»** (el ajuste `products_by_sales`, `businesses.md`): `private.order_products_by_sales` ordena por lo vendido en los últimos 30 días, en pedidos entregados. Corre al prender el ajuste y el día 1 de cada mes (cron `order-products-by-sales`, 03:30 de Lima).
- **«Nuevo» vence:** cada día (cron `expire-new-badges`, 03:45 de Lima), `private.expire_new_badges` manda el estado sin la etiqueta de los que cumplieron 30 días.
- **`set_product_active(id, active)`.** Desactivar un producto enlazado anota `isVisible: false` en el outbox; activarlo, su `show_on_web`. El botón en la app llega más adelante: la maqueta no lo tiene.
- **La disponibilidad («Agotado»)** cambia cuando el stock cruza el cero. La base deja una fila en el outbox dentro de los movimientos de stock (`stock.md`).
- **El envío a la web (fases 8 y 9):**
  - Un trigger del outbox llama al momento a la Edge Function `sync-to-web`, por pg_net, una vez por transacción. Además, pg_cron la llama cada minuto mientras quede algo pendiente; con 10 intentos fallidos o más, solo a la hora en punto.
  - La base la llama con un secreto propio (encabezado `x-web-sync-secret`), sin JWT. Lo guardan Vault (`web_sync_url`, `web_sync_secret`) y los secretos de la función (`WEB_SYNC_SECRET`). Sin ellos no se llama a nada.
  - **Solo se copia el negocio enlazado a la web** (`web_sync_business_id` en Vault). El proyecto de Supabase es uno solo, y los datos DEMO conviven con los reales hasta limpiarlos: lo de otro negocio se cierra con `not_live_business` y no se puede enlazar. Sin ese valor no se toca nada.
  - La función toma lo pendiente con `private.claim_web_sync`, una corrida a la vez (un candado de la transacción; la otra vuelve sin nada). Saca uno por producto:
    - `payload`, su estado de ahora (`private.web_state`): `priceMinor`, `isAvailable`, `isVisible`, `sortOrder` e `isNew`;
    - `content`, si alguna fila es de contenido o si todavía no está en la web (`private.web_content`): el nombre «Alfajor X», la descripción (solo si la app tiene una), los alérgenos, la foto, si cambió, y su texto alternativo «Alfajor X de Don Pipos». De uno que nació en el panel (lo enlazó el equipo: sin `web_published_at`) no van el nombre ni, si la app no tiene, los alérgenos: «Alfajor de Manteadita» conserva su nombre de allá.
  - Uno que todavía no está en la web y no se ve, o al que le falta la foto o la descripción, cierra sus filas (`not_on_web`, `incomplete`): **nunca se crea una página vacía.** La foto que llega después lo vuelve a anotar.
  - **Si la foto cambió,** la función la baja de Storage y la sube a Sanity, con su texto y `rightsConfirmed: true` (la sube el dueño). Cambiar el precio no la vuelve a subir.
  - **Si el alfajor ya está en la web,** el cambio va al documento y, si alguien lo tiene abierto en Studio, también a su borrador: así publicarlo no devuelve el precio viejo.
  - **Si no está,** busca su dirección (`alfajor-coqueta`): libre, la usa; ocupada por uno con el mismo nombre, es el mismo alfajor y lo enlaza (también después de un corte a medias), salvo que esa página ya sea de otro alfajor de la app (si solo existe como borrador de Studio, crea la publicada con esa dirección); ocupada por otro, prueba `-2`, `-3`… Crea el documento `product-don-pipos-<slug>` en la categoría de Don Pipos (`SANITY_DON_PIPOS_CATEGORY`), con «Nuevo».
  - Lo que alguien edite en el panel (más fotos, ingredientes) no se pisa: la app manda solo sus campos.
  - Si llamar a la función falla (pg_net o Vault), el cambio del dueño se guarda igual; el cron lo vuelve a intentar.
  - Manda los pedidos a Sanity con su token (`SANITY_WRITE_TOKEN`, un secreto de Supabase que nunca está en la app). Si un alfajor falla, los demás igual se copian. El proyecto y el dataset salen de `SANITY_PROJECT_ID` y `SANITY_DATASET`: en desarrollo, `development` (los datos DEMO nunca van a `production`).
  - Después, `private.finish_web_sync(ids, error, result)` marca `sent_at`, o suma un intento y guarda el error. Con 10 intentos fallidos lo escribe en los registros de la función; el aviso al equipo por Sentry llega con la APK. Con un resultado, el alfajor guarda su documento, su dirección, la foto del CDN, la foto subida y, si la app creó la página (`isNew`), `web_published_at`. Enlazado a una página que ya existía no es «Nuevo», y queda como uno del panel:
    - recién enlazado, vuelve a anotar su estado: lo que cambió mientras se creaba («Deshacer», un precio, el stock) sale con el estado de ahora;
    - si ese documento ya es de otro alfajor, no lo enlaza: sus filas vuelven como fallidas y la corrida sigue con los demás;
    - un cambio de estado de uno enlazado no toca su fila: la copia no la bloquea mientras sube las fotos de otros.
  - Sin los secretos de Sanity, la función responde `not_configured` y no toca el outbox.
  - **Enlazar un producto:** el equipo corre `private.link_product(id, sanity_id, image_url, slug)`, solo para el negocio de la web, y anota su estado completo.
  - **Para el equipo:** `pnpm web connect --dataset <production|development> --business <id>` se detiene si ningún alfajor del negocio coincide con los de la web (y la web sí tiene alfajores: casi seguro es otro negocio). Si no, guarda los secretos de la función y los de Vault, la categoría de Don Pipos, y enlaza cada alfajor con su documento por el nombre (sin «Alfajor», «de» ni tildes), con su foto y su dirección. Los que no están en la web y ya están completos quedan anotados para crearse. Se puede repetir: cambia el secreto. `pnpm web status` muestra lo pendiente, los errores y las últimas respuestas de la función.
  - El historial de pg_cron se limpia cada día (`private.purge_cron_history`, lo de más de 7 días): el reintento deja una fila por minuto.
  - La web se refresca con el webhook firmado que ya existe.

## 4. Permisos

- El dueño lee sus productos. Escribe solo con las funciones.
- Las fotos: el dueño sube y lee solo en `product-photos/<su negocio>/`.
- `private.web_sync_outbox` vive en un esquema que la API no expone: es solo del servidor.

## 5. Cuentas en el celular (`rules/`)

- **`margin.ts`:** la ganancia por alfajor es el precio menos el costo.
  - 1200 − 510 → 690, un 57,5 %.
  - Sin costo, no hay dato.
- **Los precios que se escriben** se convierten con `lib/money`: «12,50» → 1250. Se rechazan el 0 y los negativos.
- **`web.ts`:**
  - `webName`: «Coqueta» → «Alfajor Coqueta»; «Alfajor Coqueta» queda igual.
  - `missingForWeb`: qué le falta a uno que todavía no está en la web («Falta la foto y la descripción», «Falta la foto», «Falta la descripción»). A uno enlazado no le falta nada.
  - `isSmallPhoto`: el lado menor por debajo de 1080 px.
  - `pageUrl` y `shareText`: «Nuevo en Don Pipos: Alfajor Coqueta https://…/don-pipos/alfajor-coqueta». Sin `EXPO_PUBLIC_WEB_URL` no hay dirección.

## 6. Pantallas y estados

Nuevo alfajor, Editar, Vista previa y Ordenar son pantallas de la pila de Productos y precios, con «Volver». Lo que se escribe vive en un borrador compartido: ir a la vista previa y volver no pierde nada.

- **Productos y precios** (se abre desde Ajustes y desde Stock, fase 7c):
  - cada alfajor con su foto o sus iniciales, el precio, «Mínimo 6, cuesta S/ 5.10» y cómo va en la web: «En la web», «Oculto», «Subiendo a la web…», «Le falta foto o descripción», «Todavía no está en la web» o «No se pudo subir», y «Nuevo» los primeros 30 días;
  - si alguno falla 3 veces: «La web no se está actualizando. Tus cambios están guardados en la app.», con «Avisar al equipo» (WhatsApp del equipo);
  - mientras su foto sube, «Subiendo a la web…»; sin señal, «La foto espera la señal», y sube sola cuando vuelve. Con mala señal se reintenta sola 3 veces; después, «Reintentar las fotos», como en Gastos (una que falló queda un día). Una foto que no subió antes de cerrar la app se pierde, y el alfajor dice que le falta;
  - «Agregar producto» abre Nuevo alfajor, y «Ordenar», Ordenar.
- **Nuevo alfajor y Editar:**
  - la foto: «Tomar foto» o «De la galería», recortada en cuadrado con el recortador del celular y achicada a 1600 px. Una foto chica avisa «Esta foto es chica: en la web se vería borrosa. Tómala de más cerca o con más luz.», con «Usar igual»;
  - el nombre, con «En la web: «Alfajor Coqueta»», el precio, la descripción (con la cuenta hasta 400) y los alérgenos (opcionales);
  - el costo (con la ganancia) y el stock mínimo;
  - «Se ve en la web»: no se prende mientras falte algo, y lo dice. En uno nuevo, «Con la etiqueta «Nuevo» por 30 días»; en uno que ya está, «Si lo apagas, desaparece de la web.». Uno que ya se veía sigue viéndose aunque su foto todavía esté subiendo («Sale en la web cuando tenga foto y descripción.»);
  - «Vista previa» y «Guardar». Un nombre repetido dice «Ya tienes un alfajor con ese nombre.» (al crear, al publicar y al cambiarle el nombre); otro cambio que llegó antes, que lo vuelva a abrir.
  - «Guardando…» dura también mientras se prepara la foto. Si no se puede preparar («No se pudo preparar la foto. Elige otra o tómala de nuevo.») o todavía no se sabe el negocio, no se guarda nada. Las fotos suben de a una, en orden.
- **Vista previa:** la tarjeta como se verá en la web, y «Publicar».
- **Al publicar** vuelve a la lista con «Coqueta se publicó en la web.» y «Deshacer» (lo oculta otra vez). También uno de la puesta en marcha, que ya tenía «Se ve» y recién recibe su foto y su descripción. La lista sigue la copia cada 3 segundos, hasta un minuto. Cuando ya está en la web: «Coqueta ya está en la web.», con «Compartir» (sin dirección de la web, no sale).
- **Al guardar** sin publicar: «Coqueta guardado.».
- **Ordenar:** ↑↓ por alfajor y «Listo», que guarda el orden de la app y de la web. «Los más vendidos primero» lo deja a la base: apaga las flechas y lo movido a mano antes no se guarda.
- **Vistas:** cargando (skeleton), error, y sin internet: «Guardar» se apaga y la pantalla lo dice. Guardar sin señal falla al momento; no queda en espera (§14.2 de `PROJECT_CONTEXT.md`). La foto sí espera la señal.

## 7. Con otros módulos

**Usa:** ninguno. El stock de cada producto llega con `stock_overview` (`stock.md`). Ordenar pone la fila «Los más vendidos primero» de `businesses`, desde la pantalla de `src/app`: los dos módulos no se importan entre sí.

**Expone:**
- `productsQuery` y las mutaciones.
- El tipo `Product`.
- `ProductAvatar`: la foto o las iniciales, que usan `stock`, `orders` y `reports`.
- `ProductsRow`: la fila «Productos y precios», en Ajustes y arriba de Stock (fase 7c).
- Las pantallas de la pila: el editor, la vista previa y la lista para ordenar, con su borrador (`ProductDraftProvider`).

## 8. Pruebas que deben pasar

**Base (pgTAP):**
- Un precio de cero o menos se rechaza, y también un nombre repetido, una descripción de más de 400 letras y un alérgeno desconocido.
- Cambiar el precio o si se ve deja una fila `state`; cambiar el nombre, la descripción, los alérgenos o la foto, una `content`. Uno que no está en la web anota solo su contenido.
- `webState` dice cada uno de sus siete estados.
- La foto: solo en la carpeta de su negocio y de ese alfajor.
- Un producto desactivado no aparece en la lista ni en los pedidos nuevos, pero sí en los viejos.
- La copia a la web: sale uno por producto con su estado de ahora; un alfajor sin foto o sin descripción no se crea; lo enviado se cierra y un error suma un intento; con un resultado, el alfajor guarda su documento, su dirección y su foto; enlazar anota el estado completo; la base llama solo con sus secretos, una vez por transacción, y con 10 intentos solo a la hora en punto.
- Ordenar a mano y por lo vendido; «Nuevo» vence a los 30 días.
- Los detalles (`153`): «Nuevo» solo si la app creó la página; guardar sin descripción ni alérgenos no los borra; el registro anota los ajustes nuevos y lo de la web; lo pendiente de otro negocio no se ve.
- Después de la revisión (`152`): «Deshacer» mientras se crea la página llega a la web; un documento de otro alfajor no corta la corrida; dos alfajores no comparten nombre en la web; la foto no cambia la versión; los alfajores del panel conservan su nombre.

**La función (node:test, `_shared/sanity.test.ts`):** las mutaciones (estado, contenido, crear con «Nuevo»), la dirección libre, la del mismo alfajor y la `-2`, la subida de la foto, un 2xx, un error con su código y uno de red.

**Cuentas (Jest):** `margin.ts` y `web.ts`.

**Pantallas (Jest, con las rutas de verdad):** crear un alfajor con su foto, vista previa, publicar y Deshacer; la foto chica; uno enlazado no necesita foto; «Volver» desanda el camino; la foto sin señal; los estados de la lista; el aviso de la web; Ordenar; «Compartir».

**De punta a punta (en `development`, 2026-11-21):** un alfajor creado en la app sale en la web con su dirección, su foto, su categoría y «Nuevo»; cambiarle el precio no vuelve a subir la foto.

## 9. Fuera de esta versión

- Variantes de presentación: la web no las tiene.
- Más fotos por alfajor e ingredientes: se ponen en el panel de la web.
- Borrar un alfajor de la web: se oculta.
- «Alfajor Tropi» y «Kekes artesanales»: se agregan cuando tengan precio.
