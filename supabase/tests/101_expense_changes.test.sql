-- Gastos: corregir, anular, el «Deshacer» de cada uno, la lista y el resumen por tipo (docs/spec/expenses.md §3 y §8)
select plan(27);

select tests.make_user('00000000-0000-4000-8000-0000000011c1');
select tests.make_user('00000000-0000-4000-8000-0000000011c2');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000011d1', '00000000-0000-4000-8000-0000000011c1', 'Negocio A (DEMO)'),
  ('00000000-0000-4000-8000-0000000011d2', '00000000-0000-4000-8000-0000000011c2', 'Negocio B (DEMO)');
update public.business_settings set active_payment_methods = '{cash,yape}'
where business_id = '00000000-0000-4000-8000-0000000011d1';

create function pg_temp.amounts(p_page jsonb) returns integer[] language sql as $$
  select array(select (e ->> 'amountCents')::integer from jsonb_array_elements(p_page -> 'items') as e);
$$;
grant execute on function pg_temp.amounts(jsonb) to authenticated;

select tests.login_as('00000000-0000-4000-8000-0000000011c1');
select set_config('t.insumos', public.save_expense_category(null, null, 'Insumos', 'basket-outline') ->> 'id', true);
select set_config('t.empaques', public.save_expense_category(null, null, 'Empaques', 'package-variant-closed') ->> 'id', true);
-- g1: hoy; g2: hace una hora; g3: el 10 de noviembre a las 23:30 de Lima (las 04:30 del 11 en UTC)
select set_config('t.g1', public.create_expense(gen_random_uuid(), current_setting('t.insumos')::uuid, 8600, 'yape', 'Chocolate', null) ->> 'id', true);
select set_config('t.g2', public.create_expense(gen_random_uuid(), current_setting('t.empaques')::uuid, 4500, 'cash', 'Cajas',
  now() - interval '1 hour') ->> 'id', true);
select set_config('t.g3', public.create_expense(gen_random_uuid(), current_setting('t.insumos')::uuid, 1300, 'cash', null,
  '2026-11-10T23:30:00-05:00') ->> 'id', true);
select set_config('t.path', '00000000-0000-4000-8000-0000000011d1/' || current_setting('t.g1') || '.jpg', true);
select public.attach_receipt(current_setting('t.g1')::uuid, current_setting('t.path'));

-- Corregir: el viejo queda anulado y el nuevo lo apunta, con la misma fecha y la misma boleta
select set_config('t.n1', public.correct_expense('00000000-0000-4000-8000-0000000011e1', current_setting('t.g1')::uuid,
  current_setting('t.insumos')::uuid, 9000, 'cash', 'Chocolate')::text, true);
select is(current_setting('t.n1')::jsonb - 'id' - 'categoryId' - 'spentAt', jsonb_build_object(
  'categoryName', 'Insumos', 'categoryIcon', 'basket-outline', 'description', 'Chocolate', 'amountCents', 9000, 'method', 'cash',
  'receiptPath', current_setting('t.path'), 'previousAmountCents', 8600, 'voidedAt', null), 'el gasto nuevo dice cuánto era antes');
select is((select array[e.void_reason, (date_trunc('milliseconds', e.spent_at) = (current_setting('t.n1')::jsonb ->> 'spentAt')::timestamptz)::text]
  from public.expenses e where e.id = current_setting('t.g1')::uuid), array['corrección', 'true'],
  'el viejo queda anulado por la corrección, y el nuevo conserva su fecha');
select is((select e.replaces_id::text from public.expenses e where e.id = (current_setting('t.n1')::jsonb ->> 'id')::uuid),
  current_setting('t.g1'), 'el nuevo apunta al viejo');
select is(public.correct_expense('00000000-0000-4000-8000-0000000011e1', current_setting('t.g1')::uuid,
  current_setting('t.insumos')::uuid, 9000, 'cash', 'Chocolate') ->> 'id', current_setting('t.n1')::jsonb ->> 'id',
  'el mismo código devuelve la misma corrección');
select throws_ok(format('select public.correct_expense(gen_random_uuid(), %L, %L, 9000, %L, %L)',
  current_setting('t.n1')::jsonb ->> 'id', current_setting('t.insumos'), 'cash', 'Chocolate'), 'P0001', 'invalid', 'sin cambios no');
select throws_ok(format('select public.correct_expense(gen_random_uuid(), %L, %L, 100, %L, null)',
  current_setting('t.g1'), current_setting('t.insumos'), 'cash'), 'P0001', 'invalid', 'ni un gasto ya anulado');

-- Anular
select is(public.void_expense(current_setting('t.g2')::uuid, 'Anulado') ->> 'voidedAt' is not null, true, 'un gasto se anula');
select ok(public.void_expense(current_setting('t.g2')::uuid, 'Otra vez') ->> 'voidedAt' is not null,
  'anular otra vez (un reintento con mala señal) devuelve el gasto anulado');
select throws_ok(format('select public.attach_receipt(%L, %L)', current_setting('t.g2'),
  '00000000-0000-4000-8000-0000000011d1/' || current_setting('t.g2') || '.jpg'), 'P0001', 'invalid', 'a un gasto anulado no se le pone foto');

-- La lista y el resumen cuentan solo lo que vale
select is(pg_temp.amounts(public.list_expenses(null, null, 20, null)), array[9000, 1300],
  'la lista trae los que cuentan, del más nuevo al más viejo');
select is(public.expenses_summary(current_date - 1, current_date + 1),
  jsonb_build_object('totalCents', 9000, 'byCategory', jsonb_build_array(jsonb_build_object(
    'categoryId', current_setting('t.insumos'), 'name', 'Insumos', 'icon', 'basket-outline', 'totalCents', 9000))),
  'el resumen por tipo no cuenta anulados ni lo corregido');

-- El día de Lima: las 23:30 del 10 cuentan el 10, no el 11
select is((public.expenses_summary('2026-11-10', '2026-11-10') ->> 'totalCents')::integer, 1300, 'las 23:30 de Lima cuentan ese día');
select is((public.expenses_summary('2026-11-11', '2026-11-11') ->> 'totalCents')::integer, 0, 'y no el siguiente');
select is(pg_temp.amounts(public.list_expenses('2026-11-10', '2026-11-10', 20, null)), array[1300], 'la lista por días, también');

-- Por páginas
select set_config('t.p1', public.list_expenses(null, null, 1, null)::text, true);
select is((current_setting('t.p1')::jsonb -> 'meta') - 'nextCursor', '{"limit": 1, "total": 2, "hasMore": true}'::jsonb,
  'por páginas, con el total');
select is(pg_temp.amounts(public.list_expenses(null, null, 1, current_setting('t.p1')::jsonb -> 'meta' ->> 'nextCursor')), array[1300],
  'la página siguiente sigue donde quedó');

-- Deshacer
select is(public.revert_expense_change(current_setting('t.g2')::uuid) ->> 'voidedAt', null, 'deshacer una anulación la quita');
select is(public.revert_expense_change(current_setting('t.g2')::uuid) ->> 'voidedAt', null,
  'deshacer otra vez (la respuesta se perdió) devuelve el gasto como quedó, sin error');
select is(public.revert_expense_change((current_setting('t.n1')::jsonb ->> 'id')::uuid) ->> 'amountCents', '8600',
  'deshacer una corrección vuelve a dejar el gasto de antes');
select is((select e.void_reason from public.expenses e where e.id = (current_setting('t.n1')::jsonb ->> 'id')::uuid),
  'deshacer corrección', 'y anula el nuevo');
select is(public.revert_expense_change((current_setting('t.n1')::jsonb ->> 'id')::uuid) ->> 'amountCents', '8600',
  'deshacer la corrección otra vez devuelve el gasto de antes');
select throws_ok(format('select public.revert_expense_change(%L)', current_setting('t.g1')), 'P0001', 'conflict',
  'el de antes no tiene nada que deshacer');

-- Corregir, anular el nuevo y deshacer: solo se deshace lo último (la anulación); la corrección queda
select set_config('t.n2', public.correct_expense(gen_random_uuid(), current_setting('t.g1')::uuid, current_setting('t.insumos')::uuid,
  9500, 'yape', 'Chocolate') ->> 'id', true);
select public.void_expense(current_setting('t.n2')::uuid, 'Anulado');
select is(public.revert_expense_change(current_setting('t.n2')::uuid) ->> 'amountCents', '9500', 'se deshace la anulación');
select is(pg_temp.amounts(public.list_expenses(null, null, 20, null)), array[9500, 4500, 1300],
  'y la corrección sigue: el de antes no vuelve');

-- Pasados 10 minutos ya no se deshace
select public.void_expense(current_setting('t.g3')::uuid, 'Anulado');
select tests.logout();
update private.audit_log set changed_at = changed_at - interval '11 minutes' where row_id = current_setting('t.g3')::uuid;
select tests.login_as('00000000-0000-4000-8000-0000000011c1');
select throws_ok(format('select public.revert_expense_change(%L)', current_setting('t.g3')), 'P0001', 'conflict',
  'pasados 10 minutos, no');

-- Otro negocio
select tests.login_as('00000000-0000-4000-8000-0000000011c2');
select is(public.list_expenses(null, null, 20, null) -> 'items', '[]'::jsonb, 'otro dueño no ve los gastos');
select throws_ok(format('select public.revert_expense_change(%L)', current_setting('t.n2')), 'P0001', 'not_found',
  'ni deshace los de otro negocio');
select tests.logout();

select * from finish();
