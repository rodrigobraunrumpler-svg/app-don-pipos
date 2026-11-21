-- Los mensajes de WhatsApp: cambiarlos con los marcadores de cada uno y volver al texto original (docs/spec/messages.md)
select plan(12);

select tests.make_user('00000000-0000-4000-8000-0000000017c1');
select tests.make_user('00000000-0000-4000-8000-0000000017c2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000017d1', '00000000-0000-4000-8000-0000000017c1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000017d2', '00000000-0000-4000-8000-0000000017c2', 'Negocio B (DEMO)');

create function pg_temp.template(p_key text) returns jsonb language sql as $$
  select e from jsonb_array_elements(public.list_templates()) as e where e ->> 'key' = p_key;
$$;
grant execute on function pg_temp.template(text) to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000017c1');
select is((select count(*)::integer from jsonb_array_elements(public.list_templates()) as e where (e ->> 'isDefault')::boolean), 7,
  'un negocio nuevo tiene sus 7 textos por defecto (con «Pedir reseña», fase 9)');
select throws_ok('select public.update_template(''on_the_way'', 1, ''Hola {nombre}, llevas {sellos}'')', 'P0001', 'invalid',
  'un marcador de otra plantilla no vale');
select throws_ok('select public.update_template(''on_the_way'', 1, ''Hola {nombre}, cuesta {precio}'')', 'P0001', 'invalid',
  'un marcador que no existe tampoco');
select throws_ok('select public.update_template(''on_the_way'', 1, ''   '')', 'P0001', 'invalid', 'ni un texto vacío');
select throws_ok(format('select public.update_template(%L, 1, %L)', 'on_the_way', repeat('a', 501)), 'P0001', 'invalid',
  'ni uno de más de 500 caracteres');
select throws_ok('select public.update_template(''promo'', 1, ''Hola {nombre}'')', 'P0001', 'invalid', 'ni una plantilla que no existe');
select is(public.update_template('on_the_way', 1, '  Hola {nombre}, tu pedido {numero} ya salió. {pago}  ') - 'version',
  '{"key": "on_the_way", "body": "Hola {nombre}, tu pedido {numero} ya salió. {pago}", "isDefault": false}'::jsonb,
  'cambiarlo: sin espacios de más, y ya no es el original');
select throws_ok('select public.update_template(''on_the_way'', 1, ''Hola {nombre}'')', 'P0001', 'conflict',
  'con otra versión, conflict');
select is(public.reset_template('on_the_way') - 'version',
  '{"key": "on_the_way", "body": "Hola {nombre}, tu pedido {numero} va en camino. {pago}", "isDefault": true}'::jsonb,
  'volver al texto original');
select is((pg_temp.template('on_the_way') ->> 'version')::integer, 3, 'cada cambio sube la versión');
select tests.logout();
select ok((select count(*) from private.audit_log a where a.table_name = 'message_templates'
  and a.business_id = '00000000-0000-4000-8000-0000000017d1') = 2, 'cambiarlo y volver al original quedan en el registro');

select tests.login_as('00000000-0000-4000-8000-0000000017c2');
select is(pg_temp.template('on_the_way') ->> 'isDefault', 'true', 'otro negocio tiene los suyos, sin tocar');
select tests.logout();

select * from finish();
