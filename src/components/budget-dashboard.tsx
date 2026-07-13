"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  CaretRight,
  ChartDonut,
  CheckCircle,
  CurrencyDollar,
  House,
  List,
  Plus,
  Receipt,
  Sparkle,
  Target,
  Wallet,
  X,
} from "@phosphor-icons/react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import {
  sampleBudgets,
  sampleTransactions,
  type Analysis,
  type Category,
  type Transaction,
} from "@/lib/budget";

const weeklySpend = [
  { day: "Mon", amount: 28 },
  { day: "Tue", amount: 46 },
  { day: "Wed", amount: 38 },
  { day: "Thu", amount: 72 },
  { day: "Fri", amount: 54 },
  { day: "Sat", amount: 81 },
  { day: "Sun", amount: 42 },
];

const categoryColors: Record<Category, string> = {
  "Food & dining": "var(--chart-1)",
  Housing: "var(--chart-2)",
  Transport: "var(--chart-3)",
  School: "var(--chart-4)",
  Subscriptions: "var(--chart-5)",
  Fun: "var(--chart-6)",
  Other: "var(--muted)",
};

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function BudgetDashboard() {
  const [transactions, setTransactions] = useState(sampleTransactions);
  const [showForm, setShowForm] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState<Analysis>({
    category: "Food & dining",
    confidence: 0.93,
    insight: "Dining is your most flexible category this week. Two lower-cost meals would keep your weekend budget intact.",
    action: "Set a $24 dining cap through Friday and move the difference to your emergency goal.",
    source: "rules",
  });

  const spent = useMemo(
    () => transactions.reduce((total, transaction) => total + transaction.amount, 0),
    [transactions],
  );
  const monthlyBudget = sampleBudgets.reduce((total, budget) => total + budget.limit, 0);
  const remaining = monthlyBudget - spent;
  const budgetUse = Math.min(Math.round((spent / monthlyBudget) * 100), 100);

  const categorySpend = useMemo(
    () =>
      sampleBudgets.map((budget) => ({
        ...budget,
        spent: transactions
          .filter((transaction) => transaction.category === budget.category)
          .reduce((total, transaction) => total + transaction.amount, 0),
      })),
    [transactions],
  );

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsAnalyzing(true);

    const form = new FormData(event.currentTarget);
    const merchant = String(form.get("merchant") ?? "").trim();
    const description = String(form.get("description") ?? "").trim();
    const amount = Number(form.get("amount"));

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant, description, amount, monthlySpent: spent, monthlyBudget }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not analyze this expense.");

      const nextTransaction: Transaction = {
        id: crypto.randomUUID(),
        merchant,
        description: description || "New expense",
        amount,
        category: result.category,
        confidence: result.confidence,
        date: "Today",
      };

      setTransactions((current) => [nextTransaction, ...current]);
      setAnalysis(result);
      setShowForm(false);
      event.currentTarget.reset();
    } catch (expenseError) {
      setError(expenseError instanceof Error ? expenseError.message : "Could not add expense.");
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Pocket Semester dashboard">
          <span className="brand-mark"><Wallet weight="fill" /></span>
          <span>Pocket Semester</span>
        </a>

        <nav className="nav-list">
          <a className="nav-item active" href="#overview"><House weight="fill" />Overview</a>
          <a className="nav-item" href="#transactions"><Receipt />Transactions</a>
          <a className="nav-item" href="#budgets"><Target />Budgets</a>
          <a className="nav-item" href="#insights"><Brain />AI insights</a>
        </nav>

        <div className="sidebar-note">
          <Sparkle weight="fill" />
          <p><strong>Small changes add up.</strong> You are on pace to finish July under budget.</p>
        </div>

        <div className="student-profile">
          <span className="avatar">AM</span>
          <span><strong>Alex Morgan</strong><small>Student plan</small></span>
        </div>
      </aside>

      <main className="dashboard" id="top">
        <header className="topbar">
          <button className="mobile-menu" aria-label="Open navigation"><List /></button>
          <div>
            <p className="date-label">July overview</p>
            <h1>Good afternoon, Alex.</h1>
          </div>
          <button className="primary-button" onClick={() => setShowForm(true)}>
            <Plus weight="bold" /> Add expense
          </button>
        </header>

        <section className="metrics" id="overview" aria-label="Budget summary">
          <article className="metric primary-metric">
            <div className="metric-heading"><span>Available this month</span><Wallet /></div>
            <strong>{money(remaining)}</strong>
            <p><ArrowUpRight weight="bold" /> {budgetUse}% of your plan used</p>
            <div className="budget-track" aria-label={`${budgetUse}% of budget used`}>
              <span style={{ width: `${budgetUse}%` }} />
            </div>
          </article>
          <article className="metric">
            <div className="metric-heading"><span>Monthly spending</span><CurrencyDollar /></div>
            <strong>{money(spent)}</strong>
            <p className="positive"><ArrowDownRight weight="bold" /> $84 less than this point in June</p>
          </article>
          <article className="metric">
            <div className="metric-heading"><span>Emergency goal</span><Target /></div>
            <strong>$620 <small>of $1,000</small></strong>
            <p>Next transfer scheduled for Friday</p>
          </article>
        </section>

        <section className="main-grid">
          <article className="panel spending-panel">
            <div className="panel-heading">
              <div><h2>Weekly spending</h2><p>Your daily total across all categories.</p></div>
              <span className="trend-tag"><ArrowDownRight weight="bold" /> 12% vs last week</span>
            </div>
            <div className="chart-wrap" aria-label="Weekly spending area chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weeklySpend} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} />
                  <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12 }} formatter={(value) => [`$${value}`, "Spent"]} />
                  <Area type="monotone" dataKey="amount" stroke="var(--accent)" strokeWidth={2.5} fill="url(#spendFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="panel insight-panel" id="insights">
            <div className="insight-icon"><Brain weight="fill" /></div>
            <div>
              <span className="ai-label">Smart insight</span>
              <h2>{analysis.insight}</h2>
              <p>{analysis.action}</p>
            </div>
            <div className="insight-meta">
              <span><CheckCircle weight="fill" /> {Math.round(analysis.confidence * 100)}% confidence</span>
              <span>{analysis.source === "gemini" ? "Gemini analysis" : "Fast local analysis"}</span>
            </div>
          </article>
        </section>

        <section className="lower-grid">
          <article className="panel transactions-panel" id="transactions">
            <div className="panel-heading compact">
              <div><h2>Recent transactions</h2><p>Automatically categorized as they arrive.</p></div>
              <button className="text-button">View all <CaretRight /></button>
            </div>
            <div className="transaction-list">
              {transactions.slice(0, 5).map((transaction) => (
                <div className="transaction" key={transaction.id}>
                  <span className="transaction-icon" style={{ color: categoryColors[transaction.category] }}><Receipt weight="fill" /></span>
                  <span className="transaction-copy"><strong>{transaction.merchant}</strong><small>{transaction.category} - {transaction.date}</small></span>
                  <span className="transaction-amount">-{money(transaction.amount)}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel budgets-panel" id="budgets">
            <div className="panel-heading compact">
              <div><h2>Budget health</h2><p>Category limits for July.</p></div>
              <ChartDonut />
            </div>
            <div className="budget-list">
              {categorySpend.slice(0, 4).map((budget) => {
                const percent = Math.min(Math.round((budget.spent / budget.limit) * 100), 100);
                return (
                  <div className="budget-row" key={budget.category}>
                    <div><strong>{budget.category}</strong><span>{money(budget.spent)} of {money(budget.limit)}</span></div>
                    <div className="category-track"><span style={{ width: `${percent}%`, background: categoryColors[budget.category] }} /></div>
                  </div>
                );
              })}
            </div>
          </article>
        </section>
      </main>

      {showForm && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowForm(false)}>
          <section className="expense-modal" role="dialog" aria-modal="true" aria-labelledby="expense-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading">
              <div><h2 id="expense-title">Add an expense</h2><p>AI will categorize it and refresh your recommendation.</p></div>
              <button className="icon-button" onClick={() => setShowForm(false)} aria-label="Close"><X /></button>
            </div>
            <form onSubmit={addExpense}>
              <label>Merchant<input name="merchant" required maxLength={80} placeholder="Example: Campus Market" /></label>
              <label>Description<input name="description" maxLength={180} placeholder="What did you buy?" /></label>
              <label>Amount<div className="amount-input"><span>$</span><input name="amount" type="number" min="0.01" max="100000" step="0.01" required placeholder="0.00" /></div></label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="primary-button wide" disabled={isAnalyzing}>
                {isAnalyzing ? <><span className="loading-block" /> Analyzing expense</> : <><Sparkle weight="fill" /> Categorize and add</>}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
