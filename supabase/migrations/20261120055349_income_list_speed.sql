-- Ingresos: la lista pide primero los pagos de la página y después sus pedidos. Juntaba todos los pagos con su pedido
-- antes de ordenar, y con 3 años de pedidos la página siguiente rozaba los 50 ms (pnpm db:perf).

-- Los pagos (y las devoluciones) con su pedido y los ingresos a mano, sin anulados, del más nuevo al más viejo, por
-- días de Lima (opcionales) y por páginas. Cada parte se pide ya ordenada por su índice y se juntan. El cursor es
-- opaco: la fecha (en UTC, con microsegundos) y el id del último, en base64
create or replace function public.list_income(
  p_from date default null, p_to date default null, p_limit integer default 20, p_cursor text default null
) returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_business_id uuid;
  v_limit integer := coalesce(p_limit, 20);
  v_start timestamptz := (p_from::timestamp at time zone 'America/Lima');
  v_end timestamptz := ((p_to + 1)::timestamp at time zone 'America/Lima');
  v_after_at timestamptz;
  v_after_id uuid;
  v_total integer;
  v_page jsonb;
  v_rows integer;
  v_last jsonb;
begin
  if v_limit < 1 or p_from > p_to then
    perform private.fail('invalid');
  end if;
  v_limit := least(v_limit, 50);
  if p_cursor is not null then
    begin
      select split_part(t.value, '|', 1)::timestamptz, split_part(t.value, '|', 2)::uuid
      into v_after_at, v_after_id
      from convert_from(decode(p_cursor, 'base64'), 'UTF8') as t (value);
    exception when others then
      perform private.fail('invalid');
    end;
  end if;

  select b.id into v_business_id from public.businesses b order by b.created_at, b.id limit 1;

  select (
    select count(*) from public.payments p
    where p.business_id = v_business_id and p.voided_at is null
      and (v_start is null or p.paid_at >= v_start) and (v_end is null or p.paid_at < v_end)
  ) + (
    select count(*) from public.manual_incomes m
    where m.business_id = v_business_id and m.voided_at is null
      and (v_start is null or m.received_at >= v_start) and (v_end is null or m.received_at < v_end)
  ) into v_total;

  select coalesce(jsonb_agg(jsonb_build_object(
      'kind', page.kind,
      'id', page.id,
      'at', private.iso_time(page.at),
      'amountCents', page.amount_cents,
      'method', page.method,
      'orderId', page.order_id,
      'orderNumber', page.order_number,
      'customerName', page.customer_name,
      'description', page.description,
      'cursorAt', to_char(page.at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    ) order by page.at desc, page.id desc), '[]'::jsonb), count(*)::integer
  into v_page, v_rows
  from (
    select x.* from (
      (
        -- Primero los pagos de la página, en el orden de su índice; después su pedido (antes se juntaban todos)
        select (case when pp.kind = 'refund' then 'refund' else 'payment' end) as kind, pp.id, pp.paid_at as at,
          pp.amount_cents::integer as amount_cents, pp.method, pp.order_id, o.number as order_number,
          o.customer_name, null::text as description
        from (
          select p.id, p.kind, p.paid_at, p.amount_cents, p.method, p.order_id, p.business_id
          from public.payments p
          where p.business_id = v_business_id and p.voided_at is null
            and (v_start is null or p.paid_at >= v_start) and (v_end is null or p.paid_at < v_end)
            and (v_after_at is null or (p.paid_at, p.id) < (v_after_at, v_after_id))
          order by p.paid_at desc, p.id desc
          limit v_limit + 1
        ) as pp
        join public.orders o on o.business_id = pp.business_id and o.id = pp.order_id
      )
      union all
      (
        select 'manual', m.id, m.received_at, m.amount_cents::integer, m.method, null::uuid, null::integer, null::text,
          m.description
        from public.manual_incomes m
        where m.business_id = v_business_id and m.voided_at is null
          and (v_start is null or m.received_at >= v_start) and (v_end is null or m.received_at < v_end)
          and (v_after_at is null or (m.received_at, m.id) < (v_after_at, v_after_id))
        order by m.received_at desc, m.id desc
        limit v_limit + 1
      )
    ) as x
    order by x.at desc, x.id desc
    limit v_limit + 1
  ) as page;

  -- Se pidió uno de más: si llegó, hay otra página
  if v_rows > v_limit then
    v_page := v_page - v_limit;
    v_last := v_page -> (v_limit - 1);
  end if;

  return jsonb_build_object(
    'items', coalesce((
      select jsonb_agg(e.value - 'cursorAt' order by e.position) from jsonb_array_elements(v_page) with ordinality as e (value, position)
    ), '[]'::jsonb),
    'meta', jsonb_build_object(
      'limit', v_limit,
      'total', v_total,
      'hasMore', v_rows > v_limit,
      'nextCursor', case when v_rows > v_limit then replace(encode(convert_to(
        (v_last ->> 'cursorAt') || '|' || (v_last ->> 'id'), 'UTF8'), 'base64'), E'\n', '') end
    )
  );
end;
$$;
