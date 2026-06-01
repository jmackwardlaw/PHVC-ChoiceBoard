-- ============================================================================
-- Migration: let each board choose whether coach approval is required.
-- When require_approval is true (the default), athlete uploads land as
-- "submitted" and wait for the coach to approve or send back for a redo.
-- When false, uploads are auto-accepted (saved as "approved") on submit.
-- Run this in Supabase → SQL Editor if your database predates this feature.
-- Safe to re-run. (Fresh installs already get this from schema.sql.)
-- ============================================================================

alter table boards add column if not exists require_approval boolean not null default true;
