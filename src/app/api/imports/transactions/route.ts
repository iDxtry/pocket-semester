import { NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { merchantRules, transactions } from "@/db/schema";
import { getDb } from "@/db";
import { getLocalExpenseAnalysis } from "@/lib/ai/provider";
import { normalizeMerchant, toClientTransaction } from "@/lib/data";
import { requireApiUser, readJson } from "@/lib/server/api";
import { importTransactionsSchema } from "@/lib/validation";

function duplicateKey(merchant: string, amountCents: number, occurredOn: string) {
  return `${normalizeMerchant(merchant)}:${amountCents}:${occurredOn}`;
}

export async function POST(request: Request) {
  const account = await requireApiUser();
  if ("response" in account) return account.response;

  const body = await readJson(request);
  if ("response" in body) return body.response;
  const parsed = importTransactionsSchema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Please check the CSV rows before importing." }, { status: 400 });

  const input = parsed.data;
  const earliest = input.transactions.reduce((value, transaction) => (transaction.occurredOn < value ? transaction.occurredOn : value), input.transactions[0].occurredOn);
  const latest = input.transactions.reduce((value, transaction) => (transaction.occurredOn > value ? transaction.occurredOn : value), input.transactions[0].occurredOn);
  const db = getDb();
  const [existing, rules] = await Promise.all([
    db
      .select({ merchant: transactions.merchant, amountCents: transactions.amountCents, occurredOn: transactions.occurredOn })
      .from(transactions)
      .where(and(eq(transactions.userId, account.userId), gte(transactions.occurredOn, earliest), lte(transactions.occurredOn, latest))),
    db.select().from(merchantRules).where(eq(merchantRules.userId, account.userId)),
  ]);

  const existingKeys = new Set(existing.map((transaction) => duplicateKey(transaction.merchant, transaction.amountCents, transaction.occurredOn)));
  const batchKeys = new Set<string>();
  const ruleMap = new Map(rules.map((rule) => [rule.merchantKey, rule.category]));
  const rows = [] as Array<typeof transactions.$inferInsert>;
  let skipped = 0;

  for (const transaction of input.transactions) {
    const key = duplicateKey(transaction.merchant, transaction.amountCents, transaction.occurredOn);
    if (input.skipDuplicates && (existingKeys.has(key) || batchKeys.has(key))) {
      skipped += 1;
      continue;
    }
    batchKeys.add(key);

    const local = getLocalExpenseAnalysis({
      merchant: transaction.merchant,
      description: transaction.description,
      amountCents: transaction.amountCents,
      monthlySpentCents: 0,
      monthlyBudgetCents: 200_000,
    });
    const category = transaction.category ?? ruleMap.get(normalizeMerchant(transaction.merchant)) ?? local.category;
    rows.push({
      userId: account.userId,
      merchant: transaction.merchant,
      description: transaction.description,
      amountCents: transaction.amountCents,
      occurredOn: transaction.occurredOn,
      category,
      confidence: transaction.category || ruleMap.has(normalizeMerchant(transaction.merchant)) ? 1 : local.confidence,
      source: "csv",
    });
  }

  const created = rows.length ? await db.insert(transactions).values(rows).returning() : [];
  return NextResponse.json({ imported: created.map(toClientTransaction), skipped, importedCount: created.length });
}
