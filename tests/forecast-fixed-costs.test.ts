import assert from "node:assert/strict";
import test from "node:test";
import { getForecast } from "../src/lib/budget-math";

test("forecast does not multiply an already-paid fixed bill", () => {
  const forecast = getForecast(100000, "2026-07", new Date("2026-07-10T12:00:00Z"), 85000);
  assert.equal(forecast.fixedSpendCents, 85000);
  assert.equal(forecast.flexibleDailyPaceCents, 1500);
  assert.equal(forecast.forecastCents, 131500);
});
