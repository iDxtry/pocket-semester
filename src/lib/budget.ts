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
  "Food & dining": 32000,
  Housing: 85000,
  Transport: 12000,
  School: 18000,
  Subscriptions: 5500,
  Fun: 16000,
  Other: 7000,
};

export function createDemoWorkspace(month = "2026-07"): WorkspaceData {
  const date = (day: number) => `${month}-${String(day).padStart(2, "0")}`;
  return {
    profile: {
      displayName: "Alex",
      currency: "USD",
      semesterStart: "2026-08-24",
      semesterEnd: "2026-12-18",
      monthlyAllowanceCents: 169200,
    },
    month,
    budgets: categories.map((category) => ({
      category,
      limitCents: defaultBudgetLimits[category],
    })),
    goal: {
      name: "Emergency cushion",
      kind: "emergency",
      targetCents: 100000,
      currentCents: 62000,
      targetDate: "2026-12-18",
    },
    transactions: [
      {
        id: "demo-tx-1",
        merchant: "Campus Market",
        description: "Groceries and snacks",
        amountCents: 4218,
        category: "Food & dining",
        occurredOn: date(12),
        confidence: 0.97,
        source: "demo",
      },
      {
        id: "demo-tx-2",
        merchant: "MetroCard",
        description: "Weekly transit pass",
        amountCents: 3400,
        category: "Transport",
        occurredOn: date(11),
        confidence: 0.99,
        source: "demo",
      },
      {
        id: "demo-tx-3",
        merchant: "North Hall",
        description: "Monthly rent",
        amountCents: 82500,
        category: "Housing",
        occurredOn: date(8),
        confidence: 0.99,
        source: "demo",
      },
      {
        id: "demo-tx-4",
        merchant: "Paper Trail Books",
        description: "Statistics workbook",
        amountCents: 6145,
        category: "School",
        occurredOn: date(7),
        confidence: 0.96,
        source: "demo",
      },
      {
        id: "demo-tx-5",
        merchant: "Streamly",
        description: "Music subscription",
        amountCents: 1099,
        category: "Subscriptions",
        occurredOn: date(5),
        confidence: 0.94,
        source: "demo",
      },
      {
        id: "demo-tx-6",
        merchant: "Corner Coffee",
        description: "Coffee with study group",
        amountCents: 875,
        category: "Food & dining",
        occurredOn: date(3),
        confidence: 0.93,
        source: "demo",
      },
      {
        id: "demo-tx-7",
        merchant: "Campus Cinema",
        description: "Movie night ticket",
        amountCents: 1400,
        category: "Fun",
        occurredOn: date(2),
        confidence: 0.93,
        source: "demo",
      },
    ],
  };
}
