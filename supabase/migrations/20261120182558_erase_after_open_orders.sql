-- Los datos de un cliente con un pedido por entregar o por cobrar no se borran (conflict): se perdería a dónde llevarlo y
-- a quién cobrarle. Primero se entrega y se cobra, o se anula; después se borran. Una vez borrados, otra llamada devuelve
-- lo mismo
create or replace function private.anonymize_customer(p_customer_id uuid) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_business_id uuid := private.current_business_id();
  v_customer public.customers%rowtype;
begin
  select c.* into v_customer from public.customers c
  where c.business_id = v_business_id and c.id = p_customer_id for update;
  if not found then
    perform private.fail('not_found');
  end if;
  if v_customer.anonymized_at is null and exists (
    select 1 from public.orders o
    where o.business_id = v_business_id and o.customer_id = p_customer_id and o.status <> 'cancelled'
      and (o.status <> 'delivered' or o.paid_cents < o.total_cents)
  ) then
    perform private.fail('conflict');
  end if;
  if v_customer.anonymized_at is null then
    update public.customers
    set name = 'Cliente eliminado', phone = null, address = null, note = null, accepts_promotions = false,
        anonymized_at = now(), version = version + 1
    where id = p_customer_id;
    update public.orders o
    set customer_name = 'Cliente eliminado',
        delivery_address = case when o.delivery_address is null then null else 'Dirección eliminada' end,
        note = null,
        version = o.version + 1
    where o.business_id = v_business_id and o.customer_id = p_customer_id;
  end if;
  return private.customer_json(p_customer_id);
end;
$$;
