-- El consejero de seguridad de Supabase avisa por cada función security definer del esquema public
-- que la app puede ejecutar. Regla desde aquí: la lógica que escribe vive en private (security definer)
-- y en public queda solo una envoltura, sin permisos elevados, que la llama.

alter function public.update_settings(integer, jsonb) set schema private;

create function public.update_settings(p_expected_version integer, p_patch jsonb) returns jsonb
language sql
set search_path = ''
as $$
  select private.update_settings(p_expected_version, p_patch);
$$;

grant execute on function public.update_settings(integer, jsonb) to authenticated;
