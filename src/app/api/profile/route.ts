import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { budgets, coachRuns, goals, merchantRules, profiles, transactions } from "@/db/schema";
import { getDb } from "@/db";
import { requireApiUser, readJson } from "@/lib/server/api";
import { profileUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  const account = await requireApiUser();
  if ("response" in account) return account.response;
  const body = await readJson(request);
  if ("response" in body) return body.response;
  const parsed = profileUpdateSchema.safeParse(body.data);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "Please provide a profile change." }, { status: 400 });
  }

  const updated = await getDb()
    .update(profiles)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(profiles.clerkUserId, account.userId))
    .returning();
  if (!updated[0]) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const account = await requireApiUser();
  if ("response" in account) return account.response;
  const db = getDb();
  await db.delete(coachRuns).where(eq(coachRuns.userId, account.userId));
  await db.delete(merchantRules).where(eq(merchantRules.userId, account.userId));
  await db.delete(budgets).where(eq(budgets.userId, account.userId));
  await db.delete(goals).where(eq(goals.userId, account.userId));
  await db.delete(transactions).where(eq(transactions.userId, account.userId));
  await db.delete(profiles).where(eq(profiles.clerkUserId, account.userId));
  return NextResponse.json({ ok: true, message: "Your Pocket Semester data has been deleted." });
}
