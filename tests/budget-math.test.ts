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
  assert.equal(summary.totalSpentCents, 113661);
  assert.equal(summary.categoryHealth.find((item) => item.category === "Food & dining")?.spentCents, 13079);
  assert.equal(summary.availableCents, summary.totalBudgetCents - summary.totalSpentCents);
});

test("demo data keeps its plan inside the allowance and its activity inside the active term", () => {
  for (const month of ["2026-03", "2026-07", "2026-10"]) {
    const data = createDemoWorkspace(month);
    const totalBudget = data.budgets.reduce((total, budget) => total + budget.limitCents, 0);

    assert.ok(totalBudget <= data.profile.monthlyAllowanceCents);
    assert.ok(data.profile.semesterStart);
    assert.ok(data.profile.semesterEnd);
    for (const transaction of data.transactions) {
      assert.ok(transaction.occurredOn >= data.profile.semesterStart!);
      assert.ok(transaction.occurredOn <= data.profile.semesterEnd!);
    }
  }
});

test("demo months have distinct budgets, spending, and term-safe dates", () => {
  const june = createDemoWorkspace("2026-06");
  const july = createDemoWorkspace("2026-07");
  const august = createDemoWorkspace("2026-08");

  assert.notEqual(getBudgetSummary(june.transactions, june.budgets).totalSpentCents, getBudgetSummary(july.transactions, july.budgets).totalSpentCents);
  assert.notEqual(getBudgetSummary(july.transactions, july.budgets).totalSpentCents, getBudgetSummary(august.transactions, august.budgets).totalSpentCents);
  assert.notDeepEqual(june.budgets, july.budgets);
  assert.ok(august.transactions.every((transaction) => transaction.occurredOn >= august.profile.semesterStart! && transaction.occurredOn <= august.profile.semesterEnd!));
});

test("forecast scales spending pace through the selected month", () => {
  const forecast = getForecast(15000, "2026-02", new Date("2026-02-10T12:00:00Z"));
  assert.equal(forecast.daysInMonth, 28);
  assert.equal(forecast.elapsedDays, 10);
  assert.equal(forecast.daysRemaining, 18);
  assert.equal(forecast.forecastCents, 42000);
});
