import { and, desc, eq, gte, lte } from "drizzle-orm";
import { budgets, coachRuns, goals, merchantRules, profiles, transactions } from "@/db/schema";
import { getDb } from "@/db";
import { categories, defaultBudgetLimits, type BudgetTransaction, type Category, type CategoryBudget, type StudentGoal, type StudentProfile, type WorkspaceData } from "@/lib/budget";
import { monthEnd, monthStart } from "@/lib/budget-math";
import type { CoachPlan } from "@/lib/ai/types";

export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function normalizeMerchant(merchant: string) {
  return merchant.trim().toLowerCase().replace(/\s+/g, " ");
}

export function toClientTransaction(row: typeof transactions.$inferSelect): BudgetTransaction {
  return {
    id: row.id,
    merchant: row.merchant,
    description: row.description,
    amountCents: row.amountCents,
    category: row.category,
    occurredOn: row.occurredOn,
    confidence: row.confidence,
    source: row.source === "csv" ? "csv" : "manual",
  };
}

export function toClientBudget(row: typeof budgets.$inferSelect): CategoryBudget {
  return { id: row.id, category: row.category, limitCents: row.limitCents };
}

export function toClientGoal(row: typeof goals.$inferSelect): StudentGoal {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind === "semester" ? "semester" : "emergency",
    targetCents: row.targetCents,
    currentCents: row.currentCents,
    targetDate: row.targetDate,
  };
}

export function toClientProfile(row: typeof profiles.$inferSelect): StudentProfile {
  return {
    displayName: row.displayName,
    currency: row.currency,
    semesterStart: row.semesterStart,
    semesterEnd: row.semesterEnd,
    monthlyAllowanceCents: row.monthlyAllowanceCents,
  };
}

export async function getProfile(userId: string) {
  const db = getDb();
  const rows = await db.select().from(profiles).where(eq(profiles.clerkUserId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function getMonthlyWorkspace(userId: string, month = currentMonth()): Promise<WorkspaceData> {
  const db = getDb();
  const rangeStart = monthStart(month);
  const rangeEnd = monthEnd(month);
  const [profileRows, transactionRows, budgetRows, goalRows] = await Promise.all([
    db.select().from(profiles).where(eq(profiles.clerkUserId, userId)).limit(1),
    db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.occurredOn, rangeStart), lte(transactions.occurredOn, rangeEnd)))
      .orderBy(desc(transactions.occurredOn), desc(transactions.createdAt)),
    db.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, rangeStart))),
    db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.updatedAt)).limit(1),
  ]);

  const profile = profileRows[0];
  if (!profile) throw new Error("Profile not found.");

  const byCategory = new Map(budgetRows.map((budget) => [budget.category, budget]));
  const completedBudgets = categories.map((category) => {
    const budget = byCategory.get(category);
    return budget ? toClientBudget(budget) : { category, limitCents: defaultBudgetLimits[category] };
  });

  return {
    profile: toClientProfile(profile),
    transactions: transactionRows.map(toClientTransaction),
    budgets: completedBudgets,
    goal: goalRows[0] ? toClientGoal(goalRows[0]) : null,
    month,
  };
}

export async function getMerchantRuleCategory(userId: string, merchant: string): Promise<Category | null> {
  const db = getDb();
  const rows = await db
    .select({ category: merchantRules.category })
    .from(merchantRules)
    .where(and(eq(merchantRules.userId, userId), eq(merchantRules.merchantKey, normalizeMerchant(merchant))))
    .limit(1);
  return rows[0]?.category ?? null;
}

export async function getLatestCoachRun(userId: string, month: string) {
  const db = getDb();
  const rows = await db
    .select()
    .from(coachRuns)
    .where(and(eq(coachRuns.userId, userId), eq(coachRuns.month, monthStart(month))))
    .orderBy(desc(coachRuns.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export function coachPlanFromRow(row: typeof coachRuns.$inferSelect | null): CoachPlan | null {
  return row?.plan ?? null;
}
