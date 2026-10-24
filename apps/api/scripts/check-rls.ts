// Proves the public (publishable/anon) key can read, write and call nothing.
// Run: SUPABASE_URL=... SUPABASE_PUBLISHABLE_KEY=... node apps/api/scripts/check-rls.ts
// Exits non-zero if any table returns rows, accepts an insert, or any function can be called.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (the public key, not the secret).");
  process.exit(2);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const TABLES = ["profiles", "unlocks", "vault_logs", "saves", "runs"];
const FUNCTIONS: [string, Record<string, unknown>][] = [
  ["award_run", { p_profile: crypto.randomUUID(), p_run: {}, p_shards: 1, p_logs: [] }],
  ["purchase_unlock", { p_profile: crypto.randomUUID(), p_type: "mod", p_id: "x", p_cost: 1 }],
  ["import_guest", { p_profile: crypto.randomUUID(), p_shards: 1, p_unlocks: [], p_logs: [] }],
  ["leaderboard", { p_period: "all", p_kind: "fastest", p_limit: 1 }],
];

let leaks = 0;
for (const t of TABLES) {
  const read = await db.from(t).select("*").limit(1);
  const readOk = !read.error && (read.data?.length ?? 0) > 0;
  const write = await db.from(t).insert({});
  const writeOk = !write.error;
  console.log(
    `${t.padEnd(10)} read ${readOk ? "LEAK" : "denied"}  insert ${writeOk ? "LEAK" : "denied"}`,
  );
  if (readOk || writeOk) leaks++;
}
for (const [fn, args] of FUNCTIONS) {
  const { error } = await db.rpc(fn, args);
  // "permission denied" (42501) or "function not found" for the public role both mean denied.
  const ok = !error;
  console.log(`rpc ${fn.padEnd(16)} ${ok ? "LEAK" : "denied"}`);
  if (ok) leaks++;
}
process.exit(leaks ? 1 : 0);
