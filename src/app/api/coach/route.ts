import { NextResponse } from "next/server";
import { z } from "zod";
import { coachRuns } from "@/db/schema";
import { getDb, isDatabaseConfigured } from "@/db";
import { generateCoachPlan } from "@/lib/ai/provider";
import { getCurrentUserId } from "@/lib/auth";
import { getBudgetSummary, getForecast, monthStart } from "@/lib/budget-math";
import { currentMonth, getLatestCoachRun, getMonthlyWorkspace } from "@/lib/data";
import { checkPublicRateLimit } from "@/lib/server/rate-limit";
import { demoCoachRequestSchema, monthSchema } from "@/lib/validation";

const monthRequestSchema = z.object({ month: monthSchema.optional() });

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Please send valid coach context." }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    const demo = demoCoachRequestSchema.safeParse(payload);
    if (!demo.success) return NextResponse.json({ error: "Please refresh the demo and try again." }, { status: 400 });
    const limit = checkPublicRateLimit(request, "coach", 4);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Please wait ${limit.retryAfterSeconds} seconds before another demo coach run.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
    const result = await generateCoachPlan(demo.data);
    if (result.status === "unavailable") return NextResponse.json({ error: result.reason }, { status: 503 });
    return NextResponse.json(result);
  }

  if (!isDatabaseConfigured()) return NextResponse.json({ error: "Account storage is still being configured." }, { status: 503 });
  const parsedMonth = monthRequestSchema.safeParse(payload);
  if (!parsedMonth.success) return NextResponse.json({ error: "Please select a valid month." }, { status: 400 });
  const month = parsedMonth.data.month ?? currentMonth();
  const previous = await getLatestCoachRun(userId, month);
  const cooldownMs = 60_000;
  const now = Date.now();
  if (previous && now - previous.createdAt.getTime() < cooldownMs) {
    const retryAfterSeconds = Math.ceil((cooldownMs - (now - previous.createdAt.getTime())) / 1000);
    return NextResponse.json(
      { error: `Your plan is fresh. Try again in ${retryAfterSeconds} seconds.`, retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  const workspace = await getMonthlyWorkspace(userId, month);
  const summary = getBudgetSummary(workspace.transactions, workspace.budgets);
  const fixedSpendCents = workspace.transactions
    .filter((transaction) => transaction.category === "Housing" || transaction.category === "Subscriptions")
    .reduce((total, transaction) => total + transaction.amountCents, 0);
  const forecast = getForecast(summary.totalSpentCents, month, undefined, fixedSpendCents);
  const result = await generateCoachPlan({
    month,
    monthlyBudgetCents: summary.totalBudgetCents,
    totalSpentCents: summary.totalSpentCents,
    forecastCents: forecast.forecastCents,
    categoryHealth: summary.categoryHealth.map((item) => ({
      category: item.category,
      spentCents: item.spentCents,
      limitCents: item.limitCents,
    })),
    goal: workspace.goal
      ? { name: workspace.goal.name, targetCents: workspace.goal.targetCents, currentCents: workspace.goal.currentCents }
      : null,
  });
  if (result.status === "unavailable") return NextResponse.json({ error: result.reason }, { status: 503 });

  await getDb().insert(coachRuns).values({ userId, month: monthStart(month), plan: result.plan, model: result.model });
  return NextResponse.json(result);
}
