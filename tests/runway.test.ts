import assert from "node:assert/strict";
import test from "node:test";
import { createDemoWorkspace } from "../src/lib/budget";
import { calculateSemesterRunway } from "../src/lib/runway";

const asOf = new Date("2026-07-17T12:00:00Z");

test("semester runway reports the true finals shortfall and tradeoff resources", () => {
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
    selectedActionIds: ["postpone-purchase"],
    asOf,
  });

  assert.ok(baseline.projectedNeedCents > 0);
  assert.equal(baseline.projectedNeedCents, 131_455);
  assert.equal(baseline.effectiveResourcesCents, 120_000);
  assert.equal(baseline.shortfallCents, 11_455);
  assert.equal(baseline.shortfallCents, Math.max(baseline.projectedNeedCents - 120_000, 0));
  assert.equal(adjusted.selectedImpactCents, 26_000);
  assert.equal(adjusted.effectiveResourcesCents, 146_000);
  assert.equal(adjusted.finalBufferCents, 14_545);
  assert.equal(adjusted.finalBufferCents, Math.max(146_000 - adjusted.projectedNeedCents, 0));
  assert.equal(baseline.status, "shortfall");
  assert.equal(adjusted.status, "covered");
  assert.ok(adjusted.actions.some((action) => action.id === "postpone-purchase"));
});
