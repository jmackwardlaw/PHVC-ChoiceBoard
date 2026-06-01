-- ============================================================================
-- PHVC Choice Board — database schema
-- Run this in your Supabase project:  Dashboard → SQL Editor → New query → Run
-- Safe to re-run (uses "if not exists" / "on conflict").
-- ============================================================================

create extension if not exists pgcrypto;

-- A board = one month/cycle of tiles (e.g. "June Conditioning Board").
-- Only one board is "active" at a time; old boards are kept as history.
create table if not exists boards (
  id           uuid primary key default gen_random_uuid(),
  title        text not null default 'Conditioning Board',
  subtitle     text not null default '',          -- e.g. "June 2026"
  accent_color text not null default '#1AA0B8',
  columns      int  not null default 4,
  is_active    boolean not null default false,
  due_date         date,                              -- optional deadline; board locks after this day
  show_leaderboard boolean not null default false,    -- show the team leaderboard to athletes
  created_at   timestamptz not null default now(),
  archived_at  timestamptz
);

-- Columns added after the first release; safe to run on an existing database.
alter table boards add column if not exists due_date date;
alter table boards add column if not exists show_leaderboard boolean not null default false;

-- Tiles on a board. "position" orders them left-to-right, top-to-bottom.
create table if not exists tasks (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references boards(id) on delete cascade,
  title      text not null,
  category   text not null default '',
  position   int  not null default 0,
  created_at timestamptz not null default now()
);

-- The team roster. Athletes are shared across every board.
create table if not exists athletes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- One uploaded piece of evidence for a (board, task, athlete).
create table if not exists submissions (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references boards(id) on delete cascade,
  task_id    uuid not null references tasks(id) on delete cascade,
  athlete_id uuid not null references athletes(id) on delete cascade,
  file_path  text not null,
  file_type  text not null default 'image',       -- 'image' | 'video'
  note       text not null default '',
  status     text not null default 'submitted',   -- 'submitted' | 'approved' | 'redo'
  created_at timestamptz not null default now()
);

create index if not exists submissions_board_idx   on submissions(board_id);
create index if not exists submissions_athlete_idx on submissions(athlete_id);
create index if not exists submissions_task_idx    on submissions(task_id);

-- ----------------------------------------------------------------------------
-- Security: lock every table down. The app talks to the database only from the
-- server using the SERVICE ROLE key, which bypasses RLS. With RLS enabled and
-- no policies, the public (anon) key can read/write NOTHING directly — so even
-- though athletes use the site without logging in, nobody can poke the database
-- from the browser.
-- ----------------------------------------------------------------------------
alter table boards      enable row level security;
alter table tasks       enable row level security;
alter table athletes    enable row level security;
alter table submissions enable row level security;

-- ----------------------------------------------------------------------------
-- Private storage bucket for the uploaded photos/videos.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('artifacts', 'artifacts', false)
on conflict (id) do nothing;

-- ============================================================================
-- Seed data: the June board from your screenshot + a couple sample athletes.
-- Delete the athletes later from the Roster page; edit the tiles from the
-- Board editor. Only seeds if there are no boards yet.
-- ============================================================================
do $$
declare
  b uuid;
begin
  if not exists (select 1 from boards) then
    insert into boards (title, subtitle, is_active)
    values ('June Conditioning Board', 'June 2026', true)
    returning id into b;

    insert into tasks (board_id, title, category, position) values
      (b, 'Tumbling Class',        'Tumbling',    0),
      (b, 'Tumbling Class',        'Tumbling',    1),
      (b, 'Tumbling Class',        'Tumbling',    2),
      (b, 'Tumbling Class',        'Tumbling',    3),
      (b, 'Cardio',                'Cardio',      4),
      (b, 'Cardio',                'Cardio',      5),
      (b, 'Cardio',                'Cardio',      6),
      (b, 'Cardio',                'Cardio',      7),
      (b, 'Weight Training',       'Strength',    8),
      (b, 'Weight Training',       'Strength',    9),
      (b, 'Weight Training',       'Strength',   10),
      (b, 'Weight Training',       'Strength',   11),
      (b, 'Flexibility/Stretching','Flexibility',12),
      (b, 'Flexibility/Stretching','Flexibility',13),
      (b, 'Flexibility/Stretching','Flexibility',14),
      (b, 'Flexibility/Stretching','Flexibility',15);

    insert into athletes (name) values
      ('Sample Athlete 1'),
      ('Sample Athlete 2'),
      ('Sample Athlete 3');
  end if;
end $$;
