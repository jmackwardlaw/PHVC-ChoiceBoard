-- ============================================================================
-- Migration: add a due date + a "show leaderboard to athletes" switch to boards.
-- Run this in Supabase → SQL Editor if you set up the database BEFORE these
-- features existed. Safe to re-run. (Fresh installs already get these from
-- schema.sql.)
-- ============================================================================

alter table boards add column if not exists due_date date;
alter table boards add column if not exists show_leaderboard boolean not null default false;
