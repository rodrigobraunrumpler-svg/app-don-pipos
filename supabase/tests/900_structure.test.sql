-- La prueba que vigila la estructura de toda la base, con 11 reglas. Las fases siguientes la heredan.
-- Cada regla se comprueba dos veces: contra un objeto hecho para romperla, que tiene que ser detectado,
-- y contra la base real, que tiene que salir limpia.
select plan(26);

-- 1. Toda tabla tiene las reglas de acceso activadas
create function pg_temp.tables_without_rls() returns setof text language sql as $$
  select c.oid::regclass::text
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private') and c.relkind in ('r', 'p') and not c.relrowsecurity
$$;

create table public.zz_canary (id integer);
select isnt_empty('select * from pg_temp.tables_without_rls()', 'detecta una tabla sin reglas de acceso');
drop table public.zz_canary;
select is_empty('select * from pg_temp.tables_without_rls()', 'toda tabla tiene las reglas de acceso activadas');

-- 2. Toda tabla de public tiene created_at, updated_at y el trigger común
create function pg_temp.tables_without_timestamps() returns setof text language sql as $$
  select c.oid::regclass::text
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p')
    and (
      not exists (select 1 from pg_catalog.pg_attribute a where a.attrelid = c.oid and a.attname = 'created_at' and not a.attisdropped)
      or not exists (select 1 from pg_catalog.pg_attribute a where a.attrelid = c.oid and a.attname = 'updated_at' and not a.attisdropped)
      or not exists (
        select 1 from pg_catalog.pg_trigger t
        where t.tgrelid = c.oid and t.tgfoid = 'private.set_updated_at()'::regprocedure and not t.tgisinternal
      )
    )
$$;

create table public.zz_canary (id integer, business_id uuid, created_at timestamptz, updated_at timestamptz);
select isnt_empty('select * from pg_temp.tables_without_timestamps()', 'detecta una tabla sin el trigger de updated_at');
drop table public.zz_canary;
select is_empty('select * from pg_temp.tables_without_timestamps()', 'toda tabla de public tiene created_at, updated_at y su trigger');

-- 3. Toda tabla de public pertenece a un negocio
create function pg_temp.tables_without_business() returns setof text language sql as $$
  select c.oid::regclass::text
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> 'businesses'
    and not exists (select 1 from pg_catalog.pg_attribute a where a.attrelid = c.oid and a.attname = 'business_id' and not a.attisdropped)
$$;

create table public.zz_canary (id integer);
select isnt_empty('select * from pg_temp.tables_without_business()', 'detecta una tabla sin business_id');
drop table public.zz_canary;
select is_empty('select * from pg_temp.tables_without_business()', 'toda tabla de public tiene business_id o es businesses');

-- 4. Toda función fija su search_path vacío
create function pg_temp.functions_with_open_search_path() returns setof text language sql as $$
  select n.nspname || '.' || p.proname || '(' || oidvectortypes(p.proargtypes) || ')'
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private')
    and not coalesce(p.proconfig, '{}') @> array['search_path=""']
$$;

create function public.zz_canary_fn() returns integer language sql as 'select 1';
select isnt_empty('select * from pg_temp.functions_with_open_search_path()', 'detecta una función sin search_path fijo');
drop function public.zz_canary_fn();
select is_empty('select * from pg_temp.functions_with_open_search_path()', 'toda función fija su search_path vacío');

-- 5. Toda llave foránea tiene un índice que empieza por sus columnas
create function pg_temp.foreign_keys_without_index() returns setof text language sql as $$
  select c.conrelid::regclass::text || ' (' || c.conname || ')'
  from pg_catalog.pg_constraint c
  join pg_catalog.pg_namespace n on n.oid = c.connamespace
  where c.contype = 'f' and n.nspname in ('public', 'private')
    and not exists (
      select 1 from pg_catalog.pg_index i
      where i.indrelid = c.conrelid and i.indpred is null
        and (i.indkey::smallint[])[0:cardinality(c.conkey) - 1] @> c.conkey
        and c.conkey @> (i.indkey::smallint[])[0:cardinality(c.conkey) - 1]
    )
$$;

create table public.zz_parent (id uuid primary key);
create table public.zz_canary (id uuid primary key, parent_id uuid references public.zz_parent (id));
select isnt_empty('select * from pg_temp.foreign_keys_without_index()', 'detecta una llave foránea sin índice');
drop table public.zz_canary;
drop table public.zz_parent;
select is_empty('select * from pg_temp.foreign_keys_without_index()', 'toda llave foránea tiene su índice');

-- 6. Nada es accesible sin sesión
create function pg_temp.open_to_anon() returns setof text language sql as $$
  select 'tabla ' || c.oid::regclass::text
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private') and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and (
      has_table_privilege('anon', c.oid, 'select, insert, update, delete, truncate, references, trigger')
      -- un permiso dado columna por columna no aparece en has_table_privilege
      or has_any_column_privilege('anon', c.oid, 'select, insert, update, references')
    )
  union all
  select 'secuencia ' || c.oid::regclass::text
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private')
    -- el «case» obliga a mirar el tipo antes: has_sequence_privilege falla con lo que no es una secuencia
    and case when c.relkind = 'S' then has_sequence_privilege('anon', c.oid, 'usage, select, update') else false end
  union all
  select 'función ' || n.nspname || '.' || p.proname
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and has_function_privilege('anon', p.oid, 'execute')
$$;

create table public.zz_canary (id integer);
grant select on public.zz_canary to anon;
select isnt_empty('select * from pg_temp.open_to_anon()', 'detecta una tabla abierta sin sesión');
drop table public.zz_canary;
create table public.zz_canary (id integer, x integer);
grant select (x) on public.zz_canary to anon;
select isnt_empty('select * from pg_temp.open_to_anon()', 'detecta una columna abierta sin sesión');
drop table public.zz_canary;
select is_empty('select * from pg_temp.open_to_anon()', 'nada es accesible sin sesión');

-- 7. La app no escribe directo en ninguna tabla
create function pg_temp.tables_writable_by_app() returns setof text language sql as $$
  select c.oid::regclass::text
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private') and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and (
      has_table_privilege('authenticated', c.oid, 'insert, update, delete, truncate')
      or has_any_column_privilege('authenticated', c.oid, 'insert, update')
    )
$$;

create table public.zz_canary (id integer);
grant insert on public.zz_canary to authenticated;
select isnt_empty('select * from pg_temp.tables_writable_by_app()', 'detecta una tabla donde la app puede escribir directo');
drop table public.zz_canary;
create table public.zz_canary (id integer, x integer);
grant update (x) on public.zz_canary to authenticated;
select isnt_empty('select * from pg_temp.tables_writable_by_app()', 'detecta una columna donde la app puede escribir directo');
drop table public.zz_canary;
select is_empty('select * from pg_temp.tables_writable_by_app()', 'la app no escribe directo en ninguna tabla');

-- 8. La app ejecuta solo las funciones de esta lista. Una función nueva para la app se agrega aquí a conciencia.
create function pg_temp.unlisted_functions_for_app() returns setof text language sql as $$
  select n.nspname || '.' || p.proname || '(' || oidvectortypes(p.proargtypes) || ')'
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'private') and has_function_privilege('authenticated', p.oid, 'execute')
    and n.nspname || '.' || p.proname || '(' || oidvectortypes(p.proargtypes) || ')' not in (
      -- lo que llama la app
      'public.get_business()',
      'public.update_settings(integer, jsonb)',
      'public.list_products()',
      'public.save_product(uuid, integer, text, integer, integer, integer, boolean)',
      'public.set_product_active(uuid, boolean)',
      'public.stock_overview()',
      'public.register_production(uuid, jsonb)',
      'public.register_waste(uuid, uuid, integer, text)',
      'public.register_stock_count(uuid, jsonb)',
      'public.revert_stock_change(uuid)',
      'public.list_product_movements(uuid, integer, text)',
      'public.create_order(uuid, jsonb)',
      'public.create_counter_sale(uuid, jsonb, text)',
      'public.advance_order(uuid, text)',
      'public.revert_status(uuid, text)',
      'public.add_payment(uuid, uuid, text, integer)',
      'public.get_order(uuid)',
      'public.list_orders(text, text, integer, text)',
      'public.order_counts()',
      'public.find_customer_by_phone(text)',
      'public.list_templates()',
      'public.edit_order(uuid, uuid, integer, jsonb, integer, text)',
      'public.revert_edit(uuid, integer)',
      'public.cancel_order(uuid, uuid, text, integer, text)',
      'public.revert_cancel(uuid)',
      'public.change_payment_method(uuid, uuid, text)',
      'public.list_receivables(integer, text)',
      'public.production_suggestion()',
      'public.product_sales_by_weekday(uuid)',
      'public.list_expense_categories()',
      'public.save_expense_category(uuid, integer, text, text)',
      'public.set_category_active(uuid, integer, boolean)',
      'public.create_expense(uuid, uuid, integer, text, text, timestamp with time zone)',
      'public.attach_receipt(uuid, text)',
      'public.correct_expense(uuid, uuid, uuid, integer, text, text)',
      'public.void_expense(uuid, text)',
      'public.revert_expense_change(uuid)',
      'public.list_expenses(date, date, integer, text)',
      'public.expenses_summary(date, date)',
      'public.create_manual_income(uuid, text, integer, text, date)',
      'public.void_manual_income(uuid, text)',
      'public.income_summary(date, date)',
      'public.list_income(date, date, integer, text)',
      'public.cash_expected(date)',
      'public.close_cash_day(uuid, date, integer, integer)',
      'public.latest_cash_count(date)',
      'public.home_summary()',
      'public.report_summary(date, date, date)',
      'public.report_ranking(date, date)',
      'public.export_rows(date, date)',
      'public.get_customer(uuid)',
      'public.search_customers(text, text, integer, text)',
      'public.update_customer(uuid, integer, text, text, text, boolean)',
      'public.anonymize_customer(uuid)',
      'public.list_customer_orders(uuid, integer, text)',
      'public.get_loyalty_settings()',
      'public.update_loyalty_settings(integer, boolean, text, integer, text, integer, text)',
      'public.loyalty_overview(integer)',
      'public.update_template(text, integer, text)',
      'public.reset_template(text)',
      -- lo que usan por dentro las reglas de acceso y las funciones de arriba
      'private.owned_business_ids()',
      'private.fail(text)',
      'private.settings_json(business_settings)',
      'private.update_settings(integer, jsonb)',
      'private.product_json(products)',
      'private.save_product(uuid, integer, text, integer, integer, integer, boolean)',
      'private.set_product_active(uuid, boolean)',
      'private.reserved_stock(uuid)',
      'private.register_production(uuid, jsonb)',
      'private.register_waste(uuid, uuid, integer, text)',
      'private.register_stock_count(uuid, jsonb)',
      'private.revert_stock_change(uuid)',
      'private.create_order(uuid, jsonb)',
      'private.create_counter_sale(uuid, jsonb, text)',
      'private.advance_order(uuid, text)',
      'private.revert_status(uuid, text)',
      'private.add_payment(uuid, uuid, text, integer)',
      'private.order_json(uuid)',
      'private.iso_time(timestamp with time zone)',
      'private.edit_order(uuid, uuid, integer, jsonb, integer, text)',
      'private.revert_edit(uuid, integer)',
      'private.cancel_order(uuid, uuid, text, integer, text)',
      'private.revert_cancel(uuid)',
      'private.change_payment_method(uuid, uuid, text)',
      'private.expected_sales(uuid)',
      'private.category_json(expense_categories)',
      'private.expense_json(uuid)',
      'private.save_expense_category(uuid, integer, text, text)',
      'private.set_category_active(uuid, integer, boolean)',
      'private.create_expense(uuid, uuid, integer, text, text, timestamp with time zone)',
      'private.attach_receipt(uuid, text)',
      'private.correct_expense(uuid, uuid, uuid, integer, text, text)',
      'private.void_expense(uuid, text)',
      'private.revert_expense_change(uuid)',
      'private.create_manual_income(uuid, text, integer, text, date)',
      'private.void_manual_income(uuid, text)',
      'private.income_rows(uuid, timestamp with time zone, timestamp with time zone)',
      'private.close_cash_day(uuid, date, integer, integer)',
      'private.cash_totals(uuid, date)',
      'private.cash_count_json(cash_counts)',
      'private.report_totals(uuid, date, date)',
      'private.search_text(text)',
      'private.customer_search(text, text)',
      'private.customer_json(uuid)',
      'private.update_customer(uuid, integer, text, text, text, boolean)',
      'private.anonymize_customer(uuid)',
      'private.search_customers(text, text, integer, text)',
      'private.update_loyalty_settings(integer, boolean, text, integer, text, integer, text)',
      'private.loyalty_json(loyalty_settings)',
      'private.update_template(text, integer, text)',
      'private.reset_template(text)',
      'private.template_json(message_templates)',
      'private.default_templates()'
    )
$$;

create function public.zz_canary_fn() returns integer language sql set search_path = '' as 'select 1';
grant execute on function public.zz_canary_fn() to authenticated;
select isnt_empty('select * from pg_temp.unlisted_functions_for_app()', 'detecta una función que la app ejecuta y no está en la lista');
drop function public.zz_canary_fn();
select is_empty('select * from pg_temp.unlisted_functions_for_app()', 'la app ejecuta solo las funciones de la lista');

-- 9. En public no hay funciones con permisos elevados al alcance de la app: la lógica que escribe vive en private
create function pg_temp.definer_functions_in_public() returns setof text language sql as $$
  select p.proname::text
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and has_function_privilege('authenticated', p.oid, 'execute')
$$;

create function public.zz_canary_fn() returns integer language sql security definer set search_path = '' as 'select 1';
grant execute on function public.zz_canary_fn() to authenticated;
select isnt_empty('select * from pg_temp.definer_functions_in_public()', 'detecta una función security definer de public al alcance de la app');
drop function public.zz_canary_fn();
select is_empty('select * from pg_temp.definer_functions_in_public()', 'ninguna función security definer de public está al alcance de la app');

-- 10. Una vista lee con los permisos de quien consulta (security_invoker), y la app no lee vistas materializadas ni tablas foráneas
create function pg_temp.unsafe_views() returns setof text language sql as $$
  select c.oid::regclass::text
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private')
    and (
      (c.relkind = 'v'
        and not coalesce(c.reloptions, '{}') && array['security_invoker=true', 'security_invoker=on', 'security_invoker=1', 'security_invoker=yes'])
      or (c.relkind in ('m', 'f')
        and (has_table_privilege('authenticated', c.oid, 'select') or has_any_column_privilege('authenticated', c.oid, 'select')
          or has_table_privilege('anon', c.oid, 'select') or has_any_column_privilege('anon', c.oid, 'select')))
    )
$$;

create view public.zz_canary_view as select id from public.businesses;
select isnt_empty('select * from pg_temp.unsafe_views()', 'detecta una vista que lee con los permisos de su dueño');
drop view public.zz_canary_view;
create materialized view public.zz_canary_mv as select 1 as x;
grant select on public.zz_canary_mv to authenticated;
select isnt_empty('select * from pg_temp.unsafe_views()', 'detecta una vista materializada que la app puede leer');
drop materialized view public.zz_canary_mv;
select is_empty('select * from pg_temp.unsafe_views()', 'toda vista lee con los permisos de quien consulta');

-- 11. Toda regla de acceso es para authenticated y filtra por los negocios del usuario
create function pg_temp.loose_policies() returns setof text language sql as $$
  select p.polrelid::regclass::text || ' (' || p.polname || ')'
  from pg_catalog.pg_policy p
  join pg_catalog.pg_class c on c.oid = p.polrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'private')
    and (
      -- polroles = {0} es «para cualquier rol» (PUBLIC)
      p.polroles <> array['authenticated'::regrole::oid]
      or coalesce(pg_get_expr(p.polqual, p.polrelid), '') || coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '')
        not like '%owned_business_ids%'
    )
$$;

create table public.zz_canary (id integer, business_id uuid);
alter table public.zz_canary enable row level security;
create policy zz_open on public.zz_canary for select to authenticated using (true);
select isnt_empty('select * from pg_temp.loose_policies()', 'detecta una regla de acceso que deja leer todo');
drop policy zz_open on public.zz_canary;
create policy zz_public on public.zz_canary for select using (business_id = any ((select private.owned_business_ids())::uuid[]));
select isnt_empty('select * from pg_temp.loose_policies()', 'detecta una regla de acceso para cualquier rol');
drop table public.zz_canary;
select is_empty('select * from pg_temp.loose_policies()', 'toda regla de acceso es para authenticated y filtra por negocio');

select * from finish();
