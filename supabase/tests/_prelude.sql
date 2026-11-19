-- Ayudas de las pruebas. El corredor las crea dentro de la transacción de cada prueba y se deshacen con ella.
create schema tests;

-- Un usuario de prueba. Su correo termina en @prueba.invalid: el corredor comprueba que no quede ninguno.
create function tests.make_user(p_id uuid) returns uuid
language sql as $$
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
  values (p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_id::text || '@prueba.invalid', '', now(), now())
  returning id;
$$;

-- Lo que hace la API con cada pedido de la app: el rol authenticated y los datos de la sesión
create function tests.login_as(p_id uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function tests.login_as_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end;
$$;

create function tests.logout() returns void
language plpgsql as $$
begin
  perform set_config('role', 'none', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

-- pgTAP también corre con la sesión de un usuario: sus funciones necesitan permiso mientras dura la prueba
do $$
declare
  pgtap_function regprocedure;
begin
  for pgtap_function in
    select p.oid::regprocedure
    from pg_catalog.pg_proc p
    join pg_catalog.pg_depend d on d.objid = p.oid and d.deptype = 'e'
    join pg_catalog.pg_extension e on e.oid = d.refobjid
    where e.extname = 'pgtap' and p.prokind = 'f'
  loop
    execute format('grant execute on function %s to authenticated, anon', pgtap_function);
  end loop;
end;
$$;
