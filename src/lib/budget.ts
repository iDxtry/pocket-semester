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

export function createDemoWorkspace(month = "2026-07"): WorkspaceData {
  const term = demoTermForMonth(month);
  const date = (day: number) => demoDayForMonth(month, term, day);
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
      currentCents: 46500,
      targetDate: term.end,
    },
    transactions: [
      {
        id: "demo-tx-1",
        merchant: "Campus Apartments",
        description: "Residence payment",
        amountCents: demoExpenseAmount(89500, "Housing", month),
        category: "Housing",
        occurredOn: date(1),
        confidence: 0.99,
        source: "demo",
      },
      {
        id: "demo-tx-2",
        merchant: "Neighborhood Market",
        description: "Groceries for the week",
        amountCents: demoExpenseAmount(5874, "Food & dining", month),
        category: "Food & dining",
        occurredOn: date(2),
        confidence: 0.97,
        source: "demo",
      },
      {
        id: "demo-tx-3",
        merchant: "City Bus",
        description: "Monthly student transit pass",
        amountCents: demoExpenseAmount(3125, "Transport", month),
        category: "Transport",
        occurredOn: date(3),
        confidence: 0.99,
        source: "demo",
      },
      {
        id: "demo-tx-4",
        merchant: "Campus Print & Supply",
        description: "Lab print credits and notebook",
        amountCents: demoExpenseAmount(2840, "School", month),
        category: "School",
        occurredOn: date(5),
        confidence: 0.96,
        source: "demo",
      },
      {
        id: "demo-tx-5",
        merchant: "Streamly",
        description: "Music subscription",
        amountCents: demoExpenseAmount(1099, "Subscriptions", month),
        category: "Subscriptions",
        occurredOn: date(6),
        confidence: 0.94,
        source: "demo",
      },
      {
        id: "demo-tx-6",
        merchant: "Campus Cafe",
        description: "Coffee before afternoon lab",
        amountCents: demoExpenseAmount(725, "Food & dining", month),
        category: "Food & dining",
        occurredOn: date(8),
        confidence: 0.93,
        source: "demo",
      },
      {
        id: "demo-tx-7",
        merchant: "Laundry Card",
        description: "Laundry room reload",
        amountCents: demoExpenseAmount(1400, "Other", month),
        category: "Other",
        occurredOn: date(9),
        confidence: 0.98,
        source: "demo",
      },
      {
        id: "demo-tx-8",
        merchant: "Green Bowl",
        description: "Dinner after campus shift",
        amountCents: demoExpenseAmount(1860, "Food & dining", month),
        category: "Food & dining",
        occurredOn: date(10),
        confidence: 0.95,
        source: "demo",
      },
      {
        id: "demo-tx-9",
        merchant: "Student Cinema",
        description: "Movie night ticket",
        amountCents: demoExpenseAmount(1650, "Fun", month),
        category: "Fun",
        occurredOn: date(11),
        confidence: 0.93,
        source: "demo",
      },
      {
        id: "demo-tx-10",
        merchant: "Corner Grocer",
        description: "Produce and breakfast staples",
        amountCents: demoExpenseAmount(4620, "Food & dining", month),
        category: "Food & dining",
        occurredOn: date(12),
        confidence: 0.96,
        source: "demo",
      },
      {
        id: "demo-tx-11",
        merchant: "Campus Pharmacy",
        description: "Cold medicine and toiletries",
        amountCents: demoExpenseAmount(968, "Other", month),
        category: "Other",
        occurredOn: date(13),
        confidence: 0.95,
        source: "demo",
      },
    ],
  };
}
