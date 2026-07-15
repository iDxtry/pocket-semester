import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/db";
import { analyzeExpense } from "@/lib/ai/provider";
import { getCurrentUserId } from "@/lib/auth";
import { getBudgetSummary } from "@/lib/budget-math";
import { currentMonth, getMerchantRuleCategory, getMonthlyWorkspace } from "@/lib/data";
import { checkPublicRateLimit } from "@/lib/server/rate-limit";
import { expenseAnalysisRequestSchema } from "@/lib/validation";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Please send a valid expense." }, { status: 400 });
  }

  const parsed = expenseAnalysisRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a merchant and a valid positive amount." },
      { status: 400 },
    );
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    const limit = checkPublicRateLimit(request, "analyze", 20);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: `Please wait ${limit.retryAfterSeconds} seconds before another demo analysis.` },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
      );
    }
  }

  if (userId && isDatabaseConfigured()) {
    const month = parsed.data.occurredOn?.slice(0, 7) ?? currentMonth();
    const workspace = await getMonthlyWorkspace(userId, month);
    const summary = getBudgetSummary(workspace.transactions, workspace.budgets);

    const savedCategory = await getMerchantRuleCategory(userId, parsed.data.merchant);
    if (savedCategory) {
      return NextResponse.json({
        category: savedCategory,
        confidence: 1,
        rationale: "You previously corrected this merchant to this category.",
        insight: "Your saved preference takes priority over an automated guess.",
        action: "Keep this category, or edit it if this purchase is an exception.",
        source: "merchant-rule",
        model: null,
      });
    }

    return NextResponse.json(
      await analyzeExpense({
        ...parsed.data,
        monthlySpentCents: summary.totalSpentCents,
        monthlyBudgetCents: Math.max(summary.totalBudgetCents, 1),
      }),
    );
  }

  return NextResponse.json(await analyzeExpense(parsed.data));
}
