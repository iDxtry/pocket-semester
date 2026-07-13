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

export type Transaction = {
  id: string;
  merchant: string;
  description: string;
  amount: number;
  category: Category;
  date: string;
  confidence: number;
};

export type Budget = {
  category: Category;
  limit: number;
};

export type Analysis = {
  category: Category;
  confidence: number;
  insight: string;
  action: string;
  source: "gemini" | "rules";
};

export const sampleBudgets: Budget[] = [
  { category: "Food & dining", limit: 320 },
  { category: "Housing", limit: 850 },
  { category: "Transport", limit: 120 },
  { category: "School", limit: 180 },
  { category: "Subscriptions", limit: 55 },
  { category: "Fun", limit: 160 },
];

export const sampleTransactions: Transaction[] = [
  {
    id: "tx-1",
    merchant: "Campus Market",
    description: "Groceries and snacks",
    amount: 42.18,
    category: "Food & dining",
    date: "Jul 12",
    confidence: 0.97,
  },
  {
    id: "tx-2",
    merchant: "MetroCard",
    description: "Weekly transit pass",
    amount: 34,
    category: "Transport",
    date: "Jul 11",
    confidence: 0.99,
  },
  {
    id: "tx-3",
    merchant: "North Hall",
    description: "Monthly rent",
    amount: 825,
    category: "Housing",
    date: "Jul 8",
    confidence: 0.99,
  },
  {
    id: "tx-4",
    merchant: "Paper Trail Books",
    description: "Statistics workbook",
    amount: 61.45,
    category: "School",
    date: "Jul 7",
    confidence: 0.96,
  },
  {
    id: "tx-5",
    merchant: "Streamly",
    description: "Music subscription",
    amount: 10.99,
    category: "Subscriptions",
    date: "Jul 5",
    confidence: 0.94,
  },
  {
    id: "tx-6",
    merchant: "Corner Coffee",
    description: "Coffee with study group",
    amount: 8.75,
    category: "Food & dining",
    date: "Jul 3",
    confidence: 0.93,
  },
];
