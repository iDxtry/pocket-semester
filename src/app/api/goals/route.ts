import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { goals } from "@/db/schema";
import { getDb } from "@/db";
import { toClientGoal } from "@/lib/data";
import { requireApiUser, readJson } from "@/lib/server/api";
import { goalUpdateSchema } from "@/lib/validation";

export async function GET() {
  const account = await requireApiUser();
  if ("response" in account) return account.response;
  const rows = await getDb().select().from(goals).where(eq(goals.userId, account.userId)).orderBy(desc(goals.updatedAt)).limit(1);
  return NextResponse.json({ goal: rows[0] ? toClientGoal(rows[0]) : null });
}

export async function PUT(request: Request) {
  const account = await requireApiUser();
  if ("response" in account) return account.response;
  const body = await readJson(request);
  if ("response" in body) return body.response;
  const parsed = goalUpdateSchema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Please check your goal details." }, { status: 400 });

  const db = getDb();
  const current = await db.select().from(goals).where(eq(goals.userId, account.userId)).orderBy(desc(goals.updatedAt)).limit(1);
  const values = { ...parsed.data, targetDate: parsed.data.targetDate ?? null, updatedAt: new Date() };
  const saved = current[0]
    ? await db.update(goals).set(values).where(eq(goals.id, current[0].id)).returning()
    : await db.insert(goals).values({ userId: account.userId, ...values }).returning();

  return NextResponse.json({ goal: toClientGoal(saved[0]) });
}
