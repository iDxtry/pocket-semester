import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";

function connectionString() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function createDatabase() {
  const url = connectionString();
  if (!url) throw new Error("Pocket Semester database is not configured.");
  return drizzle({ client: neon(url), schema });
}

export type Database = ReturnType<typeof createDatabase>;

let database: Database | undefined;

export function isDatabaseConfigured() {
  return Boolean(connectionString());
}

export function getDb() {
  database ??= createDatabase();
  return database;
}
