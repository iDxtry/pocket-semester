import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { budgets, transactions } from "@/db/schema";
import { getDb } from "@/db";
import { analyzeExpense } from "@/lib/ai/provider";
import { currentMonth, getMerchantRuleCategory, toClientTransaction } from "@/lib/data";
import { monthEnd, monthStart } from "@/lib/budget-math";
import { requireApiUser, readJson } from "@/lib/server/api";
import { createTransactionSchema, monthSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const account = await requireApiUser();
  if ("response" in account) return account.response;

  const url = new URL(request.url);
  const parsedMonth = monthSchema.safeParse(url.searchParams.get("month") ?? currentMonth());
  if (!parsedMonth.success) return NextResponse.json({ error: "Please select a valid month." }, { status: 400 });

  const month = parsedMonth.data;
  const rows = await getDb()
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, account.userId),
        gte(transactions.occurredOn, monthStart(month)),
        lte(transactions.occurredOn, monthEnd(month)),
      ),
    )
    .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt));

  return NextResponse.json({ transactions: rows.map(toClientTransaction) });
}

export async function POST(request: Request) {
  const account = await requireApiUser();
  if ("response" in account) return account.response;

  const body = await readJson(request);
  if ("response" in body) return body.response;
  const parsed = createTransactionSchema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Please check the expense details." }, { status: 400 });

  const input = parsed.data;
  const month = input.occurredOn.slice(0, 7);
  const db = getDb();
  const previousRows = await db
    .select({ amountCents: transactions.amountCents })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, account.userId),
        gte(transactions.occurredOn, monthStart(month)),
        lte(transactions.occurredOn, monthEnd(month)),
      ),
    );
  const monthlySpentCents = previousRows.reduce((sum, row) => sum + row.amountCents, 0);
  const budgetRows = await db
    .select({ limitCents: budgets.limitCents })
    .from(budgets)
    .where(and(eq(budgets.userId, account.userId), eq(budgets.month, monthStart(month))));
  const monthlyBudgetCents = budgetRows.reduce((sum, row) => sum + row.limitCents, 0);
  const merchantCategory = await getMerchantRuleCategory(account.userId, input.merchant);
  const analysis = input.category || merchantCategory
    ? null
    : await analyzeExpense({
        merchant: input.merchant,
        description: input.description,
        amountCents: input.amountCents,
        monthlySpentCents,
        monthlyBudgetCents: Math.max(monthlyBudgetCents, monthlySpentCents + input.amountCents, 1),
      });
  const category = input.category ?? merchantCategory ?? analysis?.category ?? "Other";
  const confidence = input.category || merchantCategory ? 1 : (analysis?.confidence ?? 0);

  const created = await db
    .insert(transactions)
    .values({
      userId: account.userId,
      merchant: input.merchant,
      description: input.description,
      amountCents: input.amountCents,
      occurredOn: input.occurredOn,
      category,
      confidence,
      source: input.source,
    })
    .returning();

  return NextResponse.json({ transaction: toClientTransaction(created[0]), analysis }, { status: 201 });
}
