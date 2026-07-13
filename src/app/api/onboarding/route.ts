import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { budgets, goals, profiles } from "@/db/schema";
import { getDb } from "@/db";
import { currentMonth } from "@/lib/data";
import { monthStart } from "@/lib/budget-math";
import { requireApiUser, readJson } from "@/lib/server/api";
import { onboardingSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const account = await requireApiUser();
  if ("response" in account) return account.response;
  const body = await readJson(request);
  if ("response" in body) return body.response;
  const parsed = onboardingSchema.safeParse(body.data);
  if (!parsed.success || parsed.data.semesterEnd <= parsed.data.semesterStart) {
    return NextResponse.json({ error: "Please check your semester dates and budget details." }, { status: 400 });
  }

  const input = parsed.data;
  const db = getDb();
  await db
    .insert(profiles)
    .values({
      clerkUserId: account.userId,
      displayName: input.displayName,
      currency: input.currency,
      semesterStart: input.semesterStart,
      semesterEnd: input.semesterEnd,
      monthlyAllowanceCents: input.monthlyAllowanceCents,
      onboardingComplete: true,
    })
    .onConflictDoUpdate({
      target: profiles.clerkUserId,
      set: {
        displayName: input.displayName,
        currency: input.currency,
        semesterStart: input.semesterStart,
        semesterEnd: input.semesterEnd,
        monthlyAllowanceCents: input.monthlyAllowanceCents,
        onboardingComplete: true,
        updatedAt: new Date(),
      },
    });

  const month = monthStart(currentMonth());
  await Promise.all(
    input.budgets.map((budget) =>
      db
        .insert(budgets)
        .values({ userId: account.userId, month, category: budget.category, limitCents: budget.limitCents })
        .onConflictDoUpdate({
          target: [budgets.userId, budgets.month, budgets.category],
          set: { limitCents: budget.limitCents, updatedAt: new Date() },
        }),
    ),
  );

  const existingGoal = await db.select().from(goals).where(eq(goals.userId, account.userId)).orderBy(desc(goals.updatedAt)).limit(1);
  const goalValues = { ...input.goal, targetDate: input.goal.targetDate ?? null, updatedAt: new Date() };
  if (existingGoal[0]) {
    await db.update(goals).set(goalValues).where(eq(goals.id, existingGoal[0].id));
  } else {
    await db.insert(goals).values({ userId: account.userId, ...goalValues });
  }

  return NextResponse.json({ ok: true });
}
