-- Gastos: los tipos, anotar un gasto con su código y la foto de la boleta en el bucket privado (docs/spec/expenses.md)
select plan(30);

select tests.make_user('00000000-0000-4000-8000-0000000010c1');
select tests.make_user('00000000-0000-4000-8000-0000000010c2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000010d1', '00000000-0000-4000-8000-0000000010c1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000010d2', '00000000-0000-4000-8000-0000000010c2', 'Negocio B (DEMO)');
update public.business_settings set active_payment_methods = '{cash,yape}'
where business_id = '00000000-0000-4000-8000-0000000010d1';

-- Los tipos de gasto
select tests.login_as('00000000-0000-4000-8000-0000000010c1');
select set_config('t.insumos', public.save_expense_category(null, null, ' Insumos ', 'basket-outline')::text, true);
select set_config('t.empaques', public.save_expense_category(null, null, 'Empaques', 'package-variant-closed')::text, true);
select is(current_setting('t.insumos')::jsonb - 'id',
  '{"name": "Insumos", "icon": "basket-outline", "isActive": true, "sortOrder": 1, "version": 1}'::jsonb,
  'crea un tipo con su nombre limpio, al final y en su versión 1');
select is(array(select e ->> 'name' from jsonb_array_elements(public.list_expense_categories()) as e), array['Insumos', 'Empaques'],
  'la lista sale en su orden');
select throws_ok('select public.save_expense_category(null, null, ''insumos'', ''basket-outline'')', 'P0001', 'conflict',
  'un nombre repetido (sin importar mayúsculas) responde conflict');
select throws_ok('select public.save_expense_category(null, null, '''', ''basket-outline'')', 'P0001', 'invalid', 'sin nombre no');
select throws_ok('select public.save_expense_category(null, null, ''Gas'', ''Fire!'')', 'P0001', 'invalid', 'ni un ícono que no es un nombre');
select is(public.save_expense_category((current_setting('t.empaques')::jsonb ->> 'id')::uuid, 1, 'Cajas y bolsas', 'package-variant-closed')
  ->> 'name', 'Cajas y bolsas', 'se renombra con la versión que tenía la app');
select throws_ok(format('select public.save_expense_category(%L, 1, %L, %L)', current_setting('t.empaques')::jsonb ->> 'id', 'Cajas', 'package-variant-closed'),
  'P0001', 'conflict', 'con otra versión, conflict');
select is(public.set_category_active((current_setting('t.empaques')::jsonb ->> 'id')::uuid, 2, false) ->> 'isActive', 'false',
  'un tipo se apaga');
select throws_ok(format('select public.set_category_active(%L, 2, true)', current_setting('t.empaques')::jsonb ->> 'id'),
  'P0001', 'conflict', 'y apagarlo con la versión vieja responde conflict');

-- Anotar un gasto
select set_config('t.g1', public.create_expense('00000000-0000-4000-8000-0000000010e1',
  (current_setting('t.insumos')::jsonb ->> 'id')::uuid, 8600, 'yape', ' Chocolate de cobertura ', null)::text, true);
select is(current_setting('t.g1')::jsonb - 'id' - 'spentAt' - 'categoryId', jsonb_build_object(
  'categoryName', 'Insumos', 'categoryIcon', 'basket-outline', 'description', 'Chocolate de cobertura', 'amountCents', 8600,
  'method', 'yape', 'receiptPath', null, 'previousAmountCents', null, 'voidedAt', null), 'el gasto como lo ve la app');
select ok((current_setting('t.g1')::jsonb ->> 'spentAt')::timestamptz between now() - interval '1 minute' and now(),
  'sin fecha, es de ahora');
select is(public.create_expense('00000000-0000-4000-8000-0000000010e1', (current_setting('t.insumos')::jsonb ->> 'id')::uuid, 8600,
  'yape', ' Chocolate de cobertura ', null) ->> 'id', current_setting('t.g1')::jsonb ->> 'id', 'el mismo código devuelve el mismo gasto');
select is((select count(*)::integer from public.expenses e where e.business_id = '00000000-0000-4000-8000-0000000010d1'), 1,
  'y no crea otro');
select throws_ok(format('select public.create_expense(%L, %L, 9000, %L, null, null)', '00000000-0000-4000-8000-0000000010e1',
  current_setting('t.insumos')::jsonb ->> 'id', 'yape'), 'P0001', 'conflict', 'el mismo código con otros datos responde conflict');
select is(public.create_expense(gen_random_uuid(), (current_setting('t.insumos')::jsonb ->> 'id')::uuid, 500, 'cash', '  ',
  now() - interval '2 days') ->> 'description', null, 'una descripción vacía queda vacía, y se puede anotar de otro día');
select throws_ok(format('select public.create_expense(gen_random_uuid(), %L, 0, %L, null, null)',
  current_setting('t.insumos')::jsonb ->> 'id', 'cash'), 'P0001', 'invalid', 'el monto tiene que ser mayor que cero');
select throws_ok(format('select public.create_expense(gen_random_uuid(), %L, 10000001, %L, null, null)',
  current_setting('t.insumos')::jsonb ->> 'id', 'cash'), 'P0001', 'invalid', 'y razonable');
select throws_ok(format('select public.create_expense(gen_random_uuid(), %L, 500, %L, null, null)',
  current_setting('t.empaques')::jsonb ->> 'id', 'cash'), 'P0001', 'invalid', 'un tipo apagado no se usa');
select throws_ok(format('select public.create_expense(gen_random_uuid(), %L, 500, %L, null, null)',
  current_setting('t.insumos')::jsonb ->> 'id', 'plin'), 'P0001', 'invalid', 'ni un medio apagado');
select throws_ok(format('select public.create_expense(gen_random_uuid(), %L, 500, %L, null, %L)',
  current_setting('t.insumos')::jsonb ->> 'id', 'cash', now() + interval '1 hour'), 'P0001', 'invalid', 'ni una fecha que no llegó');
select throws_ok(format('select public.create_expense(gen_random_uuid(), %L, 500, %L, %L, null)',
  current_setting('t.insumos')::jsonb ->> 'id', 'cash', repeat('x', 121)), 'P0001', 'invalid', 'ni una descripción de más de 120 letras');

-- La boleta: la ruta es la del gasto, en la carpeta del negocio
select set_config('t.path', '00000000-0000-4000-8000-0000000010d1/' || (current_setting('t.g1')::jsonb ->> 'id') || '.jpg', true);
select is(public.attach_receipt((current_setting('t.g1')::jsonb ->> 'id')::uuid, current_setting('t.path')) ->> 'receiptPath',
  current_setting('t.path'), 'la foto queda en su gasto');
select throws_ok(format('select public.attach_receipt(%L, %L)', current_setting('t.g1')::jsonb ->> 'id',
  '00000000-0000-4000-8000-0000000010d2/otra.jpg'), 'P0001', 'invalid', 'con otra ruta no');
insert into storage.objects (bucket_id, name) values ('receipts', current_setting('t.path'));
select is((select count(*)::integer from storage.objects o where o.bucket_id = 'receipts' and o.name = current_setting('t.path')), 1,
  'el dueño sube y ve la boleta de su negocio');
select throws_ok(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'receipts',
  '00000000-0000-4000-8000-0000000010d1/boleta.png'), '42501', null, 'una ruta que no es la de un gasto no se sube');
select throws_ok('insert into public.expenses (business_id, category_id, amount_cents, method) values (''00000000-0000-4000-8000-0000000010d1'', gen_random_uuid(), 100, ''cash'')',
  '42501', null, 'nadie inserta directo un gasto');

-- Otro negocio
select tests.login_as('00000000-0000-4000-8000-0000000010c2');
select is(public.list_expense_categories(), '[]'::jsonb, 'otro dueño no ve los tipos');
select is((select count(*)::integer from public.expenses e where e.business_id = '00000000-0000-4000-8000-0000000010d1'), 0,
  'ni los gastos');
select is((select count(*)::integer from storage.objects o where o.bucket_id = 'receipts' and o.name like '00000000-0000-4000-8000-0000000010d1/%'), 0,
  'ni las boletas');
select throws_ok(format('insert into storage.objects (bucket_id, name) values (%L, %L)', 'receipts',
  '00000000-0000-4000-8000-0000000010d1/' || (current_setting('t.g1')::jsonb ->> 'id') || '.jpg'), '42501', null,
  'ni sube una boleta en la carpeta de otro negocio');
select tests.logout();

select * from finish();
