import "server-only";

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export type SqliteParam = string | number | boolean | null;

type QueryPayload = {
  mode: "query" | "execute";
  dbPath: string;
  sql: string;
  params: SqliteParam[];
};

const pythonScript = String.raw`
import json
import sqlite3
import sys

payload = json.load(sys.stdin)
conn = sqlite3.connect(payload["dbPath"])
conn.row_factory = sqlite3.Row
conn.execute("PRAGMA foreign_keys = ON")
conn.execute("PRAGMA busy_timeout = 5000")

try:
    params = payload.get("params") or []
    if payload["mode"] == "query":
        cursor = conn.execute(payload["sql"], params)
        rows = [dict(row) for row in cursor.fetchall()]
        sys.stdout.write(json.dumps({"rows": rows}, separators=(",", ":")))
    else:
        cursor = conn.execute(payload["sql"], params)
        conn.commit()
        sys.stdout.write(json.dumps({"changes": conn.total_changes, "lastrowid": cursor.lastrowid}, separators=(",", ":")))
finally:
    conn.close()
`;

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL.replace(/^["']|["']$/g, "");

  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return null;

  const match = readFileSync(envPath, "utf8").match(/^DATABASE_URL=(.+)$/m);
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? null;
}

export function sqliteDbPath() {
  const databaseUrl = readDatabaseUrl();
  if (databaseUrl?.startsWith("file:")) {
    const filePath = databaseUrl.slice("file:".length);
    const rootRelative = path.resolve(process.cwd(), filePath);
    if (existsSync(rootRelative)) return rootRelative;

    const prismaRelative = path.resolve(process.cwd(), "prisma", filePath);
    if (existsSync(prismaRelative)) return prismaRelative;
  }

  return path.resolve(process.cwd(), "prisma", "dev.db");
}

function runSqlite<T>(payload: Omit<QueryPayload, "dbPath">): Promise<T> {
  const child = spawn(process.env.PYTHON_BIN ?? "python3", ["-c", pythonScript], {
    cwd: process.cwd(),
    stdio: ["pipe", "pipe", "pipe"],
  });

  const fullPayload: QueryPayload = {
    ...payload,
    dbPath: sqliteDbPath(),
  };

  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });

  child.stdin.end(JSON.stringify(fullPayload));

  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `SQLite command failed with exit code ${code}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout || "{}") as T);
      } catch (error) {
        reject(error);
      }
    });
  });
}

export async function sqliteQuery<T extends object = Record<string, unknown>>(
  sql: string,
  params: SqliteParam[] = [],
) {
  const result = await runSqlite<{ rows: T[] }>({ mode: "query", sql, params });
  return result.rows;
}

export async function sqliteQueryOne<T extends object = Record<string, unknown>>(
  sql: string,
  params: SqliteParam[] = [],
) {
  const rows = await sqliteQuery<T>(sql, params);
  return rows[0] ?? null;
}

export async function sqliteExecute(sql: string, params: SqliteParam[] = []) {
  return runSqlite<{ changes: number; lastrowid: number }>({ mode: "execute", sql, params });
}

export function placeholders(values: readonly unknown[]) {
  return values.map(() => "?").join(", ");
}

export function sqliteNow() {
  return Date.now();
}
