import { createBrowserClient } from "@supabase/ssr";

// Public client for the browser (anon key). Used for the coach Google sign-in
// and for uploading files to signed storage URLs. Has no direct DB access
// because RLS blocks the anon key.
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
