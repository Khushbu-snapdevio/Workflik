// One-off backfill after switching search_index.search_vector from the
// 'english' to the 'simple' Postgres text-search config (see
// lib/search/index-page.ts). 'english' silently strips stop words ("just",
// "the", "and", ...) to zero lexemes, so any page whose title was or
// contained a stop word could never match a search for its own title.
// Existing search_index rows were built with the old 'english' vectors —
// switching only the query side (app/api/search/route.ts) without also
// rebuilding stored rows would make previously-matching English-stemmed
// titles stop matching too, so every row needs to be rebuilt against the
// new config, not just newly created/renamed pages going forward.
//
// Reuses the same upsertPageSearchIndex() the app already calls on page
// create/rename/reindex — this just runs it once for every existing page
// across every workspace instead of one workspace at a time via the
// "Index pages now" button.
//
// Idempotent: safe to re-run (upsertPageSearchIndex deletes-then-inserts).
//
// Usage: pnpm tsx scripts/reindex-search-simple-config.ts

import { existsSync } from "node:fs";
import { eq } from "drizzle-orm";

if (existsSync(".env")) {
  process.loadEnvFile();
}

async function main() {
  const [{ db }, { pages }, { upsertPageSearchIndex }] = await Promise.all([
    import("@/lib/db"),
    import("@/lib/db/schema"),
    import("@/lib/search/index-page"),
  ]);

  const allPages = await db
    .select({
      id: pages.id,
      workspaceId: pages.workspaceId,
      title: pages.title,
      kind: pages.kind,
    })
    .from(pages)
    .where(eq(pages.isDeleted, false));

  let count = 0;
  for (const page of allPages) {
    await upsertPageSearchIndex(db, page);
    count++;
  }

  console.log(
    `Reindexed ${count} page(s) with the 'simple' text-search config.`
  );
  process.exit(0);
}

main().catch((error) => {
  console.error("Failed:", error);
  process.exit(1);
});
