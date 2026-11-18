-- Madde 3: Ticari araca özel filtreler. Tonaj, motor gücü, kabin tipi, şasi ve üstyapı `listings.attributes` içinde tutulur
-- (filtreler mevcut `attributes->>…` desenini kullanır). Yönetici bu fonksiyonla yalnız bu anahtarları yazar; diğer anahtarlar
-- (financing, source…) korunur. SECURITY INVOKER: ilan güncelleme RLS'i (yalnız yönetici) geçerlidir.
create or replace function public.set_listing_specs(p_listing_id uuid, p_specs jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  allowed constant text[] := array['tonnage_t', 'engine_hp', 'cab_type', 'chassis', 'body_builder'];
  clean jsonb;
begin
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into clean
    from jsonb_each(coalesce(p_specs, '{}'::jsonb))
   where key = any(allowed) and value <> 'null'::jsonb and value <> '""'::jsonb;

  if clean ? 'cab_type' and clean ->> 'cab_type' not in ('standard', 'high', 'sleeper') then
    raise exception 'invalid cab_type' using errcode = '22023';
  end if;

  update public.listings
     set attributes = (attributes - allowed) || clean
   where id = p_listing_id;
  if not found then
    raise exception 'listing not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke execute on function public.set_listing_specs(uuid, jsonb) from public, anon;
grant execute on function public.set_listing_specs(uuid, jsonb) to authenticated;
