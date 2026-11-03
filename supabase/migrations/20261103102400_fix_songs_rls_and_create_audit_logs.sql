-- Fix: Visibilidade da Biblioteca Global (RLS em public.songs e public.playlists),
-- criação da tabela public.audit_logs e triggers automáticas de auditoria
-- para INSERT, UPDATE e DELETE em songs, playlists e user_settings.

begin;

-- ============================================================================
-- 1. RLS POLICIES ON public.songs & public.playlists
--    Garante que registros em songs com is_public = true apareçam na
--    Biblioteca Global para qualquer usuário logado (authenticated) e anon,
--    preservando isolamento por auth.uid() para músicas privadas e escritas.
-- ============================================================================

alter policy "Public songs are readable by everyone"
  on public.songs
  to anon, authenticated
  using (is_public = true);

alter policy "Owners can read own songs"
  on public.songs
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "Recipients can read songs shared with them"
  on public.songs
  to authenticated
  using (
    exists (
      select 1
      from public.song_shares ss
      where ss.song_id = songs.id
        and (
          ss.shared_with_user_id = (select auth.uid())
          or lower(ss.shared_with_email) = lower(((select auth.jwt()) ->> 'email'))
        )
    )
  );

alter policy "Users can view own songs, public songs, and shared songs"
  on public.songs
  to authenticated
  using (
    is_public = true
    or (select auth.uid()) = user_id
    or exists (
      select 1
      from public.song_shares ss
      where ss.song_id = songs.id
        and (
          ss.shared_with_user_id = (select auth.uid())
          or lower(ss.shared_with_email) = lower(((select auth.jwt()) ->> 'email'))
        )
    )
  );

alter policy "Users can insert own songs"
  on public.songs
  to authenticated
  with check ((select auth.uid()) = user_id);

alter policy "Users can update own songs or shared songs with edit permission"
  on public.songs
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.song_shares ss
      where ss.song_id = songs.id
        and ss.can_edit = true
        and (
          ss.shared_with_user_id = (select auth.uid())
          or lower(ss.shared_with_email) = lower(((select auth.jwt()) ->> 'email'))
        )
    )
  )
  with check (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.song_shares ss
      where ss.song_id = songs.id
        and ss.can_edit = true
        and (
          ss.shared_with_user_id = (select auth.uid())
          or lower(ss.shared_with_email) = lower(((select auth.jwt()) ->> 'email'))
        )
    )
  );

alter policy "Users can delete own songs"
  on public.songs
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "Users can view own playlists or public playlists"
  on public.playlists
  to authenticated
  using ((select auth.uid()) = user_id or is_public = true);

alter policy "Users can view shares they created or received"
  on public.song_shares
  to authenticated
  using (
    shared_by = (select auth.uid())
    or shared_with_user_id = (select auth.uid())
    or lower(shared_with_email) = lower(((select auth.jwt()) ->> 'email'))
  );

-- ============================================================================
-- 2. AUDIT LOGS TABLE (public.audit_logs)
-- ============================================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  user_id uuid default auth.uid(),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_audit_logs_user_id
  on public.audit_logs (user_id);

create index if not exists idx_audit_logs_table_created_at
  on public.audit_logs (table_name, created_at desc);

create index if not exists idx_audit_logs_created_at
  on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

create policy "Users can view own audit logs or admin can view all"
  on public.audit_logs
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or lower(((select auth.jwt()) ->> 'email')) = 'teste@beatsync.com'
  );

create policy "Authenticated users can insert audit logs"
  on public.audit_logs
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    or user_id is null
  );

-- ============================================================================
-- 3. POSTGRESQL AUDIT TRIGGERS FOR songs, playlists, AND user_settings
-- ============================================================================

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_data jsonb := null;
  v_new_data jsonb := null;
  v_record_id text := null;
  v_user_id uuid := auth.uid();
begin
  if (TG_OP = 'INSERT') then
    v_new_data := to_jsonb(NEW);
    v_record_id := coalesce(v_new_data ->> 'id', v_new_data ->> 'user_id');
    v_user_id := coalesce(v_user_id, (v_new_data ->> 'user_id')::uuid);
  elsif (TG_OP = 'UPDATE') then
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
    v_record_id := coalesce(v_new_data ->> 'id', v_new_data ->> 'user_id');
    v_user_id := coalesce(v_user_id, (v_new_data ->> 'user_id')::uuid, (v_old_data ->> 'user_id')::uuid);
  elsif (TG_OP = 'DELETE') then
    v_old_data := to_jsonb(OLD);
    v_record_id := coalesce(v_old_data ->> 'id', v_old_data ->> 'user_id');
    v_user_id := coalesce(v_user_id, (v_old_data ->> 'user_id')::uuid);
  end if;

  insert into public.audit_logs (
    table_name,
    record_id,
    action,
    user_id,
    old_data,
    new_data,
    created_at
  ) values (
    TG_TABLE_NAME,
    v_record_id,
    TG_OP,
    v_user_id,
    v_old_data,
    v_new_data,
    timezone('utc'::text, now())
  );

  if (TG_OP = 'DELETE') then
    return OLD;
  end if;
  return NEW;
end;
$$;

revoke execute on function public.log_audit_event() from public, anon, authenticated;

create or replace trigger trg_songs_audit_log
  after insert or update or delete on public.songs
  for each row
  execute function public.log_audit_event();

create or replace trigger trg_playlists_audit_log
  after insert or update or delete on public.playlists
  for each row
  execute function public.log_audit_event();

create or replace trigger trg_user_settings_audit_log
  after insert or update or delete on public.user_settings
  for each row
  execute function public.log_audit_event();

commit;
