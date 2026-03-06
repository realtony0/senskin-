import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";

const { Client } = pg;
const rootDir = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const sqlFiles = ["supabase/schema.sql", "supabase/seed.sql"];

if (!process.env.DATABASE_URL) {
  throw new Error("Missing DATABASE_URL");
}

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function main() {
  await client.connect();

  for (const relativeFile of sqlFiles) {
    const absoluteFile = path.join(rootDir, relativeFile);
    const sql = await readFile(absoluteFile, "utf8");
    await client.query(sql);
    console.log(`Applied ${relativeFile}`);
  }

  await client.end();
}

main().catch(async (error) => {
  console.error(error);
  await client.end().catch(() => {});
  process.exitCode = 1;
});
