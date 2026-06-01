import { createAdminClient } from "./supabase/admin";
import type { Athlete, Board, Submission, Task } from "./types";

export async function getActiveBoard(): Promise<Board | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("boards")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as Board | null;
}

export async function getBoardById(id: string): Promise<Board | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("boards")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data as Board | null;
}

export async function getAllBoards(): Promise<Board[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("boards")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as Board[];
}

export async function getTasks(boardId: string): Promise<Task[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("board_id", boardId)
    .order("position", { ascending: true });
  return (data ?? []) as Task[];
}

export async function getAthletes(activeOnly = false): Promise<Athlete[]> {
  const supabase = createAdminClient();
  let query = supabase.from("athletes").select("*").order("name");
  if (activeOnly) query = query.eq("active", true);
  const { data } = await query;
  return (data ?? []) as Athlete[];
}

export async function getSubmissionsForBoard(
  boardId: string,
): Promise<Submission[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Submission[];
}

export async function getSubmissionsForAthlete(
  boardId: string,
  athleteId: string,
): Promise<Submission[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("submissions")
    .select("*")
    .eq("board_id", boardId)
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Submission[];
}
