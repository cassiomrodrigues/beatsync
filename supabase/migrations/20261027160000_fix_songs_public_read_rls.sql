-- Fix: Biblioteca Global não exibia músicas públicas.
--
-- Causa (banco): a única policy de SELECT em public.songs era restrita ao role
-- `authenticated`. O app usa uma barreira de login local (AuthGuardService) que
-- NÃO cria sessão no Supabase Auth, então as consultas chegam como `anon` e o
-- RLS filtrava silenciosamente todas as linhas (resultado vazio, sem erro).
--
-- Correções:
--   1. Separa a policy combinada em 3 policies permissivas e independentes;
--      músicas com is_public = true passam a ser legíveis por anon e authenticated.
--      Escrita continua exigindo authenticated + dono (menor privilégio).
--   2. Envolve auth.uid()/auth.jwt() em (select ...) para avaliação única por
--      query em vez de por linha (security-rls-performance).
--   3. Índice parcial alinhado à query da Biblioteca Global
--      (WHERE is_public ORDER BY created_at DESC LIMIT 100) substituindo o
--      índice btree de baixa seletividade em coluna booleana.
--   4. Índice de expressão em lower(shared_with_email), usado pelas policies.

begin;

-- 1. SELECT policies -------------------------------------------------------
drop policy if exists "Users can view own songs, public songs, and shared songs" on public.songs;

create policy "Public songs are readable by everyone"
  on public.songs
  for select
  to anon, authenticated
  using (is_public = true);

create policy "Owners can read own songs"
  on public.songs
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Recipients can read songs shared with them"
  on public.songs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.song_shares ss
      where ss.song_id = songs.id
        and (
          ss.shared_with_user_id = (select auth.uid())
          or lower(ss.shared_with_email) = lower((select auth.jwt() ->> 'email'))
        )
    )
  );

-- 2. Write policies: same semantics, per-query auth evaluation ---------------
alter policy "Users can insert own songs"
  on public.songs
  with check ((select auth.uid()) = user_id);

alter policy "Users can delete own songs"
  on public.songs
  using ((select auth.uid()) = user_id);

alter policy "Users can update own songs or shared songs with edit permission"
  on public.songs
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.song_shares ss
      where ss.song_id = songs.id
        and ss.can_edit = true
        and (
          ss.shared_with_user_id = (select auth.uid())
          or lower(ss.shared_with_email) = lower((select auth.jwt() ->> 'email'))
        )
    )
  );

-- 3. Global library index ----------------------------------------------------
drop index if exists public.idx_songs_is_public;

create index if not exists idx_songs_public_created_at
  on public.songs (created_at desc)
  where is_public = true;

-- 4. Share lookups by normalized e-mail (used in RLS) -------------------------
create index if not exists idx_song_shares_lower_email
  on public.song_shares (lower(shared_with_email));

commit;
