-- El revisor de funciones (plpgsql_check), dentro de la transacción de prueba: así una migración se revisa antes de enviarla.
select plan(2);

create extension if not exists plpgsql_check with schema extensions;

select is_empty(
  $$select p.oid::regprocedure::text, c.level, c.message
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    join pg_catalog.pg_language l on l.oid = p.prolang
    cross join lateral extensions.plpgsql_check_function_tb(p.oid) c
    where n.nspname in ('public', 'private') and l.lanname = 'plpgsql' and p.prorettype <> 'trigger'::regtype$$,
  'plpgsql_check no encuentra nada en las funciones de public y private');

select is_empty(
  $$select t.tgname::text, t.tgrelid::regclass::text, c.level, c.message
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_proc p on p.oid = t.tgfoid
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    join pg_catalog.pg_language l on l.oid = p.prolang
    cross join lateral extensions.plpgsql_check_function_tb(p.oid, t.tgrelid) c
    where n.nspname in ('public', 'private') and l.lanname = 'plpgsql' and not t.tgisinternal$$,
  'ni en sus disparadores');

select * from finish();
