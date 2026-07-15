export const categories = [
  "Food & dining",
  "Housing",
  "Transport",
  "School",
  "Subscriptions",
  "Fun",
  "Other",
] as const;

export type Category = (typeof categories)[number];

export type TransactionSource = "manual" | "csv" | "demo";

export type BudgetTransaction = {
  id: string;
  merchant: string;
  description: string;
  amountCents: number;
  category: Category;
  occurredOn: string;
  confidence: number;
  source: TransactionSource;
};

export type CategoryBudget = {
  id?: string;
  category: Category;
  limitCents: number;
};

export type StudentGoal = {
  id?: string;
  name: string;
  kind: "emergency" | "semester";
  targetCents: number;
  currentCents: number;
  targetDate: string | null;
};

export type StudentProfile = {
  displayName: string;
  currency: string;
  semesterStart: string | null;
  semesterEnd: string | null;
  monthlyAllowanceCents: number;
};

export type WorkspaceData = {
  profile: StudentProfile;
  transactions: BudgetTransaction[];
  budgets: CategoryBudget[];
  goal: StudentGoal | null;
  month: string;
};

export const categoryColors: Record<Category, string> = {
  "Food & dining": "var(--chart-1)",
  Housing: "var(--chart-2)",
  Transport: "var(--chart-3)",
  School: "var(--chart-4)",
  Subscriptions: "var(--chart-5)",
  Fun: "var(--chart-6)",
  Other: "var(--muted)",
};

export const defaultBudgetLimits: Record<Category, number> = {
  "Food & dining": 31500,
  Housing: 89500,
  Transport: 9500,
  School: 13000,
  Subscriptions: 2700,
  Fun: 15500,
  Other: 8800,
};

function demoTermForMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  if (monthNumber <= 5) {
    return { start: `${year}-01-12`, end: `${year}-05-16` };
  }

  if (monthNumber <= 8) {
    return { start: `${year}-06-02`, end: `${year}-08-16` };
  }

  return { start: `${year}-08-24`, end: `${year}-12-18` };
}

function demoDayForMonth(month: string, term: { start: string; end: string }, requestedDay: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const firstAllowedDay = term.start.startsWith(month) ? Number(term.start.slice(-2)) : 1;
  const lastAllowedDay = term.end.startsWith(month) ? Number(term.end.slice(-2)) : daysInMonth;
  const day = Math.min(Math.max(requestedDay, firstAllowedDay), lastAllowedDay);
  return `${month}-${String(day).padStart(2, "0")}`;
}

const demoBudgetMultipliers: Record<Category, number[]> = {
  "Food & dining": [1.04, 0.98, 1.02, 1.00, 1.08, 0.92, 1.00, 1.15, 1.08, 1.00, 0.96, 1.05],
  Housing: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  Transport: [1.00, 1.00, 1.05, 0.95, 0.90, 0.95, 1.00, 1.08, 1.02, 0.98, 1.00, 0.90],
  School: [1.05, 1.00, 1.08, 0.95, 1.10, 0.80, 1.00, 1.25, 1.10, 0.95, 0.85, 0.75],
  Subscriptions: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  Fun: [0.92, 1.00, 1.10, 0.95, 0.90, 1.15, 1.00, 1.08, 1.05, 1.15, 0.90, 1.20],
  Other: [1.00, 0.95, 1.05, 0.95, 1.05, 0.95, 1.00, 1.12, 1.05, 1.00, 0.98, 1.15],
};

const demoExpenseMultipliers: Record<Category, number[]> = {
  "Food & dining": [0.97, 0.93, 1.08, 1.00, 1.12, 0.88, 1.00, 1.16, 1.10, 1.02, 0.96, 1.05],
  Housing: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  Transport: [1.04, 1.00, 0.96, 1.05, 0.92, 0.92, 1.00, 1.08, 1.00, 0.96, 1.02, 0.88],
  School: [1.10, 1.00, 1.15, 0.96, 1.22, 0.78, 1.00, 1.36, 1.12, 0.94, 0.88, 0.72],
  Subscriptions: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  Fun: [0.90, 1.00, 1.15, 0.92, 0.85, 1.12, 1.00, 1.08, 1.05, 1.18, 0.90, 1.25],
  Other: [0.95, 1.00, 1.08, 0.98, 1.10, 0.94, 1.00, 1.18, 1.06, 0.98, 1.14, 1.22],
};

function demoMonthMultiplier(table: Record<Category, number[]>, category: Category, month: string) {
  const monthNumber = Number(month.slice(5, 7));
  return table[category][monthNumber - 1] ?? 1;
}

function demoBudgetLimit(category: Category, month: string) {
  return Math.round((defaultBudgetLimits[category] * demoMonthMultiplier(demoBudgetMultipliers, category, month)) / 100) * 100;
}

function demoExpenseAmount(amountCents: number, category: Category, month: string) {
  if (Number(month.slice(5, 7)) === 7) return amountCents;
  return Math.max(350, Math.round((amountCents * demoMonthMultiplier(demoExpenseMultipliers, category, month)) / 10) * 10);
}

export function createDemoWorkspace(month = "2026-07", asOf = new Date()): WorkspaceData {
  const term = demoTermForMonth(month);
  const date = (day: number) => demoDayForMonth(month, term, day);
  const today = asOf.toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const isFuture = month > currentMonth;
  const isCurrent = month === currentMonth;
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const lastTermDay = term.end.startsWith(month) ? Number(term.end.slice(-2)) : daysInMonth;
  const goalBalanceByMonth = [31200, 34800, 39100, 43100, 45200, 43800, 46500, 50100, 46800, 51200, 54600, 58400];
  const sampleTransactions: Array<Omit<BudgetTransaction, "occurredOn"> & { day: number }> = [
    {
      id: "demo-tx-1", merchant: "Campus Apartments", description: "Residence payment", amountCents: demoExpenseAmount(89500, "Housing", month), category: "Housing", day: 1, confidence: 0.99, source: "demo",
    },
    {
      id: "demo-tx-2", merchant: "Neighborhood Market", description: "Groceries for the week", amountCents: demoExpenseAmount(3000, "Food & dining", month), category: "Food & dining", day: 2, confidence: 0.97, source: "demo",
    },
    {
      id: "demo-tx-3", merchant: "City Bus", description: "Monthly student transit pass", amountCents: demoExpenseAmount(3125, "Transport", month), category: "Transport", day: 3, confidence: 0.99, source: "demo",
    },
    {
      id: "demo-tx-12", merchant: "Neighborhood Market", description: "Midweek groceries and snacks", amountCents: demoExpenseAmount(950, "Food & dining", month), category: "Food & dining", day: 4, confidence: 0.96, source: "demo",
    },
    {
      id: "demo-tx-4", merchant: "Campus Print & Supply", description: "Lab print credits and notebook", amountCents: demoExpenseAmount(2840, "School", month), category: "School", day: 5, confidence: 0.96, source: "demo",
    },
    {
      id: "demo-tx-5", merchant: "Streamly", description: "Music subscription", amountCents: demoExpenseAmount(1099, "Subscriptions", month), category: "Subscriptions", day: 6, confidence: 0.94, source: "demo",
    },
    {
      id: "demo-tx-6", merchant: "Campus Cafe", description: "Coffee before afternoon lab", amountCents: demoExpenseAmount(600, "Food & dining", month), category: "Food & dining", day: 8, confidence: 0.93, source: "demo",
    },
    {
      id: "demo-tx-7", merchant: "Laundry Card", description: "Laundry room reload", amountCents: demoExpenseAmount(1400, "Other", month), category: "Other", day: 9, confidence: 0.98, source: "demo",
    },
    {
      id: "demo-tx-8", merchant: "Green Bowl", description: "Dinner after campus shift", amountCents: demoExpenseAmount(1350, "Food & dining", month), category: "Food & dining", day: 10, confidence: 0.95, source: "demo",
    },
    {
      id: "demo-tx-9", merchant: month.slice(5) === "10" ? "Student Football" : "Student Cinema", description: month.slice(5) === "10" ? "Home game ticket" : "Movie night ticket", amountCents: demoExpenseAmount(1650, "Fun", month), category: "Fun", day: 11, confidence: 0.93, source: "demo",
    },
    {
      id: "demo-tx-10", merchant: "Corner Grocer", description: "Produce and breakfast staples", amountCents: demoExpenseAmount(1900, "Food & dining", month), category: "Food & dining", day: 12, confidence: 0.96, source: "demo",
    },
    {
      id: "demo-tx-11", merchant: "Campus Pharmacy", description: "Cold medicine and toiletries", amountCents: demoExpenseAmount(968, "Other", month), category: "Other", day: 13, confidence: 0.95, source: "demo",
    },
    {
      id: "demo-tx-13", merchant: "Corner Grocer", description: "Fruit and breakfast refill", amountCents: demoExpenseAmount(1000, "Food & dining", month), category: "Food & dining", day: 15, confidence: 0.95, source: "demo",
    },
    { id: "demo-tx-14", merchant: "Campus Cafe", description: "Coffee and a bagel", amountCents: demoExpenseAmount(450, "Food & dining", month), category: "Food & dining", day: 16, confidence: 0.94, source: "demo" },
    { id: "demo-tx-15", merchant: "Green Bowl", description: "Lunch between classes", amountCents: demoExpenseAmount(525, "Food & dining", month), category: "Food & dining", day: 18, confidence: 0.95, source: "demo" },
    { id: "demo-tx-16", merchant: "Corner Grocer", description: "Dinner ingredients", amountCents: demoExpenseAmount(675, "Food & dining", month), category: "Food & dining", day: 20, confidence: 0.96, source: "demo" },
    { id: "demo-tx-17", merchant: "Campus Cafe", description: "Study break tea", amountCents: demoExpenseAmount(480, "Food & dining", month), category: "Food & dining", day: 22, confidence: 0.94, source: "demo" },
    { id: "demo-tx-18", merchant: "Library Cafe", description: "Late study snack", amountCents: demoExpenseAmount(610, "Food & dining", month), category: "Food & dining", day: 24, confidence: 0.94, source: "demo" },
    { id: "demo-tx-19", merchant: "Weekend Market", description: "Fruit and pantry refill", amountCents: demoExpenseAmount(440, "Food & dining", month), category: "Food & dining", day: 26, confidence: 0.96, source: "demo" },
    { id: "demo-tx-20", merchant: "Campus Cafe", description: "Iced coffee after class", amountCents: demoExpenseAmount(530, "Food & dining", month), category: "Food & dining", day: 28, confidence: 0.94, source: "demo" },
    { id: "demo-tx-21", merchant: "Corner Grocer", description: "End-of-month breakfast refill", amountCents: demoExpenseAmount(569, "Food & dining", month), category: "Food & dining", day: 30, confidence: 0.96, source: "demo" },
  ];
  const transactions = sampleTransactions
    .filter((transaction) => transaction.day <= lastTermDay)
    .map(({ day, ...transaction }) => ({ ...transaction, occurredOn: date(day) }));
  return {
    profile: {
      displayName: "Alex Rivera",
      currency: "USD",
      semesterStart: term.start,
      semesterEnd: term.end,
      monthlyAllowanceCents: 185000,
    },
    month,
    budgets: categories.map((category) => ({
      category,
      limitCents: demoBudgetLimit(category, month),
    })),
    goal: {
      name: "Emergency cushion",
      kind: "emergency",
      targetCents: 75000,
      currentCents: goalBalanceByMonth[Number(month.slice(5, 7)) - 1] ?? 46500,
      targetDate: term.end,
    },
    transactions: isFuture ? [] : isCurrent ? transactions.filter((transaction) => transaction.occurredOn <= today) : transactions,
  };
}
