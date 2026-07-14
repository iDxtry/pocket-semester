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

export function getForecast(totalSpentCents: number, month: string, asOf = new Date(), fixedSpendCents = 0) {
  const [year, monthIndex] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthIndex, 0)).getUTCDate();
  const isCurrentMonth = asOf.getUTCFullYear() === year && asOf.getUTCMonth() + 1 === monthIndex;
  const elapsedDays = isCurrentMonth ? Math.max(1, asOf.getUTCDate()) : daysInMonth;
  const flexibleSpentCents = Math.max(totalSpentCents - fixedSpendCents, 0);
  const flexibleDailyPaceCents = Math.round(flexibleSpentCents / elapsedDays);
  const forecastCents = fixedSpendCents + Math.round((flexibleSpentCents / elapsedDays) * daysInMonth);

  return {
    forecastCents,
    fixedSpendCents,
    flexibleSpentCents,
    flexibleDailyPaceCents,
    daysInMonth,
    elapsedDays,
    daysRemaining: Math.max(daysInMonth - elapsedDays, 0),
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

export function makeWeekSeries(transactions: BudgetTransaction[], month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const totals = new Map<number, number>();

  for (const transaction of transactions) {
    const date = new Date(`${transaction.occurredOn}T12:00:00Z`);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() + 1 !== monthIndex) continue;
    const day = date.getUTCDay();
    const mondayIndex = day === 0 ? 6 : day - 1;
    totals.set(mondayIndex, (totals.get(mondayIndex) ?? 0) + transaction.amountCents);
  }

  return days.map((day, index) => ({ day, amount: Math.round((totals.get(index) ?? 0) / 100) }));
}
