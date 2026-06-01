# PHVC Choice Board

A conditioning / choice board for the Varsity Cheer team.

- **Athletes** open the site (no login), pick their name, and upload a photo or
  video as proof they completed each tile.
- **Coaches** log in with their school Google account and see a live completion
  dashboard, view every athlete's uploaded evidence, and edit the board each
  month/season.

Built with Next.js + Supabase, deployed on Vercel.

---

## What you need (all free tiers)

1. A **Supabase** account → the database, file storage, and Google login.
2. A **Google Cloud** project → the "Sign in with Google" button.
3. A **Vercel** account → hosting (connect it to this GitHub repo).

Total setup time: ~20–30 minutes. Follow the steps in order.

---

## Step 1 — Create the Supabase project

1. Go to <https://supabase.com> → **New project**. Pick a name and a strong
   database password (you won't need the password again for this app).
2. When it finishes provisioning, open **SQL Editor → New query**.
3. Open the file [`supabase/schema.sql`](supabase/schema.sql) in this repo, copy
   everything, paste it into the query box, and click **Run**. This creates the
   tables, the private `artifacts` storage bucket, and seeds the example June
   board.
4. Go to **Settings → API** and copy these three values — you'll paste them into
   Vercel in Step 4:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** secret → `SUPABASE_SERVICE_ROLE_KEY`  ⚠️ keep this secret

---

## Step 2 — Set up Google sign-in (coaches only)

1. Go to <https://console.cloud.google.com> → create/select a project.
2. **APIs & Services → OAuth consent screen** → choose **Internal** (if your
   school uses Google Workspace) or **External**, fill in the app name and your
   email, save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** →
   application type **Web application**.
4. Under **Authorized redirect URIs**, add the callback URL Supabase gives you.
   Find it in Supabase under **Authentication → Providers → Google** — it looks
   like `https://YOUR-PROJECT.supabase.co/auth/v1/callback`. Paste that in.
5. Click create, then copy the **Client ID** and **Client secret**.
6. Back in Supabase: **Authentication → Providers → Google** → toggle it **on**,
   paste the Client ID and Client secret, and **Save**.

---

## Step 3 — Decide who the coaches are

Coaches are controlled by an environment variable (no code changes needed):

```
ALLOWED_COACH_EMAILS=coach1@yourschool.org,coach2@yourschool.org
```

Anyone who signs in with Google but isn't on this list is rejected. You can edit
this list anytime in Vercel and redeploy.

---

## Step 4 — Deploy on Vercel

1. Go to <https://vercel.com> → **Add New → Project** → import the
   `jmackwardlaw/PHVC-ChoiceBoard` GitHub repo.
2. Before deploying, open **Environment Variables** and add:

   | Name | Value |
   |------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Step 1 |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Step 1 (secret) |
   | `ALLOWED_COACH_EMAILS` | your coach emails, comma-separated |
   | `NEXT_PUBLIC_SITE_URL` | your Vercel URL, e.g. `https://phvc-choiceboard.vercel.app` |

   (You can add `NEXT_PUBLIC_SITE_URL` after the first deploy once you know the
   URL, then redeploy.)
3. Click **Deploy**.
4. In Supabase, go to **Authentication → URL Configuration** and set the **Site
   URL** to your Vercel URL so the Google redirect lands in the right place.

That's it. Share the main URL with athletes; coaches go to `/coach`.

---

## Day-to-day use

- **Athletes:** open the site → pick their name → tap a tile → upload a photo or
  video. A device remembers them so they don't reselect every time.
- **Coaches:** go to `/coach`, sign in with Google.
  - **Dashboard** — completion grid for everyone, who finished all tasks, and a
    click-to-view of every uploaded artifact.
  - **Edit board** — rename tiles, change the title/month/accent color, add or
    remove tiles, and **Start a new month** (clones the tiles into a fresh board
    and archives the old one so its uploads stay as history).
  - **Roster** — add athletes one at a time or paste a whole list; rename,
    deactivate, or remove them.

---

## Running locally (optional)

```bash
cp .env.example .env.local   # then fill in the values
npm install
npm run dev
```

Open <http://localhost:3000>. For local Google login, also add
`http://localhost:3000` to the Supabase **Site URL** / redirect allow-list while
testing.

---

## How it's wired (for the curious)

- All database access happens **on the server** with the Supabase service-role
  key. Row Level Security is on for every table with no public policies, so the
  browser can't touch the database directly even though athletes never log in.
- Large videos upload **straight from the browser to Supabase Storage** using a
  one-time signed URL (created server-side), so they never hit Vercel's request
  size limit.
- Coaches view artifacts through short-lived signed URLs that only an
  authenticated, allow-listed coach can request.
