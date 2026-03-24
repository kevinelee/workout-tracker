/**
 * M7 — Supabase Backend + Auth scaffold
 *
 * Setup steps:
 * 1. Create a project at https://supabase.com
 * 2. Copy your URL and anon key from Project Settings → API
 * 3. Add to .env:
 *      VITE_SUPABASE_URL=https://your-project.supabase.co
 *      VITE_SUPABASE_ANON_KEY=your-anon-key
 * 4. Run: npm install @supabase/supabase-js
 * 5. Uncomment the code below
 *
 * SQL to run in Supabase SQL editor:
 *
 *   create table sessions (
 *     id text primary key,
 *     user_id uuid references auth.users not null,
 *     template_id text,
 *     started_at timestamptz,
 *     finished_at timestamptz,
 *     duration int,
 *     logs jsonb,
 *     created_at timestamptz default now()
 *   );
 *   alter table sessions enable row level security;
 *   create policy "Users own their sessions" on sessions
 *     for all using (auth.uid() = user_id);
 *
 *   create table templates (
 *     id text primary key,
 *     user_id uuid references auth.users not null,
 *     name text,
 *     exercises jsonb,
 *     created_at timestamptz default now()
 *   );
 *   alter table templates enable row level security;
 *   create policy "Users own their templates" on templates
 *     for all using (auth.uid() = user_id);
 */

// import { createClient } from '@supabase/supabase-js'
//
// export const supabase = createClient(
//   import.meta.env.VITE_SUPABASE_URL,
//   import.meta.env.VITE_SUPABASE_ANON_KEY
// )
//
// // --- Auth ---
// export async function signUp(email, password) {
//   return supabase.auth.signUp({ email, password })
// }
//
// export async function signIn(email, password) {
//   return supabase.auth.signInWithPassword({ email, password })
// }
//
// export async function signOut() {
//   return supabase.auth.signOut()
// }
//
// export function getUser() {
//   return supabase.auth.getUser()
// }
//
// // --- Cloud Sync ---
// // Call after login to push localStorage data to Supabase
// export async function syncToCloud(sessions, templates) {
//   const { data: { user } } = await supabase.auth.getUser()
//   if (!user) return
//
//   const sessionRows = sessions.map(s => ({ ...s, user_id: user.id }))
//   const templateRows = templates.map(t => ({ ...t, user_id: user.id }))
//
//   await supabase.from('sessions').upsert(sessionRows, { onConflict: 'id' })
//   await supabase.from('templates').upsert(templateRows, { onConflict: 'id' })
// }
//
// export async function fetchFromCloud() {
//   const [{ data: sessions }, { data: templates }] = await Promise.all([
//     supabase.from('sessions').select('*').order('finished_at', { ascending: false }),
//     supabase.from('templates').select('*'),
//   ])
//   return { sessions: sessions ?? [], templates: templates ?? [] }
// }

export {} // remove when uncommenting above
