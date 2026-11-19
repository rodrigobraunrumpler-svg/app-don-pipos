select plan(8);

select tests.make_user('00000000-0000-4000-8000-00000000000a');
insert into public.businesses (id, owner_id, name) values ('00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-00000000000a', 'Don Pipos (DEMO)');

select is((select count(*)::integer from private.audit_log where business_id = '00000000-0000-4000-8000-0000000000a1'), 0, 'crear el negocio no deja nada en el registro');

update public.business_settings set delivery_fee_cents = 500, production_interval_days = 7 where business_id = '00000000-0000-4000-8000-0000000000a1';
select results_eq(
  'select table_name, row_id, action, old_data, new_data from private.audit_log where business_id = ''00000000-0000-4000-8000-0000000000a1''',
  $$values ('business_settings', '00000000-0000-4000-8000-0000000000a1'::uuid, 'update', '{"delivery_fee_cents": 0}'::jsonb, '{"delivery_fee_cents": 500}'::jsonb)$$,
  'guarda solo lo que cambió, con el valor de antes y el de después');
select is((select changed_by from private.audit_log where business_id = '00000000-0000-4000-8000-0000000000a1'), null::uuid, 'sin sesión no hay autor');

update public.business_settings set delivery_fee_cents = 500 where business_id = '00000000-0000-4000-8000-0000000000a1';
select is((select count(*)::integer from private.audit_log where business_id = '00000000-0000-4000-8000-0000000000a1'), 1, 'guardar lo mismo no deja otra fila');

update public.business_settings set version = version + 1 where business_id = '00000000-0000-4000-8000-0000000000a1';
select is((select count(*)::integer from private.audit_log where business_id = '00000000-0000-4000-8000-0000000000a1'), 1, 'una columna que no se vigila tampoco');

update public.business_settings set reminders = '{"scheduled": false, "stock": true, "balances": true}' where business_id = '00000000-0000-4000-8000-0000000000a1';
select is((select new_data from private.audit_log where business_id = '00000000-0000-4000-8000-0000000000a1' order by id desc limit 1), '{"reminders": {"scheduled": false, "stock": true, "balances": true}}'::jsonb, 'un cambio en los recordatorios queda entero');

select tests.login_as('00000000-0000-4000-8000-00000000000a');
select throws_ok('select * from private.audit_log', '42501', null, 'la app no lee el registro');
select tests.logout();

select has_index('private', 'audit_log', 'audit_log_business_id_changed_at_idx', 'tiene su índice por negocio y fecha');

select * from finish();
