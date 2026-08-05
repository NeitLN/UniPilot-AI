// One-off helper: applies a SQL file to the Postgres database pointed to by
// DATABASE_URL. Never commit a connection string — pass it via env var only.
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("Usage: DATABASE_URL=... node scripts/run-migration.mjs <path-to-sql>");
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`Connected. Applying ${file} ...`);
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log("Migration applied successfully.");
} catch (err) {
  await client.query("rollback").catch(() => {});
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
