-- «Cerca del premio» sin leer a todos los empatados: entre los que tienen los mismos sellos va primero el que compró hace
-- menos (el más fácil de recuperar), con un índice que ya trae ese orden. Por nombre, con miles de empatados había que
-- leerlos todos para ordenarlos
drop index public.customers_business_id_stamps_idx;
create index customers_business_id_stamps_idx on public.customers (business_id, stamps desc, last_order_at desc nulls last, id desc)
  where stamps > 0;

create or replace function public.loyalty_overview(p_limit integer default 10) returns jsonb
language sql
stable
set search_path = ''
as $$
  with settings as (
    select l.* from public.loyalty_settings l
    where l.business_id = (select b.id from public.businesses b order by b.created_at, b.id limit 1)
  )
  select jsonb_build_object(
    'goal', s.goal,
    'customers', coalesce((
      select jsonb_agg(jsonb_build_object('customerId', c.id, 'name', c.name, 'stamps', c.stamps) order by c.stamps desc, c.last_order_at desc nulls last, c.id desc)
      from (
        select c.* from public.customers c
        where c.business_id = s.business_id and s.is_active and c.stamps > 0 and c.stamps >= s.goal - 2
          and c.anonymized_at is null
        order by c.stamps desc, c.last_order_at desc nulls last, c.id desc
        limit least(greatest(coalesce(p_limit, 10), 1), 50)
      ) c
    ), '[]'::jsonb)
  )
  from settings s;
$$;
