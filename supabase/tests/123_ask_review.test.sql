-- Fase 9: «Pedir reseña», el mensaje de WhatsApp para pedir la opinión del cliente en Google (docs/plan/fase-9-alfajores-web.md)
select plan(5);

select tests.make_user('00000000-0000-4000-8000-0000000123a1');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000123b1', '00000000-0000-4000-8000-0000000123a1', 'Negocio nuevo (DEMO)');

select is((select t.body from public.message_templates t where t.business_id = '00000000-0000-4000-8000-0000000123b1' and t.key = 'ask_review'),
  'Hola {nombre}, gracias por tu pedido de Don Pipos. ¿Nos dejas tu opinión en Google? Nos ayuda mucho: {enlace}',
  'un negocio nuevo nace con el mensaje para pedir reseñas');
select is((select count(*)::integer from public.businesses b
  where not exists (select 1 from public.message_templates t where t.business_id = b.id and t.key = 'ask_review')), 0,
  'los negocios que ya existían también lo tienen');
select tests.login_as('00000000-0000-4000-8000-0000000123a1');
select is((select (e ->> 'isDefault')::boolean from jsonb_array_elements(public.list_templates()) e where e ->> 'key' = 'ask_review'), true,
  'sale en la lista de mensajes, con el texto original');
select lives_ok($$select public.update_template('ask_review', 1, 'Hola {nombre}, ¿nos dejas tu opinión? {enlace}')$$, 'se puede cambiar con su nombre y su enlace');
select throws_ok($$select public.update_template('ask_review', 2, 'Hola {nombre}, tu pedido {numero}')$$, 'P0001', 'invalid', 'pero no con marcadores que no son suyos');

select * from finish();
