import assert from "node:assert/strict";
import test from "node:test";
import { coachPlanSchema, expenseAnalysisSchema } from "../src/lib/ai/types";
import { parseMappedCsvRows } from "../src/lib/csv";
import { importTransactionsSchema } from "../src/lib/validation";

test("CSV mapping normalizes dates, currency strings, and valid categories", () => {
  const parsed = parseMappedCsvRows(
    [
      { Payee: "Campus Market", Amount: "$42.18", Posted: "7/12/2026", Type: "Food & dining", Memo: "Snacks" },
      { Payee: "", Amount: "$9.00", Posted: "7/13/2026", Type: "Fun", Memo: "" },
    ],
    { merchant: "Payee", description: "Memo", amount: "Amount", date: "Posted", category: "Type" },
  );
  assert.equal(parsed.valid.length, 1);
  assert.equal(parsed.invalid, 1);
  assert.deepEqual(parsed.valid[0], {
    merchant: "Campus Market",
    description: "Snacks",
    amountCents: 4218,
    occurredOn: "2026-07-12",
    category: "Food & dining",
  });
});

test("import route schema refuses invalid expenses", () => {
  const parsed = importTransactionsSchema.safeParse({
    transactions: [{ merchant: "Coffee", description: "", amountCents: -1, occurredOn: "2026-07-12" }],
  });
  assert.equal(parsed.success, false);
});

test("AI structured outputs require bounded, usable content", () => {
  const analysis = expenseAnalysisSchema.safeParse({ category: "Food & dining", confidence: 0.92, insight: "On track", action: "Pack lunch twice." });
  assert.equal(analysis.success, true);
  const coach = coachPlanSchema.safeParse({
    summary: "Your plan is workable if food spending stays modest this week.",
    watchouts: [{ category: "Food & dining", message: "You have room for three more low-cost meals." }],
    actions: [
      { title: "Use your campus meal plan", detail: "Choose two meal-plan lunches before Friday.", estimatedImpactCents: 1800 },
      { title: "Pause one optional purchase", detail: "Wait 48 hours before buying a non-essential item.", estimatedImpactCents: 1200 },
    ],
    estimatedImpactCents: 3000,
  });
  assert.equal(coach.success, true);
});
