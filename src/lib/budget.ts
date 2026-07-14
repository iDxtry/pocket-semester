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

export function createDemoWorkspace(month = "2026-07"): WorkspaceData {
  const date = (day: number) => `${month}-${String(day).padStart(2, "0")}`;
  const term = demoTermForMonth(month);
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
      limitCents: defaultBudgetLimits[category],
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
        amountCents: 89500,
        category: "Housing",
        occurredOn: date(1),
        confidence: 0.99,
        source: "demo",
      },
      {
        id: "demo-tx-2",
        merchant: "Neighborhood Market",
        description: "Groceries for the week",
        amountCents: 5874,
        category: "Food & dining",
        occurredOn: date(2),
        confidence: 0.97,
        source: "demo",
      },
      {
        id: "demo-tx-3",
        merchant: "City Bus",
        description: "Monthly student transit pass",
        amountCents: 3125,
        category: "Transport",
        occurredOn: date(3),
        confidence: 0.99,
        source: "demo",
      },
      {
        id: "demo-tx-4",
        merchant: "Campus Print & Supply",
        description: "Lab print credits and notebook",
        amountCents: 2840,
        category: "School",
        occurredOn: date(5),
        confidence: 0.96,
        source: "demo",
      },
      {
        id: "demo-tx-5",
        merchant: "Streamly",
        description: "Music subscription",
        amountCents: 1099,
        category: "Subscriptions",
        occurredOn: date(6),
        confidence: 0.94,
        source: "demo",
      },
      {
        id: "demo-tx-6",
        merchant: "Campus Cafe",
        description: "Coffee before afternoon lab",
        amountCents: 725,
        category: "Food & dining",
        occurredOn: date(8),
        confidence: 0.93,
        source: "demo",
      },
      {
        id: "demo-tx-7",
        merchant: "Laundry Card",
        description: "Laundry room reload",
        amountCents: 1400,
        category: "Other",
        occurredOn: date(9),
        confidence: 0.98,
        source: "demo",
      },
      {
        id: "demo-tx-8",
        merchant: "Green Bowl",
        description: "Dinner after campus shift",
        amountCents: 1860,
        category: "Food & dining",
        occurredOn: date(10),
        confidence: 0.95,
        source: "demo",
      },
      {
        id: "demo-tx-9",
        merchant: "Student Cinema",
        description: "Movie night ticket",
        amountCents: 1650,
        category: "Fun",
        occurredOn: date(11),
        confidence: 0.93,
        source: "demo",
      },
      {
        id: "demo-tx-10",
        merchant: "Corner Grocer",
        description: "Produce and breakfast staples",
        amountCents: 4620,
        category: "Food & dining",
        occurredOn: date(12),
        confidence: 0.96,
        source: "demo",
      },
      {
        id: "demo-tx-11",
        merchant: "Campus Pharmacy",
        description: "Cold medicine and toiletries",
        amountCents: 968,
        category: "Other",
        occurredOn: date(13),
        confidence: 0.95,
        source: "demo",
      },
    ],
  };
}
