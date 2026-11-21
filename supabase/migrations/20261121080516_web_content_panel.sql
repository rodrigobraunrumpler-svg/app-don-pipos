-- Fase 9, después de la revisión final: un alfajor que nació en el panel (lo enlazó el equipo, sin fecha de publicación
-- desde la app) conserva su nombre de allá: cambiarle la foto o la descripción en la app ya no convierte «Alfajor de
-- Manteadita» en «Alfajor Manteadita». Sus alérgenos tampoco se borran si la app no tiene ninguno. Los que creó la app, y
-- los que todavía no están en la web, llevan el nombre y los alérgenos de la app
create or replace function private.web_content(p_product_id uuid) returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'name', case when p.sanity_id is null or p.web_published_at is not null then private.web_name(p.name) end,
    'description', p.description,
    'allergens', case when p.sanity_id is null or cardinality(p.allergens) > 0 then to_jsonb(p.allergens) end,
    'photoPath', p.photo_path,
    'photoChanged', p.photo_path is not null and p.photo_path is distinct from p.web_photo_path,
    'alt', private.web_name(p.name) || ' de Don Pipos'
  ))
  from public.products p
  where p.id = p_product_id;
$$;
