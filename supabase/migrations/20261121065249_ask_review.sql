-- Fase 9 (docs/plan/fase-9-alfajores-web.md, tarea 6): «Pedir reseña», el mensaje de WhatsApp para pedirle al cliente
-- su opinión en Google, con el enlace del negocio (business_settings.review_url)
alter table public.message_templates drop constraint message_templates_key_known;
alter table public.message_templates add constraint message_templates_key_known check (
  key in ('confirmation', 'on_the_way', 'ready', 'delivered', 'balance_reminder', 'we_miss_you', 'ask_review')
);

create or replace function private.default_templates() returns table (key text, body text)
language sql
immutable
set search_path = ''
as $$
  select t.key, t.body from (values
    ('confirmation', 'Hola {nombre}, recibimos tu pedido {numero}: {detalle}. Total: {total}. {adelanto} {entrega} ¡Gracias!'),
    ('on_the_way', 'Hola {nombre}, tu pedido {numero} va en camino. {pago}'),
    ('ready', 'Hola {nombre}, tu pedido {numero} está listo para recoger. {pago}'),
    ('delivered', '¡Gracias por tu compra, {nombre}! {sellos}'),
    ('balance_reminder', 'Hola {nombre}, te recordamos el saldo de tu pedido {numero}: {falta}. Puedes pagar por Yape, Plin, transferencia o efectivo.'),
    ('we_miss_you', 'Hola {nombre}, hace tiempo que no te vemos por Don Pipos. ¿Se te antoja un alfajor esta semana?'),
    ('ask_review', 'Hola {nombre}, gracias por tu pedido de Don Pipos. ¿Nos dejas tu opinión en Google? Nos ayuda mucho: {enlace}')
  ) as t (key, body);
$$;

create or replace function private.template_placeholders(p_key text) returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_key
    when 'confirmation' then array['nombre', 'numero', 'detalle', 'total', 'adelanto', 'entrega']
    when 'on_the_way' then array['nombre', 'numero', 'pago', 'falta']
    when 'ready' then array['nombre', 'numero', 'pago', 'falta']
    when 'delivered' then array['nombre', 'sellos']
    when 'balance_reminder' then array['nombre', 'numero', 'falta']
    when 'we_miss_you' then array['nombre']
    when 'ask_review' then array['nombre', 'enlace']
  end;
$$;

-- Los negocios que ya existían también lo reciben (los nuevos, con init_business)
insert into public.message_templates (business_id, key, body)
select b.id, t.key, t.body from public.businesses b cross join private.default_templates() t
where t.key = 'ask_review'
on conflict (business_id, key) do nothing;
