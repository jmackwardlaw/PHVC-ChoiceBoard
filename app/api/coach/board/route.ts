import { NextResponse } from "next/server";
import { getCoach } from "@/lib/coach";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteObjects } from "@/lib/r2";

export const dynamic = "force-dynamic";

type Tile = { id?: string; title: string; category?: string };

export async function POST(request: Request) {
  const coach = await getCoach();
  if (!coach) {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const action = body.action as string;

  // Save board meta + reconcile its tiles (add / edit / delete / reorder).
  if (action === "save") {
    const boardId = body.boardId as string;
    if (!boardId) return NextResponse.json({ error: "Missing boardId." }, { status: 400 });

    const tiles = (body.tiles as Tile[] | undefined) ?? [];

    await supabase
      .from("boards")
      .update({
        title: String(body.title ?? "Choice Board").slice(0, 120),
        subtitle: String(body.subtitle ?? "").slice(0, 120),
        accent_color: String(body.accent_color ?? "#e20706").slice(0, 9),
        columns: clampColumns(Number(body.columns)),
        due_date: normalizeDate(body.due_date),
        show_leaderboard: Boolean(body.show_leaderboard),
        require_approval: Boolean(body.require_approval),
      })
      .eq("id", boardId);

    const { data: existing } = await supabase
      .from("tasks")
      .select("id")
      .eq("board_id", boardId);
    const existingIds = new Set((existing ?? []).map((t) => t.id as string));
    const keptIds = new Set<string>();

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const title = (tile.title ?? "").trim().slice(0, 120) || "Untitled";
      const category = (tile.category ?? "").trim().slice(0, 60);
      if (tile.id && existingIds.has(tile.id)) {
        keptIds.add(tile.id);
        await supabase
          .from("tasks")
          .update({ title, category, position: i })
          .eq("id", tile.id);
      } else {
        await supabase
          .from("tasks")
          .insert({ board_id: boardId, title, category, position: i });
      }
    }

    const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
    if (toDelete.length) {
      await supabase.from("tasks").delete().in("id", toDelete);
    }

    return NextResponse.json({ ok: true });
  }

  // Start a fresh month: clone the current board's tiles into a new active
  // board and archive the old one (so its submissions stay as history).
  if (action === "clone-new") {
    const fromBoardId = body.fromBoardId as string | undefined;

    let accent = "#e20706";
    let columns = 4;
    let showLeaderboard = false;
    let requireApproval = true;
    let tiles: Tile[] = [];
    if (fromBoardId) {
      const { data: src } = await supabase
        .from("boards")
        .select("accent_color, columns, show_leaderboard, require_approval")
        .eq("id", fromBoardId)
        .maybeSingle();
      if (src) {
        accent = src.accent_color as string;
        columns = src.columns as number;
        showLeaderboard = Boolean(src.show_leaderboard);
        requireApproval = src.require_approval !== false;
      }
      const { data: srcTasks } = await supabase
        .from("tasks")
        .select("title, category, position")
        .eq("board_id", fromBoardId)
        .order("position");
      tiles = (srcTasks ?? []) as Tile[];
    }

    // Archive every currently-active board.
    await supabase
      .from("boards")
      .update({ is_active: false, archived_at: new Date().toISOString() })
      .eq("is_active", true);

    const { data: newBoard, error } = await supabase
      .from("boards")
      .insert({
        title: String(body.title ?? "Choice Board").slice(0, 120),
        subtitle: String(body.subtitle ?? "").slice(0, 120),
        accent_color: accent,
        columns,
        show_leaderboard: showLeaderboard,
        require_approval: requireApproval,
        is_active: true,
      })
      .select()
      .single();

    if (error || !newBoard) {
      return NextResponse.json(
        { error: error?.message ?? "Could not create board." },
        { status: 500 },
      );
    }

    if (tiles.length) {
      await supabase.from("tasks").insert(
        tiles.map((t, i) => ({
          board_id: newBoard.id,
          title: t.title,
          category: t.category ?? "",
          position: i,
        })),
      );
    }

    return NextResponse.json({ ok: true, boardId: newBoard.id });
  }

  // Permanently delete a past board: its uploaded files, then the row
  // (tasks + submissions cascade away). Refuses to delete the active board.
  if (action === "delete") {
    const boardId = body.boardId as string;
    if (!boardId) return NextResponse.json({ error: "Missing boardId." }, { status: 400 });

    const { data: target } = await supabase
      .from("boards")
      .select("is_active")
      .eq("id", boardId)
      .maybeSingle();

    if (!target) {
      return NextResponse.json({ error: "Board not found." }, { status: 404 });
    }
    if (target.is_active) {
      return NextResponse.json(
        { error: "This board is active. Make another board active first, then delete it." },
        { status: 400 },
      );
    }

    // Remove the uploaded photos/videos from storage so they don't linger.
    const { data: subs } = await supabase
      .from("submissions")
      .select("file_path")
      .eq("board_id", boardId);
    const paths = (subs ?? [])
      .map((s) => s.file_path as string)
      .filter(Boolean);
    if (paths.length) {
      await deleteObjects(paths);
    }

    const { error } = await supabase.from("boards").delete().eq("id", boardId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Make a past board the active one again.
  if (action === "activate") {
    const boardId = body.boardId as string;
    if (!boardId) return NextResponse.json({ error: "Missing boardId." }, { status: 400 });
    await supabase
      .from("boards")
      .update({ is_active: false, archived_at: new Date().toISOString() })
      .eq("is_active", true);
    await supabase
      .from("boards")
      .update({ is_active: true, archived_at: null })
      .eq("id", boardId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

function clampColumns(n: number): number {
  if (!Number.isFinite(n)) return 4;
  return Math.min(6, Math.max(1, Math.round(n)));
}

// Accept "YYYY-MM-DD" from a date input; anything else clears the deadline.
function normalizeDate(v: unknown): string | null {
  if (typeof v !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  return v;
}
