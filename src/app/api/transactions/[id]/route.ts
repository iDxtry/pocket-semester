import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { merchantRules, transactions } from "@/db/schema";
import { getDb } from "@/db";
import { normalizeMerchant, toClientTransaction } from "@/lib/data";
import { requireApiUser, readJson } from "@/lib/server/api";
import { updateTransactionSchema } from "@/lib/validation";
import { z } from "zod";

const idSchema = z.string().uuid();

export async function PATCH(request: Request, context: RouteContext<"/api/transactions/[id]">) {
  const account = await requireApiUser();
  if ("response" in account) return account.response;
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Invalid transaction." }, { status: 400 });

  const body = await readJson(request);
  if ("response" in body) return body.response;
  const parsed = updateTransactionSchema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Please check the transaction changes." }, { status: 400 });

  const db = getDb();
  const updated = await db
    .update(transactions)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.userId, account.userId)))
    .returning();

  const transaction = updated[0];
  if (!transaction) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

  if (parsed.data.category) {
    await db
      .insert(merchantRules)
      .values({ userId: account.userId, merchantKey: normalizeMerchant(transaction.merchant), category: parsed.data.category })
      .onConflictDoUpdate({
        target: [merchantRules.userId, merchantRules.merchantKey],
        set: { category: parsed.data.category, updatedAt: new Date() },
      });
  }

  return NextResponse.json({ transaction: toClientTransaction(transaction) });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/transactions/[id]">) {
  const account = await requireApiUser();
  if ("response" in account) return account.response;
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Invalid transaction." }, { status: 400 });

  const deleted = await getDb()
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, account.userId)))
    .returning({ id: transactions.id });

  if (!deleted[0]) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
