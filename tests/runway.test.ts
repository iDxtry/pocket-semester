import assert from "node:assert/strict";
import test from "node:test";
import { createDemoWorkspace } from "../src/lib/budget";
import { calculateSemesterRunway } from "../src/lib/runway";

const asOf = new Date("2026-07-15T12:00:00Z");

test("semester runway uses cents and visibly improves when a tradeoff is selected", () => {
  const workspace = createDemoWorkspace("2026-07", asOf);
  const baseline = calculateSemesterRunway({
    month: workspace.month,
    profile: workspace.profile,
    transactions: workspace.transactions,
    budgets: workspace.budgets,
    availableFundsCents: 120_000,
    plannedPurchaseCents: 26_000,
    selectedActionIds: [],
    asOf,
  });
  const adjusted = calculateSemesterRunway({
    month: workspace.month,
    profile: workspace.profile,
    transactions: workspace.transactions,
    budgets: workspace.budgets,
    availableFundsCents: 120_000,
    plannedPurchaseCents: 26_000,
    selectedActionIds: ["postpone-purchase", "food-cap"],
    asOf,
  });

  assert.ok(baseline.projectedNeedCents > 0);
  assert.ok(adjusted.finalBufferCents + adjusted.shortfallCents >= baseline.finalBufferCents + baseline.shortfallCents);
  assert.ok(adjusted.finalBufferCents > baseline.finalBufferCents || adjusted.shortfallCents < baseline.shortfallCents);
  assert.ok(adjusted.actions.some((action) => action.id === "postpone-purchase"));
});
