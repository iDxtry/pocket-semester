import { categories, type BudgetTransaction, type Category, type CategoryBudget, type StudentGoal } from "@/lib/budget";

export function toCents(amount: number) {
  return Math.round(amount * 100);
}

export function fromCents(cents: number) {
  return cents / 100;
}

export function formatMoney(cents: number, currency = "USD", options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
    ...options,
  }).format(fromCents(cents));
}

export function monthStart(month: string) {
  return `${month}-01`;
}

export function monthEnd(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const finalDay = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  return `${month}-${String(finalDay).padStart(2, "0")}`;
}

export function monthLabel(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, monthIndex - 1, 1)),
  );
}

export function monthShortLabel(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, monthIndex - 1, 1)),
  );
}

export function isoDateForMonthOffset(month: string, offset: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthIndex - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isInMonth(occurredOn: string, month: string) {
  return occurredOn.slice(0, 7) === month;
}

export function isValidIsoDate(value: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month && date.getUTCDate() === day;
}

export function isValidMonth(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export type MonthState = "past" | "current" | "future";

export function getMonthState(month: string, asOf = new Date()): MonthState {
  const current = `${asOf.getUTCFullYear()}-${String(asOf.getUTCMonth() + 1).padStart(2, "0")}`;
  if (month < current) return "past";
  if (month > current) return "future";
  return "current";
}

export function transactionsForMonth(transactions: BudgetTransaction[], month: string) {
  return transactions.filter((transaction) => isInMonth(transaction.occurredOn, month));
}

export function getSpentByCategory(transactions: BudgetTransaction[]) {
  return categories.reduce<Record<Category, number>>(
    (totals, category) => {
      totals[category] = transactions
        .filter((transaction) => transaction.category === category)
        .reduce((sum, transaction) => sum + transaction.amountCents, 0);
      return totals;
    },
    {} as Record<Category, number>,
  );
}

export function getBudgetSummary(transactions: BudgetTransaction[], budgets: CategoryBudget[]) {
  const categorySpent = getSpentByCategory(transactions);
  const totalBudgetCents = budgets.reduce((sum, budget) => sum + budget.limitCents, 0);
  const totalSpentCents = transactions.reduce((sum, transaction) => sum + transaction.amountCents, 0);
  const availableCents = totalBudgetCents - totalSpentCents;

  const categoryHealth = budgets.map((budget) => {
    const spentCents = categorySpent[budget.category] ?? 0;
    const remainingCents = budget.limitCents - spentCents;
    return {
      ...budget,
      spentCents,
      remainingCents,
      percentUsed: budget.limitCents > 0 ? Math.round((spentCents / budget.limitCents) * 100) : 0,
      status: remainingCents < 0 ? "over" : remainingCents <= budget.limitCents * 0.2 ? "watch" : "healthy",
    };
  });

  return {
    totalBudgetCents,
    totalSpentCents,
    availableCents,
    percentUsed: totalBudgetCents > 0 ? Math.round((totalSpentCents / totalBudgetCents) * 100) : 0,
    categoryHealth,
  };
}

export function getExpenseBudgetImpact(projectedSpentCents: number, limitCents: number) {
  const remainingCents = limitCents - projectedSpentCents;
  const percentUsed = limitCents > 0 ? Math.round((projectedSpentCents / limitCents) * 100) : 0;

  return {
    remainingCents,
    percentUsed,
    status: limitCents <= 0 ? "unplanned" as const : remainingCents < 0 ? "over" as const : percentUsed >= 85 ? "watch" as const : "on-track" as const,
  };
}

export function getForecast(totalSpentCents: number, month: string, asOf = new Date(), fixedSpendCents = 0) {
  const [year, monthIndex] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const state = getMonthState(month, asOf);
  const isCurrentMonth = state === "current";
  const elapsedDays = isCurrentMonth ? Math.max(1, asOf.getUTCDate()) : daysInMonth;
  const flexibleSpentCents = Math.max(totalSpentCents - fixedSpendCents, 0);
  const flexibleDailyPaceCents = Math.round(flexibleSpentCents / elapsedDays);
  const forecastCents = state === "future" ? 0 : fixedSpendCents + Math.round((flexibleSpentCents / elapsedDays) * daysInMonth);

  return {
    forecastCents,
    fixedSpendCents,
    flexibleSpentCents,
    flexibleDailyPaceCents,
    daysInMonth,
    elapsedDays,
    daysRemaining: Math.max(daysInMonth - elapsedDays, 0),
    state,
  };
}

export function goalProgress(goal: StudentGoal | null) {
  if (!goal) return null;
  return {
    ...goal,
    remainingCents: Math.max(goal.targetCents - goal.currentCents, 0),
    percent: goal.targetCents > 0 ? Math.min(Math.round((goal.currentCents / goal.targetCents) * 100), 100) : 0,
  };
}

export type MonthDaySeriesPoint = {
  date: string;
  day: number;
  weekday: string;
  amountCents: number;
  transactionCount: number;
  fixedCostLabel: string | null;
  isUpcoming: boolean;
};

const fixedCostCategories = new Set<Category>(["Housing", "Transport", "Subscriptions"]);

export function makeMonthSeries(transactions: BudgetTransaction[], month: string, asOf = new Date()): MonthDaySeriesPoint[] {
  const [year, monthIndex] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const transactionsByDate = new Map<string, BudgetTransaction[]>();
  const today = asOf.toISOString().slice(0, 10);
  const state = getMonthState(month, asOf);

  for (const transaction of transactionsForMonth(transactions, month)) {
    transactionsByDate.set(transaction.occurredOn, [...(transactionsByDate.get(transaction.occurredOn) ?? []), transaction]);
  }

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const dailyTransactions = transactionsByDate.get(date) ?? [];
    const fixedTransaction = dailyTransactions.find((transaction) => fixedCostCategories.has(transaction.category));
    const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));

    return {
      date,
      day,
      weekday,
      amountCents: dailyTransactions.reduce((total, transaction) => total + transaction.amountCents, 0),
      transactionCount: dailyTransactions.length,
      fixedCostLabel: fixedTransaction?.description ?? null,
      isUpcoming: state !== "past" && date > today,
    };
  });
}

export type SpendingStreaks = {
  currentStreak: number;
  bestStreak: number;
  noSpendDays: number;
  activeDays: number;
};

export function getSpendingStreaks(monthSeries: MonthDaySeriesPoint[], dailyPaceCents: number): SpendingStreaks {
  let currentStreak = 0;
  let bestStreak = 0;
  let noSpendDays = 0;
  let activeDays = 0;
  let runningStreak = 0;

  for (const day of monthSeries) {
    if (day.isUpcoming) continue;
    activeDays++;

    const flexibleSpend = day.fixedCostLabel ? 0 : day.amountCents;
    const underPace = flexibleSpend <= dailyPaceCents;
    const isNoSpend = day.amountCents === 0 && !day.fixedCostLabel;

    if (isNoSpend) noSpendDays++;

    if (underPace) {
      runningStreak++;
    } else {
      runningStreak = 0;
    }
    bestStreak = Math.max(bestStreak, runningStreak);
  }

  currentStreak = runningStreak;
  return { currentStreak, bestStreak, noSpendDays, activeDays };
}
