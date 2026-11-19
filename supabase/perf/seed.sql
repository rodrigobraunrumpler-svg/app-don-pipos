-- Datos para medir: 5,000 negocios, cada uno con su dueño. Corren dentro de la transacción del medidor
-- y se deshacen con ella. Cada fase suma aquí los datos de sus tablas.

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, created_at, updated_at)
select
  ('00000000-0000-4000-9000-' || lpad(to_hex(n), 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  'medidor-' || n || '@prueba.invalid', '', now(), now()
from generate_series(1, 5000) as n;

insert into public.businesses (id, owner_id, name, modules)
select
  ('00000000-0000-4000-a000-' || lpad(to_hex(n), 12, '0'))::uuid,
  ('00000000-0000-4000-9000-' || lpad(to_hex(n), 12, '0'))::uuid,
  'Negocio ' || n || ' (DEMO)',
  '{orders,stock}'
from generate_series(1, 5000) as n;

analyze public.businesses;
analyze public.business_settings;
analyze private.business_counters;
