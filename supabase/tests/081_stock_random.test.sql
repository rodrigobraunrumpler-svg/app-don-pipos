-- Con 300 operaciones al azar (producción, merma, conteo y deshacer), el stock guardado sigue siendo la suma de los movimientos
select plan(2);

select tests.make_user('00000000-0000-4000-8000-0000000009a1');
insert into public.businesses (id, owner_id, name) values
  ('00000000-0000-4000-8000-0000000009b1', '00000000-0000-4000-8000-0000000009a1', 'Negocio A (DEMO)');
insert into public.products (id, business_id, name, price_cents, sanity_id) values
  ('00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-0000000009b1', 'Uno', 1200, 'alfajor-uno'),
  ('00000000-0000-4000-8000-000000000a02', '00000000-0000-4000-8000-0000000009b1', 'Dos', 1200, null),
  ('00000000-0000-4000-8000-000000000a03', '00000000-0000-4000-8000-0000000009b1', 'Tres', 1200, 'alfajor-tres'),
  ('00000000-0000-4000-8000-000000000a04', '00000000-0000-4000-8000-0000000009b1', 'Cuatro', 1200, null);

select setseed(0.42);
select tests.login_as('00000000-0000-4000-8000-0000000009a1');
do $$
declare
  v_products uuid[] := array[
    '00000000-0000-4000-8000-000000000a01', '00000000-0000-4000-8000-000000000a02',
    '00000000-0000-4000-8000-000000000a03', '00000000-0000-4000-8000-000000000a04'
  ]::uuid[];
  v_reasons text[] := array['broken', 'expired', 'gift', 'other'];
  v_requests uuid[] := '{}';
  v_request uuid;
  v_product uuid;
  v_choice double precision;
begin
  for i in 1..300 loop
    v_request := gen_random_uuid();
    v_product := v_products[1 + floor(random() * 4)::integer];
    v_choice := random();
    if v_choice < 0.4 then
      perform public.register_production(v_request, jsonb_build_array(
        jsonb_build_object('productId', v_product, 'quantity', 1 + floor(random() * 20)::integer)));
      v_requests := v_requests || v_request;
    elsif v_choice < 0.7 then
      perform public.register_waste(v_request, v_product, 1 + floor(random() * 5)::integer, v_reasons[1 + floor(random() * 4)::integer]);
      v_requests := v_requests || v_request;
    elsif v_choice < 0.9 then
      perform public.register_stock_count(v_request, jsonb_build_array(
        jsonb_build_object('productId', v_product, 'counted', floor(random() * 30)::integer)));
      v_requests := v_requests || v_request;
    elsif cardinality(v_requests) > 0 then
      begin
        perform public.revert_stock_change(v_requests[1 + floor(random() * cardinality(v_requests))::integer]);
      exception when others then
        -- un conteo sin diferencias no crea movimientos: deshacerlo no encuentra nada, y eso está bien
        if sqlerrm <> 'not_found' then
          raise;
        end if;
      end;
    end if;
  end loop;
end;
$$;

select is_empty(
  $$select l.product_id from public.stock_levels l
    left join (select m.product_id, sum(m.quantity)::integer as total from public.stock_movements m group by m.product_id) s on s.product_id = l.product_id
    where l.on_hand <> coalesce(s.total, 0)$$,
  'el stock de cada alfajor es la suma de sus movimientos');
select tests.logout();
select is(
  (select count(*)::integer from public.stock_movements m where m.reason = 'undo'
     and not exists (select 1 from public.stock_movements o where o.id = m.reverts_movement_id)),
  0, 'cada deshacer apunta a un movimiento que existe');

select * from finish();
