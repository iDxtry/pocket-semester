import assert from "node:assert/strict";
import test from "node:test";
import { createDemoWorkspace } from "../src/lib/budget";
import { getBudgetSummary, getForecast, toCents } from "../src/lib/budget-math";

test("money amounts are converted to integer cents", () => {
  assert.equal(toCents(12.345), 1235);
  assert.equal(toCents(0.1 + 0.2), 30);
});

test("budget summary aggregates every category without float drift", () => {
  const data = createDemoWorkspace();
  const summary = getBudgetSummary(data.transactions, data.budgets);
  assert.equal(summary.totalSpentCents, 99637);
  assert.equal(summary.categoryHealth.find((item) => item.category === "Food & dining")?.spentCents, 5093);
  assert.equal(summary.availableCents, summary.totalBudgetCents - summary.totalSpentCents);
});

test("forecast scales spending pace through the selected month", () => {
  const forecast = getForecast(15000, "2026-02", new Date("2026-02-10T12:00:00Z"));
  assert.equal(forecast.daysInMonth, 28);
  assert.equal(forecast.elapsedDays, 10);
  assert.equal(forecast.daysRemaining, 18);
  assert.equal(forecast.forecastCents, 42000);
});
