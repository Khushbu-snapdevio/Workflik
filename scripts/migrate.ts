import { existsSync } from "node:fs";
import postgres from "postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";

if (existsSync(".env")) {
  process.loadEnvFile();
}

const MIGRATIONS_TABLE = `"drizzle"."__drizzle_migrations"`;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
    process.exit(1);
  }

  const sql = postgres(databaseUrl, { max: 1 });

  await sql.unsafe(`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);

  const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
  const [lastDbMigration] = await sql.unsafe(
    `select created_at from ${MIGRATIONS_TABLE} order by created_at desc limit 1`
  );

  let applied = 0;
  for (const migration of migrations) {
    if (lastDbMigration && Number(lastDbMigration.created_at) >= migration.folderMillis) continue;

    // Each migration file commits in its OWN transaction — required because
    // Postgres forbids using an enum value added via ALTER TYPE ... ADD VALUE
    // in the same transaction that added it (migration 0003 adds values that
    // migration 0008 then uses as a column default). drizzle-orm's built-in
    // migrator wraps every pending migration into a single transaction, which
    // makes a fresh `pnpm db:migrate` fail with "unsafe use of new value" —
    // this runner is a drop-in replacement that avoids that.
    await sql.begin(async (tx) => {
      for (const stmt of migration.sql) {
        if (stmt.trim()) await tx.unsafe(stmt);
      }
      await tx.unsafe(
        `insert into ${MIGRATIONS_TABLE} (hash, created_at) values ($1, $2)`,
        [migration.hash, migration.folderMillis]
      );
    });
    applied++;
    console.log(`Applied migration: ${migration.hash.slice(0, 12)} (${new Date(migration.folderMillis).toISOString()})`);
  }

  console.log(applied === 0 ? "No pending migrations." : `Applied ${applied} migration(s).`);
  await sql.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
