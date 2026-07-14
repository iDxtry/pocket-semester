"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, Sparkle, Warning } from "@phosphor-icons/react";
import { categories, defaultBudgetLimits, type Category } from "@/lib/budget";
import { toCents } from "@/lib/budget-math";

type SetupStep = 0 | 1 | 2;

function dollarsFromCents(cents: number) {
  return (cents / 100).toFixed(0);
}

export function OnboardingWizard() {
  const [step, setStep] = useState<SetupStep>(0);
  const [about, setAbout] = useState({
    displayName: "",
    currency: "USD",
    semesterStart: "2026-08-24",
    semesterEnd: "2026-12-18",
    monthlyAllowance: "1850",
  });
  const [budgetValues, setBudgetValues] = useState<Record<Category, string>>(
    Object.fromEntries(categories.map((category) => [category, dollarsFromCents(defaultBudgetLimits[category])])) as Record<Category, string>,
  );
  const [goal, setGoal] = useState({
    name: "Emergency cushion",
    kind: "emergency",
    target: "1000",
    current: "0",
    targetDate: "2026-12-18",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  const totalBudget = useMemo(
    () => Object.values(budgetValues).reduce((sum, value) => sum + (Number(value) || 0), 0),
    [budgetValues],
  );
  const monthlyAllowance = Math.max(0, Number(about.monthlyAllowance) || 0);
  const planDifference = monthlyAllowance - totalBudget;
  const stepCopy = [
    { title: "Semester and allowance", copy: "Start with the timing and money you realistically expect to have each month." },
    { title: "Category plan", copy: "Use the recommended starting limits, then make them feel like your real student life." },
    { title: "Savings goal", copy: "Keep one cushion visible while you make day-to-day spending choices." },
  ][step];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 2) {
      if (!event.currentTarget.reportValidity()) return;
      setStep((current) => (current + 1) as SetupStep);
      return;
    }

    setStatus("saving");
    setError("");
    const payload = {
      displayName: about.displayName.trim(),
      currency: about.currency,
      semesterStart: about.semesterStart,
      semesterEnd: about.semesterEnd,
      monthlyAllowanceCents: toCents(monthlyAllowance),
      budgets: categories.map((category) => ({ category, limitCents: toCents(Number(budgetValues[category] || 0)) })),
      goal: {
        name: goal.name.trim(),
        kind: goal.kind,
        targetCents: toCents(Number(goal.target) || 0),
        currentCents: toCents(Number(goal.current) || 0),
        targetDate: goal.targetDate || null,
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
        <p>Three short steps create your first private budget. You can adjust every number later.</p>
        <ul><li><CheckCircle weight="fill" /> Category limits stay visible while you spend.</li><li><CheckCircle weight="fill" /> Your goal is separate from day-to-day spending.</li><li><CheckCircle weight="fill" /> Amounts are stored as cents for accuracy.</li></ul>
      </section>
      <section className="onboarding-card">
        <ol className="onboarding-progress" aria-label={`Setup step ${step + 1} of 3`}>
          {["Semester", "Plan", "Goal"].map((label, index) => <li key={label} className={index === step ? "active" : index < step ? "complete" : ""} aria-current={index === step ? "step" : undefined}><span>{index < step ? <CheckCircle weight="fill" /> : index + 1}</span>{label}</li>)}
        </ol>
        <form onSubmit={submit}>
          <div className="form-section">
            <h2>{stepCopy.title}</h2>
            <p>{stepCopy.copy}</p>
            {step === 0 && <><div className="form-grid two"><label>Name<input name="displayName" value={about.displayName} onChange={(event) => setAbout((current) => ({ ...current, displayName: event.target.value }))} required maxLength={80} placeholder="Your first name" /></label><label>Currency<select name="currency" value={about.currency} onChange={(event) => setAbout((current) => ({ ...current, currency: event.target.value }))}><option value="USD">USD</option><option value="CAD">CAD</option><option value="GBP">GBP</option><option value="EUR">EUR</option></select></label><label>Semester starts<input name="semesterStart" type="date" value={about.semesterStart} onChange={(event) => setAbout((current) => ({ ...current, semesterStart: event.target.value }))} required /></label><label>Semester ends<input name="semesterEnd" type="date" value={about.semesterEnd} onChange={(event) => setAbout((current) => ({ ...current, semesterEnd: event.target.value }))} required /></label></div><label className="currency-field onboarding-allowance"><span>$</span><input name="monthlyAllowance" aria-label="Monthly income or allowance" type="number" min="0" max="100000" step="1" value={about.monthlyAllowance} onChange={(event) => setAbout((current) => ({ ...current, monthlyAllowance: event.target.value }))} required /></label><p className="onboarding-field-note">Monthly income or allowance: use the money you actually expect to have in a typical month.</p></>}
            {step === 1 && <><div className="section-heading"><div><h3>Recommended category limits</h3><p>They add up to ${totalBudget.toLocaleString()} this month.</p></div><strong>{planDifference >= 0 ? `${planDifference.toLocaleString()} unassigned` : `${Math.abs(planDifference).toLocaleString()} over`}</strong></div><div className="budget-form-grid">{categories.map((category) => <label key={category}>{category}<span className="currency-field"><b>$</b><input type="number" min="0" max="100000" step="1" value={budgetValues[category]} onChange={(event) => setBudgetValues((current) => ({ ...current, [category]: event.target.value }))} /></span></label>)}</div>{planDifference < 0 && <p className="onboarding-warning" role="status"><Warning weight="fill" /> Your category plan is ${Math.abs(planDifference).toLocaleString()} above your expected allowance. You can continue, but consider lowering a flexible category.</p>}</>}
            {step === 2 && <div className="form-grid two"><label>Goal name<input name="goalName" value={goal.name} onChange={(event) => setGoal((current) => ({ ...current, name: event.target.value }))} required maxLength={80} /></label><label>Goal type<select name="goalKind" value={goal.kind} onChange={(event) => setGoal((current) => ({ ...current, kind: event.target.value }))}><option value="emergency">Emergency fund</option><option value="semester">Semester savings</option></select></label><label>Target amount<input name="goalTarget" type="number" min="1" max="100000" step="1" value={goal.target} onChange={(event) => setGoal((current) => ({ ...current, target: event.target.value }))} required /></label><label>Already saved<input name="goalCurrent" type="number" min="0" max="100000" step="1" value={goal.current} onChange={(event) => setGoal((current) => ({ ...current, current: event.target.value }))} required /></label><label>Target date<input name="goalDate" type="date" value={goal.targetDate} onChange={(event) => setGoal((current) => ({ ...current, targetDate: event.target.value }))} /></label></div>}
          </div>
          {status === "error" && <p className="form-error" role="alert">{error}</p>}
          <div className="onboarding-actions">{step > 0 && <button className="secondary-button" type="button" onClick={() => setStep((current) => (current - 1) as SetupStep)}><ArrowLeft weight="bold" /> Back</button>}<button className="primary-button" disabled={status === "saving"}>{status === "saving" ? "Saving your budget" : step === 2 ? <>Create my budget <ArrowRight weight="bold" /></> : <>Continue <ArrowRight weight="bold" /></>}</button></div>
        </form>
      </section>
    </main>
  );
}
