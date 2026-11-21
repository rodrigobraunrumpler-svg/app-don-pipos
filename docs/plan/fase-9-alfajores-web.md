# Fase 9: Los alfajores, de la app a la web — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Objetivo:** el dueño crea o cambia un alfajor en la app, con su foto, su descripción y sus alérgenos, y sale solo en la web. Con todas las mejoras que aprobó (maqueta `docs/design/pantallas/alfajores-web.html`, 2026-11-21).

**Arquitectura:**
- **La base** guarda la descripción, los alérgenos, la foto (en Storage) y el estado de la web de cada alfajor.
  - El outbox de la fase 8 separa dos tipos de cambio:
    - `state`: precio, stock, si se ve, orden y etiqueta;
    - `content`: nombre, descripción, alérgenos y foto.
- **La función `sync-to-web`:**
  - crea en Sanity la página de un alfajor que todavía no está (`product-don-pipos-<slug>`, en la categoría de Don Pipos);
  - sube la foto a Sanity cuando cambió;
  - manda cada cambio al documento y a su borrador;
  - después anota en la base el enlace, el slug y la foto subida.
- **La app:**
  - la hoja del alfajor pasa a ser pantallas de la pila: Nuevo, Editar, Vista previa y Ordenar;
  - la foto se sube como la boleta de un gasto, con su cola de reintentos.
- **La web** (la página de cada alfajor y lo de Google) la construye otro asistente, en el proyecto de la web. Esta fase solo deja en Sanity los campos que esa página lee.

**Stack:** Postgres (pg_net, pg_cron, Storage), Edge Functions en Deno, Expo SDK 58 con expo-image-picker (que ya trae Expo Go). Sin librerías nuevas.

**Especificación:** `docs/spec/products.md` (se actualiza), la maqueta aprobada y `docs/plan/fase-8-entrega.md` (la copia a la web).

## Decisiones

1. **La app manda en estos campos de la web:** nombre (como «Alfajor X»), descripción, foto principal, alérgenos, precio, disponible, si se ve, orden y la etiqueta «Nuevo».
   - El contenido (nombre, descripción, alérgenos, foto) se manda solo cuando cambia en la app.
   - Lo que alguien edite en el panel (más fotos, ingredientes) no se pisa.
2. **Una página nueva en la web** se crea solo cuando el alfajor tiene foto y descripción y «Se ve en la web» está prendido. Mientras le falte algo, sus cambios quedan cerrados como `incomplete`, y se vuelven a anotar cuando llega la foto.
3. **«Se ve en la web»:**
   - Un alfajor que todavía no está en la web necesita descripción para prenderlo; la foto llega justo después.
   - Los que ya están en la web (enlazados) no lo necesitan: su foto y su texto ya existen allá.
4. **La foto:**
   - El bucket es `product-photos`, privado, de hasta 4 MB, solo JPEG, con la ruta `<negocio>/<alfajor>/<uuid>.jpg`.
   - La app la recorta en cuadrado (el recortador del celular), avisa si el lado menor tiene menos de 1080 px y la achica a 2048 px antes de subirla.
   - En Sanity va con `alt` «Alfajor X de Don Pipos» y `rightsConfirmed: true`, porque la sube el dueño.
5. **«Nuevo»:** por 30 días desde que el alfajor sale por primera vez en la web (`web_published_at`). Solo para los creados en la app; los que ya estaban en la web no lo llevan.
6. **El orden:** `sortOrder` en la web es `sort_order × 10`. «Los más vendidos primero» (ajuste `products_by_sales`) ordena por lo vendido en los últimos 30 días: al prenderlo, y el día 1 de cada mes.
7. **El estado en la app** (`webState`):
   - `none`: no va a la web;
   - `pending`: hay una fila pendiente;
   - `failing`: una pendiente con 3 intentos o más;
   - `sent`: todo enviado.
   - Si alguno falla, Productos y precios avisa «La web no se está actualizando», con «Avisar al equipo».
8. **«Compartir»** usa `EXPO_PUBLIC_WEB_URL` + `/don-pipos/<slug>`. Sin esa variable (todavía no hay dominio), el botón no sale.
9. **«Pedir reseña»:**
   - Sale en un pedido entregado con teléfono, si el negocio guardó su enlace de reseñas de Google (ajuste `review_url`, https).
   - Usa la plantilla nueva `ask_review` («Hola {nombre}, gracias por tu pedido de Don Pipos. ¿Nos dejas tu opinión en Google? Nos ayuda mucho: {enlace}»).
10. **La categoría de Don Pipos en Sanity** la busca `pnpm web connect` (`brand == "don-pipos"`) y la guarda como secreto de la función (`SANITY_DON_PIPOS_CATEGORY`). La función no la tiene escrita.
11. **Los alérgenos** son los mismos 13 valores de la web (`gluten`, `lacteos`, `huevo`, `pescado`, `crustaceos`, `moluscos`, `mani`, `frutos-secos`, `soya`, `ajonjoli`, `mostaza`, `apio`, `sulfitos`), con los mismos títulos.

## Restricciones globales

- **Solo el proyecto de Supabase de siempre** (también es el de producción) y el dataset `development` de Sanity.
- **Secretos:** nunca se imprimen.
- **Sin librerías nuevas.**
- **Una migración subida no se edita;** los nombres de migración van con la hora UTC.
- **Código:** un componente por archivo, hasta 250 líneas por archivo y colores solo del tema.
- **Navegación suave:** Nuevo, Editar, Vista previa y Ordenar son pantallas de la pila, con «Volver».
- **Commits** en inglés, hasta 100 caracteres, sin cuerpo.

## Foco de revisión

1. **Un alfajor sin foto no crea una página vacía:** la foto que llega después la crea.
2. **Cambiar el precio no vuelve a subir la foto ni pisa la descripción del panel:** `state` y `content` van separados.
3. **Dos alfajores con el mismo nombre en la web,** o un slug ocupado: el nuevo lleva `-2`.
4. **Sin señal al guardar la foto:** el alfajor queda guardado y la foto se sube sola después.
5. **Deshacer justo después de publicar:** la web no muestra el alfajor (o lo esconde enseguida).

---

### Task 1: La base: descripción, alérgenos, foto y estado de la web

**Archivos:**
- Migración `<UTC>_products_web.sql`.
- `supabase/tests/072_products_web.test.sql` y `900_structure.test.sql` (la lista de funciones).
- `src/features/products/{schema,api,queries}` y sus pruebas.

**La base:**
- **`public.products` suma:**
  - `description` (hasta 400 letras);
  - `allergens text[]`, con los 13 valores;
  - `photo_path`, `web_slug`, `web_published_at` y `web_photo_path`.
- **`private.web_sync_outbox` suma** `kind text` (`state` o `content`, por defecto `state`).
  - El chequeo del payload se mantiene.
  - `queue_web_sync(p_product_id uuid, p_kind text default 'state')` anota también los alfajores sin enlazar que se ven en la web: la copia puede crearlos.
- **`save_product`** con `p_description` y `p_allergens`.
  - Anota `content` si cambió el nombre, la descripción o los alérgenos, y `state` si cambió el precio o si se ve.
  - Pone `web_published_at` la primera vez que un alfajor sin enlazar queda visible.
  - Rechaza «se ve» sin descripción en un alfajor sin enlazar (`invalid`).
- **`set_product_photo(p_product_id uuid, p_path text)`:** la ruta tiene que empezar con `<negocio>/<alfajor>/`, y anota `content`.
- **`product_json`** suma `description`, `allergens`, `hasPhoto`, `webSlug`, `webState` e `isNew`.
- **Storage:** el bucket `product-photos` con sus reglas (lee y sube solo el dueño de la carpeta).

- [ ] **Paso 1:** las pruebas que fallan.
  - pgTAP:
    - los campos nuevos y sus límites;
    - qué tipo de cambio anota `save_product` según lo que cambió;
    - «se ve» sin descripción;
    - la ruta de la foto;
    - `webState` en sus cuatro estados;
    - `isNew` a los 29 y a los 31 días.
  - Jest: el esquema nuevo.
- [ ] **Paso 2:** implementar. Correr `pnpm test:db`, `pnpm db:push`, `pnpm db:types` y `pnpm test`.
- [ ] **Paso 3: Commit** — `feat: store description, allergens, photo and web state for each product`.

### Task 2: La copia crea y actualiza la página en Sanity

**Archivos:**
- Migración `<UTC>_web_sync_content.sql`.
- `supabase/tests/150_web_sync.test.sql`.
- `supabase/functions/_shared/sanity.ts` y su prueba.
- `supabase/functions/sync-to-web/index.ts`.
- `scripts/web.mjs` y `scripts/lib/web.mjs`, con la categoría y el slug al enlazar.

**La base:**
- **`claim_web_sync`** devuelve por alfajor `{ ids, productId, sanityId, slug, attempts, payload, content }`:
  - `payload` siempre: precio, disponible, se ve, `sortOrder` e `isNew`;
  - `content` solo si alguna fila es `content` o si hay que crear la página: nombre para la web, descripción, alérgenos, ruta de la foto, si la foto cambió y el `alt`.
- **Un alfajor sin enlazar:**
  - si no se ve o no está activo, sus filas se cierran con `not_on_web`;
  - si le falta foto o descripción, con `incomplete`;
  - si no, se crea.
- **`finish_web_sync(p_ids, p_error, p_result jsonb default null)`:** con `p_result` (`sanityId`, `slug`, `imageUrl`, `photoPath`) actualiza el alfajor.

**La función:**
- Para crear: busca un slug libre (`alfajor-x`, `alfajor-x-2`…), y sube la foto antes de crear el documento.
- **`sanity.ts`:**
  - `createMutations(item, imageRef, categoryId)` arma el documento completo con `createIfNotExists`;
  - `patchMutations(item, imageRef?)` va al documento y al borrador; el contenido, solo si viene;
  - `uploadImage(fetch, config, bytes, filename)` devuelve el `_id` y la `url` del asset;
  - `slugFor(name)`.
- La foto se baja de Storage con la llave secreta de la función (`SUPABASE_SECRET_KEYS`).

- [ ] **Paso 1:** las pruebas que fallan.
  - pgTAP:
    - crear (con la foto), `incomplete`, `not_on_web`;
    - `content` solo cuando cambió;
    - `finish` con resultado.
  - node:test:
    - el documento nuevo (marca, categoría, slug, foto con `alt` y derechos);
    - el patch de contenido y el de estado;
    - la subida de la foto;
    - `slugFor` («Limón Kiss» → `alfajor-limon-kiss`).
- [ ] **Paso 2:** implementar. Correr `pnpm test:db`, `pnpm db:push`, `pnpm test:scripts`, `pnpm typecheck` y `pnpm functions:deploy`.
- [ ] **Paso 3: Commit** — `feat: create the alfajor page in Sanity from the app, photo included`.

### Task 3: «Nuevo», ordenar y los más vendidos

**Archivos:**
- Migración `<UTC>_products_order.sql`.
- `supabase/tests/073_products_order.test.sql`.
- `src/features/businesses` (los ajustes `productsBySales` y `reviewUrl`).

**La base:**
- **`reorder_products(p_ids uuid[])`:** `sort_order` en ese orden; anota `state` de todos.
- **`business_settings`** suma `products_by_sales boolean` y `review_url text` (https, hasta 300 letras), en `update_settings` y `settings_json`. Prender `productsBySales` ordena al momento.
- **`private.order_products_by_sales(p_business uuid)`**, con un cron el día 1 de cada mes.
- **`private.expire_new_badges()`,** con un cron diario: anota `state` de los alfajores que cumplieron 30 días.

- [ ] **Paso 1:** las pruebas que fallan, en pgTAP.
  - El orden nuevo y su `sortOrder`.
  - El orden por lo vendido.
  - La etiqueta que vence.
  - Los ajustes nuevos y sus límites.
- [ ] **Paso 2:** implementar. Correr `pnpm test:db`, `pnpm db:push`, `pnpm db:types` y `pnpm test`.
- [ ] **Paso 3: Commit** — `feat: order the web from the app, by hand or by best sellers, and expire «Nuevo»`.

### Task 4: La pantalla del alfajor

**Archivos:**
- `src/app/(main)/settings/products/{_layout,index,new,[id],preview,order}.tsx` (la de hoy pasa a `index`).
- En `src/features/products/components/`:
  - `product-form.tsx` y `photo-picker.tsx`;
  - `allergen-chips.tsx` y `web-preview-card.tsx`;
  - `web-state-chip.tsx`, `web-failing-notice.tsx` y `product-order-list.tsx`.
- `src/features/products/hooks/` (el borrador, guardar, la foto y su cola).
- `app.config.ts` (el permiso de la galería).
- Las pruebas de ruta.

**La app:**
- **Nuevo y Editar:** foto, nombre, precio, descripción con contador `0/400`, alérgenos, costo, mínimo y «Se ve en la web».
  - El interruptor se prende solo con foto y descripción en un alfajor sin enlazar; si no, dice «Falta la foto y la descripción».
  - Debajo del nombre: «En la web: «Alfajor X»».
- **La foto:**
  - «Tomar foto» o «De la galería», con el recorte en cuadrado;
  - si el lado menor tiene menos de 1080 px, avisa «Esta foto es chica: en la web se vería borrosa», con «Tomar otra» o «Usar igual».
- **Vista previa:** la tarjeta de la web, con «Publicar» y «Seguir editando».

- [ ] **Paso 1:** las pruebas que fallan.
  - Ruta: Nuevo → la foto → Vista previa → Publicar, y «Volver» desanda el camino.
  - El interruptor bloqueado.
  - El aviso de la foto chica.
  - Editar un alfajor enlazado sin descripción.
- [ ] **Paso 2:** implementar. Correr `pnpm test`, `pnpm lint` y `pnpm typecheck`.
- [ ] **Paso 3: Commit** — `feat: create and edit alfajores with photo, crop, description, allergens and a web preview`.

### Task 5: Publicar, Deshacer, estados, Compartir y Ordenar

**La app:**
- **Al publicar:**
  - el toast «Coqueta se publicó en la web» con «Deshacer», que lo esconde;
  - la lista consulta cada 3 segundos, hasta 1 minuto, mientras haya alfajores en `pending`;
  - al pasar a `sent`, el toast «Coqueta ya está en la web» con «Compartir».
- **Los estados en la lista:** «Subiendo a la web…», «En la web», «Oculto», «La foto espera la señal» (la cola local) y «Nuevo».
- **El aviso** «La web no se está actualizando», con «Avisar al equipo» (WhatsApp del equipo).
- **Ordenar:** ↑↓ y el interruptor «Los más vendidos primero», que apaga las flechas.

- [ ] **Paso 1:** las pruebas que fallan.
  - El toast y «Deshacer».
  - El paso de `pending` a `sent` y «Compartir» (con y sin `EXPO_PUBLIC_WEB_URL`).
  - El aviso.
  - La cola de la foto sin señal.
  - Ordenar y el interruptor.
- [ ] **Paso 2:** implementar. Correr `pnpm test`, `pnpm lint` y `pnpm typecheck`.
- [ ] **Paso 3: Commit** — `feat: publish with undo, follow the web state, share the page and order the alfajores`.

### Task 6: «Pedir reseña»

**Archivos:**
- Migración `<UTC>_ask_review.sql`: la plantilla `ask_review` (`nombre`, `enlace`).
- La prueba pgTAP de las plantillas.
- `src/features/messages`, por la clave nueva.
- `src/features/businesses`: la fila y la hoja «Reseñas de Google» en Ajustes.
- `src/features/orders/components/order-detail.tsx`.

- [ ] **Paso 1:** las pruebas que fallan.
  - La plantilla y sus campos.
  - El enlace se guarda solo con https.
  - El botón sale en un pedido entregado con teléfono y enlace, y no sale en los demás.
  - Abre WhatsApp con el mensaje lleno.
- [ ] **Paso 2:** implementar. Correr `pnpm test:db`, `pnpm db:push`, `pnpm db:types` y `pnpm test`.
- [ ] **Paso 3: Commit** — `feat: ask for a Google review from a delivered order`.

### Task 7: Cierre

- [ ] **Documentos:**
  - `products.md`, `businesses.md`, `messages.md`, el glosario y el README del plan;
  - en este plan, «Resultado» y «Lo que falta».
- [ ] **La prueba de punta a punta en `development`:**
  - crear un alfajor DEMO con foto desde la base;
  - ver que se crea su página en Sanity, con la foto;
  - cambiarle el precio y ver que no se vuelve a subir la foto;
  - borrar ese documento de prueba al terminar.
- [ ] **Verificar:**
  - `pnpm test`, `pnpm lint`, `pnpm typecheck` y `prettier --check`;
  - `pnpm lint:rules`, `pnpm test:scripts`, `pnpm test:db` y `pnpm db:check`.
- [ ] **Commit** — `docs: record phase 9, the alfajores from the app to the web`.

## Resultado (2026-11-21)

La fase quedó construida en la rama `fase-9`, con un commit por tarea (la 4 y la 5 juntas: comparten el borrador, los hooks y las pantallas). Pasan:
- 802 pruebas de Jest;
- 65 de los scripts y las funciones;
- 886 de la base, en 44 archivos, y los casos de velocidad;
- los consejos de Supabase, lint, tipos y formato.

En el proyecto de Supabase (que también es el de producción) ya están las cuatro migraciones y la función `sync-to-web` nueva. La copia sigue conectada al dataset `development` y al negocio DEMO: la web de verdad no cambia hasta el día de la entrega.

**La prueba de punta a punta en `development`** encontró dos errores que las pruebas no podían ver (`index.ts` no tiene pruebas propias), ya arreglados:
- el resultado de la función llegaba a la base como texto, no como objeto, así que el alfajor no guardaba su documento;
- una página recién creada no tenía «Nuevo» hasta el cambio siguiente.

Después pasó entera: el alfajor creado en la app salió en Sanity con su dirección, su foto (con su texto y sus derechos), su categoría y «Nuevo»; la app guardó la dirección, la foto del CDN y la fecha; cambiarle el precio no volvió a subir la foto. Todo lo de la prueba se borró (el documento, la foto en Sanity, el alfajor y su foto en Storage).

**La web** (otro asistente, en el proyecto de la web, D110–D112): cada alfajor tiene su página, `/don-pipos/<slug>`, con su foto grande, el precio, «Disponible hoy» o «Agotado por hoy», «Pedir por WhatsApp» y «Otros alfajores». «La colección» enlaza a cada una con «Ver detalle», el sitemap las lista y Google recibe su ficha de producto, su miga de pan y su imagen para compartir. Los títulos llevan la ciudad («… en Huamanga»).

### Lo que falta: probar en el celular

```bash
cd /home/javier/var-mar/app && pnpm start --tunnel
```

1. **Un alfajor nuevo:** Ajustes › Productos y precios › «Agregar producto». Toma una foto (el celular te deja recortarla en cuadrado), ponle de nombre «Prueba DEMO», un precio y una descripción. «Se ve en la web» se prende recién con la foto y la descripción.
2. **Vista previa y Publicar:** vuelve a la lista con «Prueba DEMO se publicó en la web.» y «Deshacer». La fila dice «Subiendo a la web…» y, en unos segundos, «En la web» con «Nuevo».
3. **Verlo en la web de prueba:** en el proyecto de la web, `pnpm dev` y abre `http://localhost:3000/don-pipos/alfajor-prueba-demo` (si no sale, reinicia `pnpm dev`: en tu PC no llega el aviso de Sanity). Al terminar, apaga «Se ve en la web» y desaparece.
4. **Ordenar:** sube o baja un alfajor y toca «Listo». «La colección» de la web sigue ese orden.
5. **Pedir reseña:** Ajustes › «Reseñas de Google», pega un enlace que empiece con `https://`. Abre un pedido entregado que tenga teléfono: «Pedir reseña» abre WhatsApp con el mensaje.
6. **Sin señal** (opcional): guarda un alfajor con foto y pon el modo avión enseguida. La fila dice «La foto espera la señal»; al volver la señal, se sube sola.

«Compartir» no sale todavía: espera el dominio (`EXPO_PUBLIC_WEB_URL`).

### Lo que cambió respecto de este plan

- **`webState` tiene siete estados, no cuatro:** la app distingue «le falta algo» (`incomplete`) de «espera la copia» (`waiting`) y de «oculto» (`hidden`).
- **Uno que todavía no está en la web anota solo su contenido:** sus cambios de precio o de stock no tienen nada que actualizar allá.
- **`save_product` no rechaza «Se ve» sin descripción:** la copia espera (`incomplete`) y la app no deja prenderlo.
- **Una dirección ocupada por un documento con el mismo nombre se enlaza, no se duplica:** cubre la página hecha en el panel y un reintento después de un corte a medias.
- **La descripción va solo si la app tiene una,** y la foto solo si cambió: el texto del panel de los alfajores que nacieron allá no se pisa.
- **Ordenar anota el estado de todos los enlazados** (un orden coherente en la web) y no cambia la versión de nadie (el orden no se edita en el formulario).
- **La foto se achica a 1600 px, no a 2048:** reutiliza `shrinkPhoto` de las boletas; la web la muestra hasta unos 1000 px.
- **La vista previa usa la letra de la app (Manrope):** Cormorant necesitaría una librería nueva.
- **El borrador empieza al tocar un alfajor en la lista,** no en un efecto de la pantalla (lo pide el lint del compilador de React).
- **La foto se reintenta sola 3 veces** y espera la señal; después, «Reintentar las fotos». Una foto que no subió antes de cerrar la app se pierde (las mutaciones no se guardan en el celular).

## Después de la revisión final (2026-11-21)

Un revisor aparte leyó toda la fase, en la app y en la web. **La web pasó sin observaciones.** En la app encontró un problema grave y cuatro importantes. Cuatro de sus detalles «menores» se notaban en cada publicación o tocaban el catálogo real, así que también se arreglaron. Todo está en la rama `fase-9-review`, cada cosa con una prueba que primero falló. Pasan:
- 811 pruebas de Jest;
- 67 de los scripts y las funciones;
- 902 de la base, en 45 archivos, y los casos de velocidad;
- los consejos de Supabase, lint, tipos y formato.

**Arreglado**
- **«Deshacer» mientras se creaba la página se perdía:** la web seguía mostrando el alfajor y la app decía «Oculto». Lo mismo pasaba con un precio o el stock cambiados en esos segundos. Ahora, al enlazar un alfajor recién creado, se vuelve a mandar su estado de ahora.
- **La foto sin señal no esperaba:** gastaba sus 3 reintentos en unos 7 segundos y, si fallaba, desaparecía a los 5 minutos. Ahora espera la señal, y una que falla queda un día para «Reintentar las fotos».
- **Editar podía cerrar la app** la primera vez después de una actualización: la lista guardada en el celular no traía alérgenos. Ahora la caché vieja se descarta (`CACHE_SCHEMA` 6) y un alfajor sin alérgenos se abre igual.
- **Dos alfajores con el mismo nombre en la web trababan la copia** («Coqueta» y «Alfajor Coqueta»): la página del primero mostraba al segundo, y la copia fallaba cada minuto sin avisar.
  - Ahora la base no deja dos alfajores con el mismo nombre en la web: «Ya tienes un alfajor con ese nombre.», también al publicar desde la vista previa.
  - Si la página que encuentra la copia ya es de otro alfajor, la copia sigue con la dirección siguiente (`-2`).
  - Y si igual llegara a pasar, ese alfajor queda como fallido y la copia sigue con los demás.
- **La foto que sube la app chocaba con el dueño:** cambiaba la versión del alfajor, así que «Deshacer» o guardar justo después decían que otro cambio llegó antes. Ahora la foto no cambia la versión.
- **El aviso «se publicó» con «Deshacer» volvía** después de «ya está en la web». Ahora no vuelve.
- **Mientras la foto subía, la fila decía «Le falta foto o descripción».** Ahora dice «Subiendo a la web…».
- **Guardar uno recién publicado mientras su foto subía lo sacaba de la web,** sin avisar. Ahora sigue viéndose: la copia espera la foto.
- **Un cambio de precio ya no toca la fila del alfajor en la base:** la copia no la bloquea mientras sube las fotos de otros.
- **Los alfajores que nacieron en el panel conservan su nombre:** cambiarles la foto o la descripción desde la app ya no convierte «Alfajor de Manteadita» en «Alfajor Manteadita». Sus alérgenos del panel tampoco se borran si la app no tiene ninguno. Los que creó la app siguen tomando el nombre de la app.

**Quedó para después** (detalles menores, en orden de lo que más se notaría)
1. En Editar, cambiar el nombre a uno que ya existe dice «ya tenía otro cambio guardado», no «nombre repetido»: la base responde lo mismo para los dos casos.
2. Los alfajores de la puesta en marcha empiezan con «Se ve» prendido: al ponerles foto y descripción se publican sin el aviso «se publicó». Y la hoja de la puesta en marcha todavía dice que la foto y la descripción se ponen en el panel.
3. En Ordenar, mover alfajores y después prender «Los más vendidos primero» guarda el orden a mano.
4. Al guardar:
   - el botón se vuelve a prender mientras se achica la foto;
   - si achicarla falla, la pantalla dice error aunque el alfajor ya se guardó;
   - sin negocio, la foto se pierde sin avisar;
   - dos fotos seguidas pueden llegar en desorden.
5. Un alfajor que se enlaza a una página que ya existía con su nombre lleva «Nuevo» 30 días.
6. Una página con el mismo nombre que solo existe como borrador en Studio no se puede enlazar: la copia falla (y lo avisa) hasta que alguien la publique o la borre.
7. `pnpm web connect` ya no se detiene si ningún alfajor coincide con la web, y su mensaje «no se copian» quedó viejo.
8. El registro de cambios no anota `products_by_sales` ni `review_url`.
9. `web_sync_pending` revisa el negocio con `current_user`, que dentro de la función siempre es el dueño de la base. No se llega a ella desde la API.
10. `saveProduct` borraría la descripción y los alérgenos si alguien lo llamara sin ellos. Ningún llamado lo hace hoy.

**Decidido sin arreglar** (lo que el revisor dejó fuera)
- **Las fotos viejas quedan en Storage:** son 5 a 10 alfajores; no vale la pena borrarlas todavía.
- **Un cambio hecho durante una corrida espera hasta un minuto** (el cron): es el diseño de la fase 8.
- **Una dirección cambiada después en Studio** deja vieja la de la app: es una acción del equipo, y el modelo de contenido de la web ya lo advierte.
- **Mientras no se reinicie la base,** los alfajores del negocio que no se copia dicen «Subiendo a la web…».
- **Los avatares cargan la foto completa de Sanity,** como desde la fase 8.
