import type { BudgetTransaction, CategoryBudget, StudentProfile } from "@/lib/budget";
import { getBudgetSummary, getForecast, monthEnd } from "@/lib/budget-math";

export type RunwayAction = {
  id: "postpone-purchase" | "food-cap" | "fun-cap";
  title: string;
  detail: string;
  impactCents: number;
};

export type SemesterRunway = {
  status: "covered" | "shortfall" | "unavailable";
  coveredThrough: string | null;
  projectedNeedCents: number;
  finalBufferCents: number;
  shortfallCents: number;
  daysToFinals: number;
  actions: RunwayAction[];
};

type RunwayInput = {
  month: string;
  profile: StudentProfile;
  transactions: BudgetTransaction[];
  budgets: CategoryBudget[];
  availableFundsCents: number;
  plannedPurchaseCents: number;
  selectedActionIds: string[];
  asOf?: Date;
};

function utcDate(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function daysBetween(start: Date, end: Date) {
  return Math.max(Math.ceil((end.getTime() - start.getTime()) / 86_400_000), 0);
}

export function calculateSemesterRunway({ month, profile, transactions, budgets, availableFundsCents, plannedPurchaseCents, selectedActionIds, asOf = new Date() }: RunwayInput): SemesterRunway {
  if (!profile.semesterEnd || !profile.semesterStart) {
    return { status: "unavailable", coveredThrough: null, projectedNeedCents: 0, finalBufferCents: 0, shortfallCents: 0, daysToFinals: 0, actions: [] };
  }

  const today = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate(), 12));
  const finals = utcDate(profile.semesterEnd);
  const monthEndDate = utcDate(monthEnd(month));
  if (today > finals || !month.startsWith(today.toISOString().slice(0, 7))) {
    return { status: "unavailable", coveredThrough: null, projectedNeedCents: 0, finalBufferCents: 0, shortfallCents: 0, daysToFinals: daysBetween(today, finals), actions: [] };
  }

  const summary = getBudgetSummary(transactions, budgets);
  const fixedSpendCents = transactions
    .filter((transaction) => transaction.category === "Housing" || transaction.category === "Subscriptions")
    .reduce((total, transaction) => total + transaction.amountCents, 0);
  const forecast = getForecast(summary.totalSpentCents, month, today, fixedSpendCents);
  const currentRemainingCents = Math.max(forecast.forecastCents - summary.totalSpentCents, 0);
  const currentDays = Math.max(daysBetween(today, monthEndDate) + 1, 1);
  const futureStart = new Date(monthEndDate.getTime() + 86_400_000);
  const futureDays = Math.max(daysBetween(futureStart, finals) + 1, 0);
  const monthlyPlanCents = summary.totalBudgetCents;
  const futureDailyCents = Math.round(monthlyPlanCents / 30.44);
  const weeksRemaining = Math.max(Math.ceil((daysBetween(today, finals) + 1) / 7), 1);
  const budgetByCategory = new Map(budgets.map((budget) => [budget.category, budget.limitCents]));
  const actions: RunwayAction[] = [];

  if (plannedPurchaseCents > 0) {
    actions.push({ id: "postpone-purchase", title: "Postpone the planned purchase", detail: "Keep this one-time expense out of the semester scenario for now.", impactCents: plannedPurchaseCents });
  }
  if ((budgetByCategory.get("Food & dining") ?? 0) > 0) {
    actions.push({ id: "food-cap", title: "Trim food by $20 a week", detail: "Use a grocery, meal-plan, or packed-lunch option once or twice each week.", impactCents: 2_000 * weeksRemaining });
  }
  if ((budgetByCategory.get("Fun") ?? 0) > 0) {
    actions.push({ id: "fun-cap", title: "Trim fun by $10 a week", detail: "Set one smaller weekly cap until finals are over.", impactCents: 1_000 * weeksRemaining });
  }

  const selectedImpactCents = actions
    .filter((action) => selectedActionIds.includes(action.id))
    .reduce((total, action) => total + action.impactCents, 0);
  const projectedNeedCents = currentRemainingCents + futureDailyCents * futureDays + plannedPurchaseCents;
  let balance = Math.max(availableFundsCents, 0) + selectedImpactCents - plannedPurchaseCents;
  let coveredThrough: string | null = null;
  let cursor = today;

  for (let index = 0; cursor <= finals; index += 1) {
    const dailyCost = index < currentDays ? Math.round(currentRemainingCents / currentDays) : futureDailyCents;
    balance -= dailyCost;
    if (balance < 0) break;
    coveredThrough = isoDate(cursor);
    cursor = new Date(cursor.getTime() + 86_400_000);
  }

  return {
    status: balance >= 0 ? "covered" : "shortfall",
    coveredThrough: balance >= 0 ? profile.semesterEnd : coveredThrough,
    projectedNeedCents,
    finalBufferCents: Math.max(balance, 0),
    shortfallCents: Math.max(-balance, 0),
    daysToFinals: daysBetween(today, finals),
    actions,
  };
}
