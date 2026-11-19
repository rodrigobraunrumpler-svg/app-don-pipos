select plan(9);

select ok(not has_schema_privilege('anon', 'public', 'usage'), 'anon no entra al esquema public');
select ok(has_schema_privilege('authenticated', 'public', 'usage'), 'authenticated sí entra al esquema public');
select ok(not has_schema_privilege('anon', 'private', 'usage'), 'anon no entra al esquema private');

create table public.zz_probe (id integer);
create function public.zz_probe_fn() returns integer language sql as 'select 1';
create sequence public.zz_probe_seq;

select ok(not has_table_privilege('anon', 'public.zz_probe', 'select, insert, update, delete'), 'una tabla nueva nace cerrada para anon');
select ok(not has_table_privilege('authenticated', 'public.zz_probe', 'select, insert, update, delete'), 'y para authenticated');
select ok(not has_table_privilege('service_role', 'public.zz_probe', 'select, insert, update, delete'), 'y para service_role');
select ok(not has_function_privilege('anon', 'public.zz_probe_fn()', 'execute'), 'una función nueva no la ejecuta anon ni PUBLIC');
select ok(not has_function_privilege('authenticated', 'public.zz_probe_fn()', 'execute'), 'ni authenticated');
select ok(not has_sequence_privilege('authenticated', 'public.zz_probe_seq', 'usage, select, update'), 'una secuencia nueva nace cerrada');

select * from finish();
