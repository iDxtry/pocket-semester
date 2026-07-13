import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { budgets } from "@/db/schema";
import { getDb } from "@/db";
import { currentMonth, toClientBudget } from "@/lib/data";
import { monthStart } from "@/lib/budget-math";
import { requireApiUser, readJson } from "@/lib/server/api";
import { budgetUpdateSchema, monthSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const account = await requireApiUser();
  if ("response" in account) return account.response;
  const parsedMonth = monthSchema.safeParse(new URL(request.url).searchParams.get("month") ?? currentMonth());
  if (!parsedMonth.success) return NextResponse.json({ error: "Please select a valid month." }, { status: 400 });

  const rows = await getDb()
    .select()
    .from(budgets)
    .where(and(eq(budgets.userId, account.userId), eq(budgets.month, monthStart(parsedMonth.data))));
  return NextResponse.json({ budgets: rows.map(toClientBudget) });
}

export async function PUT(request: Request) {
  const account = await requireApiUser();
  if ("response" in account) return account.response;
  const body = await readJson(request);
  if ("response" in body) return body.response;
  const parsed = budgetUpdateSchema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Please check the budget amounts." }, { status: 400 });

  const db = getDb();
  const month = monthStart(parsed.data.month);
  await Promise.all(
    parsed.data.budgets.map((budget) =>
      db
        .insert(budgets)
        .values({ userId: account.userId, month, category: budget.category, limitCents: budget.limitCents })
        .onConflictDoUpdate({
          target: [budgets.userId, budgets.month, budgets.category],
          set: { limitCents: budget.limitCents, updatedAt: new Date() },
        }),
    ),
  );

  const rows = await db.select().from(budgets).where(and(eq(budgets.userId, account.userId), eq(budgets.month, month)));
  return NextResponse.json({ budgets: rows.map(toClientBudget) });
}
