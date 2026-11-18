-- Adım 10a:
--  Madde 47: Kurumsal müşteri hesabı — şirket profili, üyeler ve roller (sahip / onaylayan / talep eden), e-posta ile davet.
--  Madde 51: Satın alma onay akışı — "talep eden" rolündeki üyenin şirket adına talebi önce şirketin onaylayanına gider;
--            onaylanmayan talep firmaya (yöneticilere) görünmez ve bildirim gitmez.
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 2 and 120),
  tax_number text check (tax_number is null or length(tax_number) <= 20),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.company_members (
  company_id uuid not null references public.companies (id) on delete cascade,
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'approver', 'requester')),
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create table public.company_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  email text not null check (email = lower(trim(email)) and position('@' in email) > 1),
  role text not null check (role in ('owner', 'approver', 'requester')),
  invited_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, email)
);

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_invites enable row level security;

create or replace function private.my_company_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select company_id from public.company_members where user_id = (select auth.uid());
$$;

create or replace function private.my_company_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.company_members where user_id = (select auth.uid());
$$;

create or replace function private.my_email()
returns text
language sql
stable
set search_path = ''
as $$
  select lower(coalesce((select auth.jwt()) ->> 'email', ''));
$$;

create policy "Üye kendi şirketini, admin hepsini görür" on public.companies
  for select to authenticated using (id = (select private.my_company_id()) or (select private.is_admin())
    or exists (select 1 from public.company_invites i where i.company_id = companies.id and i.email = (select private.my_email())));
create policy "Üye şirket üyelerini, admin hepsini görür" on public.company_members
  for select to authenticated using (company_id = (select private.my_company_id()) or (select private.is_admin()));
create policy "Sahip davetleri, davetli kendi davetini görür" on public.company_invites
  for select to authenticated using (
    (company_id = (select private.my_company_id()) and (select private.my_company_role()) = 'owner')
    or email = (select private.my_email())
  );
-- Yazmalar yalnız aşağıdaki fonksiyonlarla.
revoke insert, update, delete on public.companies, public.company_members, public.company_invites from anon, authenticated;

-- Şirket oluştur: çağıran sahip olur. Kişi tek şirkete üye olabilir.
create or replace function public.create_company(p_name text, p_tax_number text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if exists (select 1 from public.company_members where user_id = v_uid) then
    raise exception 'already member' using errcode = '22023';
  end if;
  insert into public.companies (name, tax_number, created_by) values (trim(p_name), nullif(trim(coalesce(p_tax_number, '')), ''), v_uid)
  returning id into v_id;
  insert into public.company_members (company_id, user_id, role) values (v_id, v_uid, 'owner');
  delete from public.company_invites where email = (select private.my_email());
  return v_id;
end;
$$;

create or replace function public.invite_company_member(p_email text, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid := (select private.my_company_id());
  v_email text := lower(trim(p_email));
begin
  if v_company is null or (select private.my_company_role()) <> 'owner' then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_role not in ('owner', 'approver', 'requester') then raise exception 'invalid role' using errcode = '22023'; end if;
  if exists (select 1 from public.company_members m join auth.users u on u.id = m.user_id where m.company_id = v_company and lower(u.email) = v_email) then
    raise exception 'already member' using errcode = '22023';
  end if;
  insert into public.company_invites (company_id, email, role, invited_by)
  values (v_company, v_email, p_role, (select auth.uid()))
  on conflict (company_id, email) do update set role = excluded.role, invited_by = excluded.invited_by, created_at = now();
end;
$$;

create or replace function public.accept_company_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.company_invites%rowtype;
  v_uid uuid := (select auth.uid());
begin
  select * into v_invite from public.company_invites where id = p_invite_id and email = (select private.my_email());
  if not found then raise exception 'invite not found' using errcode = 'P0002'; end if;
  if exists (select 1 from public.company_members where user_id = v_uid) then
    raise exception 'already member' using errcode = '22023';
  end if;
  insert into public.company_members (company_id, user_id, role) values (v_invite.company_id, v_uid, v_invite.role);
  delete from public.company_invites where email = v_invite.email;
end;
$$;

-- Davet iptali (sahip) ya da reddi (davetli).
create or replace function public.delete_company_invite(p_invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.company_invites i
   where i.id = p_invite_id
     and (i.email = (select private.my_email())
          or (i.company_id = (select private.my_company_id()) and (select private.my_company_role()) = 'owner'));
end;
$$;

create or replace function public.set_company_member_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid := (select private.my_company_id());
begin
  if v_company is null or (select private.my_company_role()) <> 'owner' then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_role not in ('owner', 'approver', 'requester') then raise exception 'invalid role' using errcode = '22023'; end if;
  if p_user_id = (select auth.uid()) and p_role <> 'owner'
     and (select count(*) from public.company_members where company_id = v_company and role = 'owner') < 2 then
    raise exception 'last owner' using errcode = '22023';
  end if;
  update public.company_members set role = p_role where company_id = v_company and user_id = p_user_id;
end;
$$;

-- Sahip üyeyi çıkarır; üye kendisi ayrılabilir (son sahip ayrılamaz).
create or replace function public.remove_company_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company uuid := (select private.my_company_id());
  v_uid uuid := (select auth.uid());
  v_target_role text;
begin
  if v_company is null then raise exception 'not allowed' using errcode = '42501'; end if;
  if p_user_id <> v_uid and (select private.my_company_role()) <> 'owner' then raise exception 'not allowed' using errcode = '42501'; end if;
  select role into v_target_role from public.company_members where company_id = v_company and user_id = p_user_id;
  if v_target_role = 'owner' and (select count(*) from public.company_members where company_id = v_company and role = 'owner') < 2 then
    raise exception 'last owner' using errcode = '22023';
  end if;
  delete from public.company_members where company_id = v_company and user_id = p_user_id;
end;
$$;

-- Üyeler (ad ve e-postayla; profiller başka kullanıcıya kapalı olduğundan fonksiyonla).
create or replace function public.list_company_members()
returns table (user_id uuid, full_name text, email text, role text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, coalesce(nullif(trim(p.full_name), ''), split_part(u.email, '@', 1)), u.email::text, m.role, m.created_at
    from public.company_members m
    join public.profiles p on p.id = m.user_id
    join auth.users u on u.id = m.user_id
   where m.company_id = (select private.my_company_id())
   order by case m.role when 'owner' then 0 when 'approver' then 1 else 2 end, m.created_at;
$$;

-- ---------------------------------------------------------------------------
-- Madde 51: talep onayı
-- ---------------------------------------------------------------------------
alter table public.leads
  add column company_id uuid references public.companies (id) on delete set null,
  add column approval_status text not null default 'not_required' check (approval_status in ('not_required', 'pending', 'approved', 'rejected')),
  add column approved_by uuid references public.profiles (id) on delete set null,
  add column approved_at timestamptz;

create index leads_company_idx on public.leads (company_id, approval_status);

grant insert (company_id) on public.leads to authenticated;

drop policy "Müşteri kendi taleplerini, admin hepsini görür" on public.leads;
create policy "Müşteri kendi taleplerini, şirket onaylayanı şirket taleplerini, admin onaylılarını görür" on public.leads
  for select to authenticated using (
    (select auth.uid()) = user_id
    or ((select private.is_admin()) and approval_status in ('not_required', 'approved'))
    or (company_id is not null and company_id = (select private.my_company_id()) and (select private.my_company_role()) in ('owner', 'approver'))
  );

-- Yeni talep: şirket adına ise üyelik denetlenir; talep eden → onay bekler, sahip/onaylayan → onaylı.
create or replace function private.prepare_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  new.status := 'new';
  new.contact_phone := trim(new.contact_phone);
  new.note := nullif(trim(coalesce(new.note, '')), '');
  new.approval_status := 'not_required';
  new.approved_by := null;
  new.approved_at := null;
  if new.company_id is not null then
    select role into v_role from public.company_members where company_id = new.company_id and user_id = new.user_id;
    if v_role is null then raise exception 'not a company member' using errcode = '42501'; end if;
    if v_role = 'requester' then
      new.approval_status := 'pending';
    else
      new.approval_status := 'approved';
      new.approved_by := new.user_id;
      new.approved_at := now();
    end if;
  end if;
  if new.advisor_id is null then
    select a.id into new.advisor_id from public.advisors a where a.active order by random() limit 1;
  end if;
  return new;
end;
$$;

-- Yöneticilere yeni talep bildirimi: onay bekleyen talepte gönderilmez; onun yerine şirketin onaylayanlarına gider.
create or replace function private.notify_admins_new_lead()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  customer_name text;
  listing_title text;
begin
  select coalesce(nullif(trim(p.full_name), ''), 'Müşteri') into customer_name from public.profiles p where p.id = new.user_id;
  select l.title into listing_title from public.listings l where l.id = new.listing_id;

  if new.approval_status = 'pending' then
    insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
    select m.user_id, 'lead_new', 'Onay bekleyen talep: ' || coalesce(customer_name, 'Üye'),
           private.lead_topic_label(new.topic) || coalesce(' · ' || listing_title, ''), new.listing_id, new.id
      from public.company_members m
     where m.company_id = new.company_id and m.role in ('owner', 'approver') and m.user_id <> new.user_id;
    return null;
  end if;

  insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
  select a.id, 'lead_new', 'Yeni talep: ' || coalesce(customer_name, 'Müşteri'),
         private.lead_topic_label(new.topic) || coalesce(' · ' || listing_title, ''), new.listing_id, new.id
    from public.profiles a
   where a.role = 'admin' and a.id is distinct from new.user_id;
  return null;
end;
$$;

-- Onaylayan karar verir: onayda talep firmaya iletilir (yöneticilere bildirim), her iki durumda talep sahibine bildirim.
create or replace function public.decide_company_lead(p_lead_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lead public.leads%rowtype;
  v_customer text;
  v_listing text;
begin
  select * into v_lead from public.leads where id = p_lead_id;
  if not found or v_lead.company_id is null or v_lead.company_id <> (select private.my_company_id())
     or (select private.my_company_role()) not in ('owner', 'approver') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_lead.approval_status <> 'pending' then raise exception 'already decided' using errcode = '22023'; end if;

  update public.leads
     set approval_status = case when p_approve then 'approved' else 'rejected' end,
         approved_by = (select auth.uid()), approved_at = now(),
         status = case when p_approve then status else 'cancelled' end
   where id = p_lead_id;

  insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
  values (v_lead.user_id, 'lead_update',
          case when p_approve then 'Talebiniz şirketinizce onaylandı' else 'Talebiniz şirketinizce reddedildi' end,
          private.lead_topic_label(v_lead.topic) || case when p_approve then ' · Neşeli Otomotiv''e iletildi' else '' end,
          v_lead.listing_id, v_lead.id);

  if p_approve then
    select coalesce(nullif(trim(p.full_name), ''), 'Müşteri') into v_customer from public.profiles p where p.id = v_lead.user_id;
    select l.title into v_listing from public.listings l where l.id = v_lead.listing_id;
    insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
    select a.id, 'lead_new', 'Yeni talep: ' || v_customer,
           private.lead_topic_label(v_lead.topic) || coalesce(' · ' || v_listing, ''), v_lead.listing_id, v_lead.id
      from public.profiles a where a.role = 'admin';
  end if;
end;
$$;

-- Talep sahibinin durum bildirimi, reddetmede ("cancelled") ayrıca gönderilmesin.
create or replace function private.notify_lead_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  advisor_name text;
  title_text text := 'Talebiniz güncellendi';
  body_text text;
begin
  if new.approval_status is distinct from old.approval_status then
    return null;
  end if;
  if new.status is not distinct from old.status
     and new.advisor_id is not distinct from old.advisor_id
     and new.appointment_at is not distinct from old.appointment_at
     and new.appointment_location is not distinct from old.appointment_location then
    return null;
  end if;

  if new.appointment_at is distinct from old.appointment_at
     or (new.appointment_at is not null and new.appointment_location is distinct from old.appointment_location) then
    if new.appointment_at is not null then
      title_text := case when old.appointment_at is null then 'Randevunuz oluşturuldu' else 'Randevunuz güncellendi' end;
      body_text := private.lead_topic_label(new.topic) || ' · ' || private.format_appointment(new.appointment_at)
                   || coalesce(' · ' || new.appointment_location, '');
    else
      body_text := private.lead_topic_label(new.topic) || ' randevunuz iptal edildi';
    end if;
  elsif new.status is distinct from old.status then
    body_text := private.lead_topic_label(new.topic) || ' talebi · ' || private.lead_status_label(new.status);
  elsif new.advisor_id is distinct from old.advisor_id then
    if new.advisor_id is null then
      return null;
    end if;
    select a.full_name into advisor_name from public.advisors a where a.id = new.advisor_id;
    body_text := 'Danışmanınız: ' || advisor_name;
  else
    return null;
  end if;

  insert into public.notifications (user_id, type, title, body, listing_id, lead_id)
  values (new.user_id, 'lead_update', title_text, body_text, new.listing_id, new.id);
  return null;
end;
$$;

-- Onaylayan için bekleyen talepler (talep edenin adıyla).
create or replace function public.list_company_pending_leads()
returns table (lead_id uuid, topic text, listing_title text, requester_name text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, l.topic, li.title, coalesce(nullif(trim(p.full_name), ''), 'Üye'), l.created_at
    from public.leads l
    left join public.listings li on li.id = l.listing_id
    left join public.profiles p on p.id = l.user_id
   where l.company_id = (select private.my_company_id())
     and (select private.my_company_role()) in ('owner', 'approver')
     and l.approval_status = 'pending'
   order by l.created_at desc;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'create_company(text, text)', 'invite_company_member(text, text)', 'accept_company_invite(uuid)', 'delete_company_invite(uuid)',
    'set_company_member_role(uuid, text)', 'remove_company_member(uuid)', 'list_company_members()', 'decide_company_lead(uuid, boolean)',
    'list_company_pending_leads()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
