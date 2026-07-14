import { ArrowDown, ArrowUp, Wallet } from "@phosphor-icons/react/dist/ssr";
import type { WorkspaceData } from "@/lib/budget";
import { formatMoney, getBudgetSummary, getForecast, goalProgress } from "@/lib/budget-math";

export function BudgetSnapshot({ data, compact = false }: { data: WorkspaceData; compact?: boolean }) {
  const summary = getBudgetSummary(data.transactions, data.budgets);
  const fixedSpendCents = data.transactions
    .filter((transaction) => transaction.category === "Housing" || transaction.category === "Subscriptions")
    .reduce((total, transaction) => total + transaction.amountCents, 0);
  const forecast = getForecast(summary.totalSpentCents, data.month, undefined, fixedSpendCents);
  const goal = goalProgress(data.goal);
  const underPlan = summary.totalBudgetCents - forecast.forecastCents;

  return (
    <div className={compact ? "snapshot snapshot-compact" : "snapshot"} aria-label="Budget snapshot">
      <div className="snapshot-heading">
        <span className="snapshot-label">Plan remaining</span>
        <span className="snapshot-icon"><Wallet weight="fill" /></span>
      </div>
      <strong>{formatMoney(summary.availableCents, data.profile.currency)}</strong>
      <div className="snapshot-track" aria-label={`${Math.min(summary.percentUsed, 100)} percent of budget used`}>
        <span style={{ width: `${Math.min(summary.percentUsed, 100)}%` }} />
      </div>
      <div className="snapshot-meta">
        <span>{summary.percentUsed}% planned spending used · {formatMoney(Math.max(data.profile.monthlyAllowanceCents - summary.totalBudgetCents, 0), data.profile.currency)} buffer</span>
        <span className={underPlan >= 0 ? "snapshot-positive" : "snapshot-warning"}>
          {underPlan >= 0 ? <ArrowDown weight="bold" /> : <ArrowUp weight="bold" />}
          {underPlan >= 0 ? `${formatMoney(underPlan, data.profile.currency)} under forecast` : `${formatMoney(Math.abs(underPlan), data.profile.currency)} over forecast`}
        </span>
      </div>
      {!compact && goal && (
        <div className="snapshot-goal">
          <span>{goal.name}</span>
          <strong>{goal.percent}%</strong>
        </div>
      )}
    </div>
  );
}
