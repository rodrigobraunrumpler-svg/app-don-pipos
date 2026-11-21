-- pg_net quedó anotada en public (la migración web_sync la creó sin esquema) y el revisor de Supabase la quiere fuera.
-- No se puede mover (no es relocatable): se vuelve a crear en extensions. Sus funciones siguen en el esquema net, así que
-- private.kick_web_sync no cambia. Sin cascade: si algo dependiera de ella, la migración falla en vez de borrarlo
drop extension if exists pg_net;
create extension pg_net with schema extensions;
