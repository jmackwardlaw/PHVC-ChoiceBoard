-- ============================================================================
-- Migration: flyer position group + a weekly flyer board.
--
--  * athletes.position_group — 'flyer' marks a flyer; null/'base' is everyone else.
--  * boards.is_flyer         — marks the weekly flyer board so it can be active
--                              at the same time as the normal team board without
--                              the two colliding (the team board is is_flyer=false).
--  * tasks.target            — how many submissions a tile needs to count as done.
--                              Default 1 (team tiles = one upload). The flyer
--                              board sets its tiles to 5 (5 per week).
--
-- The flyer board resets weekly (Sunday–Saturday) — that's computed from each
-- submission's created_at at read time, so nothing here stores a week.
-- Safe to re-run. (Fresh installs already get these from schema.sql.)
-- ============================================================================

alter table athletes add column if not exists position_group text;
alter table boards   add column if not exists is_flyer boolean not null default false;
alter table tasks    add column if not exists target int not null default 1;
