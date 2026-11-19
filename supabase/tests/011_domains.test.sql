select plan(10);

select lives_ok($$select 'yape'::public.payment_method$$, 'yape es un medio de pago');
select throws_ok($$select 'card'::public.payment_method$$, '23514', null, 'tarjeta no lo es');
select lives_ok($$select 0::public.cents$$, 'cero céntimos vale');
select throws_ok($$select (-1)::public.cents$$, '23514', null, 'un monto negativo no');
select lives_ok($$select 1::public.positive_cents$$, 'un céntimo es un monto positivo');
select throws_ok($$select 0::public.positive_cents$$, '23514', null, 'cero no es positivo');
select lives_ok($$select '+51987654321'::public.phone_pe$$, 'un celular con +51 y 9 dígitos vale');
select throws_ok($$select '987654321'::public.phone_pe$$, '23514', null, 'sin +51 no');
select throws_ok($$select '+5198765432'::public.phone_pe$$, '23514', null, 'con 8 dígitos no');
select throws_ok($$select '+51 987654321'::public.phone_pe$$, '23514', null, 'con un espacio no');

select * from finish();
