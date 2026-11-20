-- Los pedidos que vienen (de mañana en adelante), sin entregar ni anular, del más próximo al más lejano. Los usan los
-- recordatorios del celular y la campana de Inicio: list_orders('upcoming') va del número mayor al menor, y con muchos
-- pedidos abiertos dejaba fuera uno anotado temprano para mañana. Lee con las reglas de acceso; usa orders_open_idx
create function public.upcoming_orders(p_limit integer default 50) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_today date := (now() at time zone 'America/Lima')::date;
begin
  if p_limit is null or p_limit < 1 then
    perform private.fail('invalid');
  end if;
  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  return jsonb_build_object('items', coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'number', o.number, 'status', o.status, 'fulfillment', o.fulfillment,
      'customerName', o.customer_name, 'itemsSummary', o.items_summary, 'totalCents', o.total_cents,
      'paidCents', o.paid_cents, 'promisedAt', private.iso_time(o.promised_at), 'dueDate', o.due_date
    ) order by o.due_date, o.promised_at nulls last, o.number)
    from (
      select o.* from public.orders o
      where o.business_id = v_business_id and o.due_date > v_today and o.status not in ('delivered', 'cancelled')
      order by o.due_date, o.promised_at nulls last, o.number
      limit least(p_limit, 100)
    ) o
  ), '[]'::jsonb));
end;
$$;

grant execute on function public.upcoming_orders(integer) to authenticated;
