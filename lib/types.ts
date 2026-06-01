export type Board = {
  id: string;
  title: string;
  subtitle: string;
  accent_color: string;
  columns: number;
  is_active: boolean;
  due_date: string | null;
  show_leaderboard: boolean;
  require_approval: boolean;
  created_at: string;
  archived_at: string | null;
};

export type Task = {
  id: string;
  board_id: string;
  title: string;
  category: string;
  position: number;
  created_at: string;
};

export type Athlete = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
};

export type Submission = {
  id: string;
  board_id: string;
  task_id: string;
  athlete_id: string;
  file_path: string;
  file_type: "image" | "video" | "manual";
  note: string;
  status: "submitted" | "approved" | "redo";
  created_at: string;
};
