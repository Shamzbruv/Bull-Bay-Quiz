-- Roles + row-level security (spec §47).
-- Not wired to the app yet (Phase 1 ships with a local host-PIN gate
-- instead — see src/lib/auth). This migration exists so a future Supabase
-- Auth pass has the schema ready to build on: admin/quizmaster/viewer
-- profiles keyed to auth.users, with RLS restricting quiz writes to
-- admin/quizmaster and leaving read access open (a presentation screen has
-- no logged-in user).

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('admin', 'quizmaster', 'viewer')),
  display_name text,
  created_at timestamptz not null default now()
);

alter table quizzes enable row level security;
alter table questions enable row level security;
alter table game_sessions enable row level security;
alter table game_teams enable row level security;
alter table profiles enable row level security;

create policy "Quizzes are publicly readable" on quizzes for select using (true);
create policy "Questions are publicly readable" on questions for select using (true);
create policy "Game sessions are publicly readable" on game_sessions for select using (true);
create policy "Game teams are publicly readable" on game_teams for select using (true);

create policy "Admins and quizmasters manage quizzes" on quizzes for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'quizmaster'))
);
create policy "Admins and quizmasters manage questions" on questions for all using (
  exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'quizmaster'))
);
create policy "Signed-in users record game sessions" on game_sessions for insert with check (auth.uid() is not null);
create policy "Signed-in users record game teams" on game_teams for insert with check (auth.uid() is not null);

create policy "Users read their own profile" on profiles for select using (auth.uid() = id);
create policy "Admins read all profiles" on profiles for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
