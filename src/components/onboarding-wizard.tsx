"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowRight, CheckCircle, Sparkle } from "@phosphor-icons/react";
import { categories, defaultBudgetLimits, type Category } from "@/lib/budget";
import { toCents } from "@/lib/budget-math";

function dollarsFromCents(cents: number) {
  return (cents / 100).toFixed(0);
}

export function OnboardingWizard() {
  const [budgetValues, setBudgetValues] = useState<Record<Category, string>>(
    Object.fromEntries(categories.map((category) => [category, dollarsFromCents(defaultBudgetLimits[category])])) as Record<Category, string>,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  const totalBudget = useMemo(
    () => Object.values(budgetValues).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [budgetValues],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = {
      displayName: String(form.get("displayName") ?? "").trim(),
      currency: String(form.get("currency") ?? "USD"),
      semesterStart: String(form.get("semesterStart") ?? ""),
      semesterEnd: String(form.get("semesterEnd") ?? ""),
      monthlyAllowanceCents: toCents(Number(form.get("monthlyAllowance") ?? 0)),
      budgets: categories.map((category) => ({ category, limitCents: toCents(Number(budgetValues[category] || 0)) })),
      goal: {
        name: String(form.get("goalName") ?? "Emergency cushion").trim(),
        kind: String(form.get("goalKind") ?? "emergency"),
        targetCents: toCents(Number(form.get("goalTarget") ?? 0)),
        currentCents: toCents(Number(form.get("goalCurrent") ?? 0)),
        targetDate: String(form.get("goalDate") ?? "") || null,
      },
    };

    try {
      const response = await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save your setup.");
      window.location.assign("/dashboard");
    } catch (submissionError) {
      setStatus("error");
      setError(submissionError instanceof Error ? submissionError.message : "Could not save your setup.");
    }
  }

  return (
    <main className="onboarding-page">
      <section className="onboarding-intro">
        <p className="eyebrow"><Sparkle weight="fill" /> Set up your spending semester</p>
        <h1>Start with a plan that fits your real student life.</h1>
        <p>These details create your first private budget. You can adjust every number later.</p>
        <ul><li><CheckCircle weight="fill" /> Category limits stay visible while you spend.</li><li><CheckCircle weight="fill" /> Your goal is separate from day-to-day spending.</li><li><CheckCircle weight="fill" /> Amounts are stored as cents for accuracy.</li></ul>
      </section>
      <section className="onboarding-card">
        <form onSubmit={submit}>
          <div className="form-section"><h2>About your semester</h2><div className="form-grid two"><label>Name<input name="displayName" required maxLength={80} placeholder="Your first name" /></label><label>Currency<select name="currency" defaultValue="USD"><option value="USD">USD</option><option value="CAD">CAD</option><option value="GBP">GBP</option><option value="EUR">EUR</option></select></label><label>Semester starts<input name="semesterStart" type="date" required defaultValue="2026-08-24" /></label><label>Semester ends<input name="semesterEnd" type="date" required defaultValue="2026-12-18" /></label></div></div>
          <div className="form-section"><h2>Monthly income or allowance</h2><p>Use the money you actually expect to have for a typical month.</p><label className="currency-field"><span>$</span><input name="monthlyAllowance" type="number" min="0" max="100000" step="1" defaultValue="1692" required /></label></div>
          <div className="form-section"><div className="section-heading"><div><h2>Category budget</h2><p>Start with a realistic monthly limit for each category.</p></div><strong>${totalBudget.toLocaleString()} planned</strong></div><div className="budget-form-grid">{categories.map((category) => <label key={category}>{category}<span className="currency-field"><b>$</b><input type="number" min="0" max="100000" step="1" value={budgetValues[category]} onChange={(event) => setBudgetValues((current) => ({ ...current, [category]: event.target.value }))} /></span></label>)}</div></div>
          <div className="form-section"><h2>One savings goal</h2><div className="form-grid two"><label>Goal name<input name="goalName" defaultValue="Emergency cushion" required maxLength={80} /></label><label>Goal type<select name="goalKind" defaultValue="emergency"><option value="emergency">Emergency fund</option><option value="semester">Semester savings</option></select></label><label>Target amount<input name="goalTarget" type="number" min="1" max="100000" step="1" defaultValue="1000" required /></label><label>Already saved<input name="goalCurrent" type="number" min="0" max="100000" step="1" defaultValue="0" required /></label><label>Target date<input name="goalDate" type="date" defaultValue="2026-12-18" /></label></div></div>
          {status === "error" && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button wide" disabled={status === "saving"}>{status === "saving" ? "Saving your budget" : <>Create my budget <ArrowRight weight="bold" /></>}</button>
        </form>
      </section>
    </main>
  );
}
