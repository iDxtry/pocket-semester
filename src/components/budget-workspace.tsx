"use client";

import { FormEvent, KeyboardEvent, ReactNode, useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { SignOutButton } from "@clerk/nextjs";
import Papa from "papaparse";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Brain,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChartDonut,
  CheckCircle,
  CurrencyDollar,
  FileCsv,
  FloppyDisk,
  Gear,
  House,
  List,
  PencilSimple,
  Plus,
  Receipt,
  ShieldCheck,
  SignOut,
  Sparkle,
  Target,
  Trash,
  UploadSimple,
  Wallet,
  Warning,
  X,
} from "@phosphor-icons/react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { categories, categoryColors, type BudgetTransaction, type Category, type CategoryBudget, type StudentGoal, type StudentProfile, type WorkspaceData } from "@/lib/budget";
import { formatMoney, getBudgetSummary, getForecast, goalProgress, isoDateForMonthOffset, makeWeekSeries, monthLabel, monthShortLabel, toCents } from "@/lib/budget-math";
import { parseMappedCsvRows, type ParsedCsvExpense } from "@/lib/csv";
import type { AiSource, CoachPlan } from "@/lib/ai/types";
import { routeForView, type WorkspaceView } from "@/lib/routes";

type WorkspaceMode = "demo" | "account";
type CategoryFilter = Category | "all";
type ExpenseFormValues = { merchant: string; description: string; amountCents: number; occurredOn: string; category: Category | null };
type CsvDraftRow = ParsedCsvExpense;
type ExpenseAnalysisResponse = { category: Category; confidence: number; source: AiSource; model: string | null; insight: string; action: string };
type CoachResponse = { plan: CoachPlan; source: Exclude<AiSource, "local">; model: string };
type CoachProvenance = { source: AiSource | "example"; model: string | null };
type LatestCategorization = {
  transaction: BudgetTransaction;
  analysis: ExpenseAnalysisResponse;
  projectedCategorySpentCents: number;
  categoryLimitCents: number;
};

const demoExampleCoachPlan: CoachPlan = {
  summary: "Your fictional summer plan still has room for the rest of the month. Keep food spending deliberate so the emergency cushion can stay on pace.",
  watchouts: [{ category: "Food & dining", message: "Food is the most flexible part of this sample plan, so small meal choices move the forecast fastest." }],
  actions: [
    { title: "Choose two lower-cost campus meals", detail: "Use your meal plan or a grocery option twice before the weekend instead of another convenience purchase.", estimatedImpactCents: 1800 },
    { title: "Pause one optional purchase", detail: "Give a non-essential purchase 48 hours before deciding so your emergency goal stays protected.", estimatedImpactCents: 1200 },
  ],
  estimatedImpactCents: 3000,
};

const navigation: Array<{ view: WorkspaceView; label: string; Icon: typeof House }> = [
  { view: "dashboard", label: "Overview", Icon: House },
  { view: "transactions", label: "Transactions", Icon: Receipt },
  { view: "budgets", label: "Budgets", Icon: Target },
  { view: "goals", label: "Goals", Icon: Wallet },
  { view: "insights", label: "AI insights", Icon: Brain },
  { view: "settings", label: "Settings", Icon: Gear },
];

const viewTitles: Record<WorkspaceView, { eyebrow: string; heading: string }> = {
  dashboard: { eyebrow: "Budget overview", heading: "A clearer plan for this month." },
  transactions: { eyebrow: "Spending history", heading: "Every expense has context." },
  budgets: { eyebrow: "Category limits", heading: "Give each dollar a job." },
  goals: { eyebrow: "Savings goals", heading: "Protect the cushion you are building." },
  insights: { eyebrow: "Budget coach", heading: "Turn your numbers into next steps." },
  settings: { eyebrow: "Privacy and preferences", heading: "Keep your workspace yours." },
};

function displayDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
}

function sortTransactions(items: BudgetTransaction[]) {
  return [...items].sort((a, b) => b.occurredOn.localeCompare(a.occurredOn));
}

function defaultDateForMonth(month: string) {
  const today = new Date().toISOString().slice(0, 10);
  return today.startsWith(month) ? today : `${month}-01`;
}

function confidenceLabel(confidence: number) {
  if (confidence >= 0.85) return "High confidence";
  if (confidence >= 0.7) return "Medium confidence";
  return "Low confidence";
}

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body?.error === "string" ? body.error : "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return body as T;
}

function routeHref(mode: WorkspaceMode, view: WorkspaceView, month: string) {
  if (mode === "demo") return `/demo?view=${view}&month=${month}`;
  return `${routeForView(view)}?month=${month}`;
}

export function BudgetWorkspace({
  mode,
  initialView,
  initialData,
  initialCoachPlan = null,
  initialCategory = "all",
}: {
  mode: WorkspaceMode;
  initialView: WorkspaceView;
  initialData: WorkspaceData;
  initialCoachPlan?: CoachPlan | null;
  initialCategory?: CategoryFilter;
}) {
  const [activeView, setActiveView] = useState(initialView);
  const [profile, setProfile] = useState<StudentProfile>(initialData.profile);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>(initialData.transactions);
  const [budgets, setBudgets] = useState<CategoryBudget[]>(initialData.budgets);
  const [budgetDraft, setBudgetDraft] = useState<CategoryBudget[]>(initialData.budgets);
  const [goal, setGoal] = useState<StudentGoal | null>(initialData.goal);
  const [goalDraft, setGoalDraft] = useState<StudentGoal>(initialData.goal ?? {
    name: "Emergency cushion", kind: "emergency", targetCents: 100000, currentCents: 0, targetDate: null,
  });
  const [coachPlan, setCoachPlan] = useState<CoachPlan | null>(() => initialCoachPlan ?? (mode === "demo" ? demoExampleCoachPlan : null));
  const [coachProvenance, setCoachProvenance] = useState<CoachProvenance | null>(() => initialCoachPlan ? null : mode === "demo" ? { source: "example", model: null } : null);
  const [coachState, setCoachState] = useState<"idle" | "loading">("idle");
  const [coachError, setCoachError] = useState("");
  const [notice, setNotice] = useState("");
  const [latestCategorization, setLatestCategorization] = useState<LatestCategorization | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const mobileMenuRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const mobilePreviousFocusRef = useRef<HTMLElement | null>(null);
  const [showExpense, setShowExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<BudgetTransaction | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(initialCategory);
  const month = initialData.month;

  const summary = useMemo(() => getBudgetSummary(transactions, budgets), [transactions, budgets]);
  const fixedSpendCents = useMemo(
    () => transactions
      .filter((transaction) => transaction.category === "Housing" || transaction.category === "Subscriptions")
      .reduce((total, transaction) => total + transaction.amountCents, 0),
    [transactions],
  );
  const forecast = useMemo(() => getForecast(summary.totalSpentCents, month, undefined, fixedSpendCents), [summary.totalSpentCents, month, fixedSpendCents]);
  const goalSummary = useMemo(() => goalProgress(goal), [goal]);
  const weekSeries = useMemo(() => makeWeekSeries(transactions, month), [transactions, month]);
  const filteredTransactions = useMemo(
    () => sortTransactions(categoryFilter === "all" ? transactions : transactions.filter((transaction) => transaction.category === categoryFilter)),
    [categoryFilter, transactions],
  );
  const forecastDifference = summary.totalBudgetCents - forecast.forecastCents;

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => setIsMobileLayout(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!isMobileLayout || !mobileOpen) return;

    mobilePreviousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : mobileMenuRef.current;
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstFocusable = sidebarRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex=\"-1\"])");
    const focusIntoDrawer = window.requestAnimationFrame(() => firstFocusable?.focus());

    function handleDrawerKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab" || !sidebarRef.current) return;
      const focusable = Array.from(sidebarRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), [tabindex]:not([tabindex=\"-1\"])")).filter((element) => !element.hasAttribute("inert") && element.getAttribute("aria-hidden") !== "true");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDrawerKeyDown);
    return () => {
      window.cancelAnimationFrame(focusIntoDrawer);
      document.removeEventListener("keydown", handleDrawerKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      const previousFocus = mobilePreviousFocusRef.current;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isMobileLayout, mobileOpen]);

  function openExpense(transaction: BudgetTransaction | null = null) {
    setEditingExpense(transaction);
    setShowExpense(true);
  }

  function activateDemoView(view: WorkspaceView) {
    setActiveView(view);
    setMobileOpen(false);
    window.history.pushState({}, "", routeHref(mode, view, month));
  }

  function handleNavigation(event: React.MouseEvent<HTMLAnchorElement>, view: WorkspaceView) {
    if (mode !== "demo") return;
    event.preventDefault();
    activateDemoView(view);
  }

  function drillIntoCategory(category: Category) {
    setCategoryFilter(category);
    if (mode === "demo") {
      activateDemoView("transactions");
      return;
    }
    window.location.assign(`/transactions?month=${month}&category=${encodeURIComponent(category)}`);
  }

  function moveMonth(offset: number) {
    const nextMonth = isoDateForMonthOffset(month, offset);
    window.location.assign(routeHref(mode, activeView, nextMonth));
  }

  async function saveExpense(values: ExpenseFormValues) {
    if (editingExpense) {
      if (mode === "demo") {
        setTransactions((items) => sortTransactions(items.map((transaction) => (
          transaction.id === editingExpense.id
            ? { ...transaction, ...values, category: values.category ?? transaction.category, confidence: values.category ? 1 : transaction.confidence }
            : transaction
        ))));
      } else {
        const response = await fetch(`/api/transactions/${editingExpense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const body = await responseJson<{ transaction: BudgetTransaction }>(response);
        setTransactions((items) => sortTransactions(items.map((transaction) => transaction.id === body.transaction.id ? body.transaction : transaction)));
      }
      setNotice("Expense updated. Future entries from this merchant can use your corrected category.");
      setEditingExpense(null);
      return;
    }

    let analysis: ExpenseAnalysisResponse | null = null;
    let category = values.category;
    let analysisUnavailable = false;
    if (!category) {
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            merchant: values.merchant,
            description: values.description,
            amountCents: values.amountCents,
            occurredOn: values.occurredOn,
            monthlySpentCents: summary.totalSpentCents,
            monthlyBudgetCents: Math.max(summary.totalBudgetCents, 1),
          }),
        });
        analysis = await responseJson<ExpenseAnalysisResponse>(response);
        category = analysis.category;
      } catch {
        analysisUnavailable = true;
        category = "Other";
      }
    }

    let savedTransaction: BudgetTransaction | null = null;
    if (mode === "demo") {
      const transaction: BudgetTransaction = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `demo-${Date.now()}`,
        merchant: values.merchant,
        description: values.description,
        amountCents: values.amountCents,
        occurredOn: values.occurredOn,
        category: category ?? "Other",
        confidence: analysis?.confidence ?? 1,
        source: "demo",
      };
      setTransactions((items) => sortTransactions([transaction, ...items]));
      savedTransaction = transaction;
    } else {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, category: category ?? undefined, source: "manual" }),
      });
      const body = await responseJson<{ transaction: BudgetTransaction }>(response);
      setTransactions((items) => sortTransactions([body.transaction, ...items]));
      savedTransaction = body.transaction;
    }

    if (analysis && savedTransaction) {
      const categoryHealth = summary.categoryHealth.find((item) => item.category === savedTransaction.category);
      setLatestCategorization({
        transaction: savedTransaction,
        analysis,
        projectedCategorySpentCents: (categoryHealth?.spentCents ?? 0) + savedTransaction.amountCents,
        categoryLimitCents: categoryHealth?.limitCents ?? 0,
      });
    }
    setNotice(
      analysisUnavailable
        ? "Expense saved in Other. Auto-categorization could not be refreshed, so you can correct the category anytime."
        : analysis?.source === "local"
          ? "Expense saved with a quick local category. Your AI plan was not refreshed."
          : "Expense saved and budget health refreshed.",
    );
  }

  async function deleteExpense(transaction: BudgetTransaction) {
    if (!window.confirm(`Delete ${transaction.merchant}? This cannot be undone.`)) return;
    if (mode === "account") {
      const response = await fetch(`/api/transactions/${transaction.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Could not delete this expense.");
    }
    setTransactions((items) => items.filter((item) => item.id !== transaction.id));
    setNotice("Expense deleted. Your totals have been refreshed.");
  }

  async function importTransactions(rows: CsvDraftRow[]) {
    if (mode === "demo") {
      const existing = new Set(transactions.map((transaction) => `${transaction.merchant.toLowerCase()}:${transaction.amountCents}:${transaction.occurredOn}`));
      const added: BudgetTransaction[] = [];
      let skipped = 0;
      for (const row of rows) {
        const key = `${row.merchant.toLowerCase()}:${row.amountCents}:${row.occurredOn}`;
        if (existing.has(key)) { skipped += 1; continue; }
        existing.add(key);
        added.push({
          id: `demo-import-${Date.now()}-${added.length}`,
          merchant: row.merchant,
          description: row.description,
          amountCents: row.amountCents,
          occurredOn: row.occurredOn,
          category: row.category ?? "Other",
          confidence: row.category ? 1 : 0.58,
          source: "demo",
        });
      }
      setTransactions((items) => sortTransactions([...added, ...items]));
      setNotice(`${added.length} CSV expenses imported${skipped ? `, ${skipped} duplicates skipped` : ""}.`);
      return;
    }

    const response = await fetch("/api/imports/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions: rows, skipDuplicates: true }),
    });
    const body = await responseJson<{ imported: BudgetTransaction[]; skipped: number }>(response);
    setTransactions((items) => sortTransactions([...body.imported, ...items]));
    setNotice(`${body.imported.length} CSV expenses imported${body.skipped ? `, ${body.skipped} duplicates skipped` : ""}.`);
  }

  async function saveBudgets(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "demo") {
      setBudgets(budgetDraft);
      setNotice("Category limits updated in this resettable demo.");
      return;
    }
    const response = await fetch("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, budgets: budgetDraft }),
    });
    const body = await responseJson<{ budgets: CategoryBudget[] }>(response);
    setBudgets(body.budgets);
    setBudgetDraft(body.budgets);
    setNotice("Category limits saved.");
  }

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "demo") {
      setGoal(goalDraft);
      setNotice("Savings goal updated in this resettable demo.");
      return;
    }
    const response = await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(goalDraft),
    });
    const body = await responseJson<{ goal: StudentGoal }>(response);
    setGoal(body.goal);
    setGoalDraft(body.goal);
    setNotice("Savings goal saved.");
  }

  async function refreshCoach() {
    setCoachState("loading");
    setCoachError("");
    const coachContext = {
      month,
      monthlyBudgetCents: summary.totalBudgetCents,
      totalSpentCents: summary.totalSpentCents,
      forecastCents: forecast.forecastCents,
      categoryHealth: summary.categoryHealth.map((item) => ({ category: item.category, spentCents: item.spentCents, limitCents: item.limitCents })),
      goal: goal ? { name: goal.name, targetCents: goal.targetCents, currentCents: goal.currentCents } : null,
    };
    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "demo" ? { demo: true, ...coachContext } : { month }),
      });
      const body = await responseJson<CoachResponse>(response);
      setCoachPlan(body.plan);
      setCoachProvenance({ source: body.source, model: body.model });
      setNotice("Your personalized spending plan is ready.");
    } catch (error) {
      setCoachError(error instanceof Error ? error.message : "Your personalized plan could not be refreshed.");
    } finally {
      setCoachState("idle");
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const nextProfile = {
      ...profile,
      displayName: String(form.get("displayName") ?? "").trim(),
      currency: String(form.get("currency") ?? profile.currency),
      monthlyAllowanceCents: toCents(Number(form.get("monthlyAllowance") ?? 0)),
    };
    if (mode === "account") {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(nextProfile) });
      await responseJson(response);
    }
    setProfile(nextProfile);
    setNotice(mode === "demo" ? "Demo preferences updated until the page is reset." : "Preferences saved.");
  }

  async function deleteData() {
    if (mode === "demo") {
      window.location.assign("/demo");
      return;
    }
    if (!window.confirm("Delete all Pocket Semester transactions, budgets, goals, rules, and coach plans? Your Clerk account will remain.")) return;
    const response = await fetch("/api/profile", { method: "DELETE" });
    await responseJson(response);
    window.location.assign("/");
  }

  const title = viewTitles[activeView];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace-main">Skip to workspace</a>
      {mobileOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside ref={sidebarRef} className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`} role={isMobileLayout && mobileOpen ? "dialog" : undefined} aria-modal={isMobileLayout && mobileOpen ? true : undefined} aria-label="Primary navigation" aria-hidden={isMobileLayout && !mobileOpen ? true : undefined} inert={isMobileLayout && !mobileOpen ? true : undefined}>
        <Link className="brand" href={mode === "demo" ? "/demo" : "/dashboard"}>
          <span className="brand-mark"><Wallet weight="fill" /></span><span>Pocket Semester</span>
        </Link>
        <nav className="nav-list">
          {navigation.map(({ view, label, Icon }) => (
            <Link key={view} className={`nav-item ${activeView === view ? "active" : ""}`} href={routeHref(mode, view, month)} onClick={(event) => handleNavigation(event, view)} aria-current={activeView === view ? "page" : undefined}>
              <Icon weight={activeView === view ? "fill" : "regular"} />{label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-note"><p><strong>{mode === "demo" ? "Fictional data, real interactions." : "Small choices add up."}</strong>{mode === "demo" ? " This workspace resets when you reload." : " Your private budget lives only in your account."}</p></div>
        {mode === "demo" ? (
          <Link className="student-profile" href={routeHref(mode, "settings", month)} onClick={(event) => handleNavigation(event, "settings")}><span className="avatar">{profile.displayName.slice(0, 2).toUpperCase()}</span><span><strong>{profile.displayName}</strong><small>Public demo</small></span></Link>
        ) : (
          <div className="account-footer">
            <Link className="student-profile" href={routeHref(mode, "settings", month)}><span className="avatar">{profile.displayName.slice(0, 2).toUpperCase()}</span><span><strong>{profile.displayName}</strong><small>Student plan</small></span></Link>
            <SignOutButton redirectUrl="/"><button className="sidebar-signout" type="button"><SignOut /> Sign out</button></SignOutButton>
          </div>
        )}
      </aside>

      <main className="dashboard" id="workspace-main" tabIndex={-1}>
        <header className="topbar">
          <button ref={mobileMenuRef} className="mobile-menu" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><List /></button>
          <div><p className="date-label">{title.eyebrow} · {monthLabel(month)}</p><h1>{title.heading}</h1><div className="mobile-month-controls" aria-label="Selected month"><button className="month-button" onClick={() => moveMonth(-1)} aria-label="Previous month"><CaretLeft /></button><span className="month-value"><CalendarBlank /> {monthShortLabel(month)}</span><button className="month-button" onClick={() => moveMonth(1)} aria-label="Next month"><CaretRight /></button></div></div>
          <div className="top-actions"><button className="month-button" onClick={() => moveMonth(-1)} aria-label="Previous month"><CaretLeft /></button><span className="month-value"><CalendarBlank /> {monthShortLabel(month)}</span><button className="month-button" onClick={() => moveMonth(1)} aria-label="Next month"><CaretRight /></button><button className="secondary-button top-import" onClick={() => setShowImport(true)}><UploadSimple /> Import CSV</button><button className="primary-button top-add" onClick={() => openExpense()}><Plus weight="bold" /> Add expense</button></div>
        </header>

        {notice && <p className="sr-status" role="status">{notice}</p>}
        {latestCategorization && <LatestCategorizationCard value={latestCategorization} currency={profile.currency} onDismiss={() => setLatestCategorization(null)} onChangeCategory={() => openExpense(latestCategorization.transaction)} />}
        {activeView === "dashboard" && <><div className="mobile-action-dock" aria-label="Quick actions"><button className="secondary-button" onClick={() => setShowImport(true)}><UploadSimple /> Import CSV</button><button className="primary-button" onClick={() => openExpense()}><Plus weight="bold" /> Add expense</button></div><DashboardView summary={summary} forecast={forecast} fixedSpendCents={fixedSpendCents} forecastDifference={forecastDifference} goal={goalSummary} profile={profile} transactions={transactions} weekSeries={weekSeries} coachPlan={coachPlan} coachProvenance={coachProvenance} coachState={coachState} coachError={coachError} isDemo={mode === "demo"} hasCategorization={Boolean(latestCategorization)} onAddExpense={() => openExpense()} onRefreshCoach={refreshCoach} onOpenTransactions={() => mode === "demo" ? activateDemoView("transactions") : window.location.assign(routeHref(mode, "transactions", month))} onDrilldown={drillIntoCategory} /></>}
        {activeView === "transactions" && <TransactionsView transactions={filteredTransactions} filter={categoryFilter} onFilter={setCategoryFilter} profile={profile} onAdd={() => openExpense()} onImport={() => setShowImport(true)} onEdit={openExpense} onDelete={deleteExpense} />}
        {activeView === "budgets" && <BudgetsView budgetDraft={budgetDraft} summary={summary} profile={profile} onChange={(category, amountCents) => setBudgetDraft((items) => items.map((item) => item.category === category ? { ...item, limitCents: amountCents } : item))} onSubmit={saveBudgets} />}
        {activeView === "goals" && <GoalsView goal={goalDraft} goalSummary={goalSummary} profile={profile} onChange={setGoalDraft} onSubmit={saveGoal} />}
        {activeView === "insights" && <InsightsView summary={summary} forecast={forecast} profile={profile} coachPlan={coachPlan} coachProvenance={coachProvenance} coachState={coachState} coachError={coachError} onRefreshCoach={refreshCoach} />}
        {activeView === "settings" && <SettingsView profile={profile} mode={mode} onSubmit={saveProfile} onDelete={deleteData} />}
      </main>

      {showExpense && <ExpenseModal editing={editingExpense} month={month} onClose={() => { setShowExpense(false); setEditingExpense(null); }} onSubmit={saveExpense} />}
      {showImport && <CsvImportModal onClose={() => setShowImport(false)} onImport={importTransactions} />}
    </div>
  );
}

function DashboardView({ summary, forecast, fixedSpendCents, forecastDifference, goal, profile, transactions, weekSeries, coachPlan, coachProvenance, coachState, coachError, isDemo, hasCategorization, onAddExpense, onRefreshCoach, onOpenTransactions, onDrilldown }: {
  summary: ReturnType<typeof getBudgetSummary>; forecast: ReturnType<typeof getForecast>; fixedSpendCents: number; forecastDifference: number; goal: ReturnType<typeof goalProgress>; profile: StudentProfile; transactions: BudgetTransaction[]; weekSeries: ReturnType<typeof makeWeekSeries>; coachPlan: CoachPlan | null; coachProvenance: CoachProvenance | null; coachState: "idle" | "loading"; coachError: string; isDemo: boolean; hasCategorization: boolean; onAddExpense: () => void; onRefreshCoach: () => void; onOpenTransactions: () => void; onDrilldown: (category: Category) => void;
}) {
  return <>
    <section className="metrics" aria-label="Budget summary">
      <article className="metric primary-metric"><div className="metric-heading"><span>Plan remaining</span><Wallet /></div><strong>{formatMoney(summary.availableCents, profile.currency)}</strong><p><ArrowUpRight weight="bold" /> {summary.percentUsed}% of plan used · {formatMoney(Math.max(profile.monthlyAllowanceCents - summary.totalBudgetCents, 0), profile.currency)} buffer</p><div className="budget-track" aria-label={`${summary.percentUsed}% of budget used`}><span style={{ width: `${Math.min(summary.percentUsed, 100)}%` }} /></div></article>
      <article className="metric"><div className="metric-heading"><span>End-of-month forecast</span><CurrencyDollar /></div><strong>{formatMoney(forecast.forecastCents, profile.currency)}</strong><p className={forecastDifference >= 0 ? "positive" : "negative"}>{forecastDifference >= 0 ? <ArrowDownRight weight="bold" /> : <ArrowUpRight weight="bold" />}{forecastDifference >= 0 ? `${formatMoney(forecastDifference, profile.currency)} below your plan` : `${formatMoney(Math.abs(forecastDifference), profile.currency)} above your plan`}</p></article>
      <article className="metric"><div className="metric-heading"><span>{goal?.name ?? "Savings goal"}</span><Target /></div><strong>{goal ? formatMoney(goal.currentCents, profile.currency) : "Set a goal"}{goal && <small> of {formatMoney(goal.targetCents, profile.currency)}</small>}</strong><p>{goal ? `${goal.percent}% funded with ${formatMoney(goal.remainingCents, profile.currency)} left to save` : "Add a goal to keep your cushion visible."}</p></article>
    </section>
    {isDemo && <DemoChecklist hasCategorization={hasCategorization} hasRefreshedPlan={coachProvenance?.source !== "example"} onAddExpense={onAddExpense} onRefreshPlan={onRefreshCoach} />}
    <ForecastExplainer forecast={forecast} fixedSpendCents={fixedSpendCents} currency={profile.currency} />
    <section className="main-grid">
      <article className="panel spending-panel"><div className="panel-heading"><div><h2>Weekly spending</h2><p>Daily expenses in the selected month.</p></div><span className="trend-tag"><CalendarBlank weight="bold" /> {forecast.daysRemaining} days left</span></div><div className="chart-wrap" aria-label="Weekly spending area chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={weekSeries} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}><defs><linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} /><stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 5" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 12 }} /><Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12 }} formatter={(value) => [`$${value}`, "Spent"]} /><Area type="monotone" dataKey="amount" stroke="var(--accent)" strokeWidth={2.5} fill="url(#spendFill)" /></AreaChart></ResponsiveContainer></div></article>
      <CoachCard coachPlan={coachPlan} provenance={coachProvenance} state={coachState} error={coachError} currency={profile.currency} onRefresh={onRefreshCoach} compact />
    </section>
    <section className="lower-grid">
      <article className="panel transactions-panel"><div className="panel-heading compact"><div><h2>Recent transactions</h2><p>Correct a category anytime to personalize future entries.</p></div><button className="text-button" onClick={onOpenTransactions}>View all <CaretRight /></button></div><div className="transaction-list">{transactions.slice(0, 5).map((transaction) => <TransactionRow transaction={transaction} currency={profile.currency} key={transaction.id} />)}</div></article>
      <article className="panel budgets-panel"><div className="panel-heading compact"><div><h2>Budget health</h2><p>Tap a category to see every related expense.</p></div><ChartDonut /></div><div className="budget-list">{summary.categoryHealth.filter((item) => item.limitCents > 0).slice(0, 5).map((item) => <button className="budget-row budget-row-button" key={item.category} onClick={() => onDrilldown(item.category)}><div><strong>{item.category}</strong><span>{formatMoney(item.spentCents, profile.currency)} of {formatMoney(item.limitCents, profile.currency)}</span></div><div className="category-track"><span style={{ width: `${Math.min(item.percentUsed, 100)}%`, background: categoryColors[item.category] }} /></div></button>)}</div></article>
    </section>
  </>;
}

function DemoChecklist({ hasCategorization, hasRefreshedPlan, onAddExpense, onRefreshPlan }: { hasCategorization: boolean; hasRefreshedPlan: boolean; onAddExpense: () => void; onRefreshPlan: () => void }) {
  return <section className="demo-progress" aria-label="60-second demo path"><div className="demo-progress-heading"><span>60-second demo</span><p>Fictional data · resets on reload</p></div><ol><li className={hasCategorization ? "complete" : ""}><span>{hasCategorization ? <CheckCircle weight="fill" /> : "1"}</span><strong>Add an expense</strong><button className="text-button" onClick={onAddExpense}>Try it <ArrowRight /></button></li><li className={hasCategorization ? "complete" : ""}><span>{hasCategorization ? <CheckCircle weight="fill" /> : "2"}</span><strong>See category and forecast</strong></li><li className={hasRefreshedPlan ? "complete" : ""}><span>{hasRefreshedPlan ? <CheckCircle weight="fill" /> : "3"}</span><strong>Refresh the plan</strong><button className="text-button" onClick={onRefreshPlan}>Refresh <ArrowRight /></button></li></ol></section>;
}

function ForecastExplainer({ forecast, fixedSpendCents, currency }: { forecast: ReturnType<typeof getForecast>; fixedSpendCents: number; currency: string }) {
  return <section className="forecast-explainer" aria-label="How the month-end forecast works"><div><p className="eyebrow">Forecast</p><h2>Where this month is headed.</h2><p>Housing and subscriptions are fixed. Everything else follows the flexible pace you have set so far.</p></div><dl><div><dt>Fixed spending</dt><dd>{formatMoney(fixedSpendCents, currency)}</dd></div><div><dt>Flexible daily pace</dt><dd>{formatMoney(forecast.flexibleDailyPaceCents, currency)}</dd></div><div><dt>Projected month end</dt><dd>{formatMoney(forecast.forecastCents, currency)}</dd></div><div><dt>Days left</dt><dd>{forecast.daysRemaining}</dd></div></dl></section>;
}

function LatestCategorizationCard({ value, currency, onDismiss, onChangeCategory }: { value: LatestCategorization; currency: string; onDismiss: () => void; onChangeCategory: () => void }) {
  const { analysis, transaction, projectedCategorySpentCents, categoryLimitCents } = value;
  const localResult = analysis.source === "local";
  const provenance = analysis.source === "openai" ? `Categorized by ${analysis.model}` : analysis.source === "gemini" ? `Development AI · ${analysis.model}` : "Quick local category";
  const budgetEffect = categoryLimitCents > 0 ? `${formatMoney(projectedCategorySpentCents, currency)} of ${formatMoney(categoryLimitCents, currency)}` : "No category limit set";
  return <section className="categorization-card" aria-label="Latest expense categorization"><div className="categorization-card-heading"><div><span className="ai-label">{provenance}</span><h2>{transaction.merchant} is in {analysis.category}</h2><p>{localResult ? "This is a local rule-based suggestion, not a live AI response." : `${confidenceLabel(analysis.confidence)} · ${analysis.insight}`}</p></div><button className="icon-button quiet" onClick={onDismiss} aria-label="Dismiss latest categorization"><X /></button></div><div className="categorization-details"><div><small>Why</small><strong>{analysis.action}</strong></div><div><small>Category total after this expense</small><strong>{budgetEffect}</strong></div></div><div className="categorization-actions"><button className="secondary-button" onClick={onChangeCategory}><PencilSimple /> Change category</button><button className="text-button" onClick={onDismiss}>Keep it <CheckCircle weight="bold" /></button></div></section>;
}

function TransactionRow({ transaction, currency, actions }: { transaction: BudgetTransaction; currency: string; actions?: ReactNode }) {
  return <div className="transaction"><span className="transaction-icon" style={{ color: categoryColors[transaction.category] }}><Receipt weight="fill" /></span><span className="transaction-copy"><strong>{transaction.merchant}</strong><small>{transaction.category} · {displayDate(transaction.occurredOn)}</small></span><span className="transaction-amount">-{formatMoney(transaction.amountCents, currency)}</span>{actions}</div>;
}

function TransactionsView({ transactions, filter, onFilter, profile, onAdd, onImport, onEdit, onDelete }: { transactions: BudgetTransaction[]; filter: CategoryFilter; onFilter: (value: CategoryFilter) => void; profile: StudentProfile; onAdd: () => void; onImport: () => void; onEdit: (transaction: BudgetTransaction) => void; onDelete: (transaction: BudgetTransaction) => Promise<void> }) {
  return <section className="page-panel"><div className="page-panel-heading"><div><h2>All transactions</h2><p>Review every expense, correct categories, and import a CSV whenever you need to catch up.</p></div><div className="inline-actions"><button className="secondary-button" onClick={onImport}><FileCsv /> Import CSV</button><button className="primary-button" onClick={onAdd}><Plus weight="bold" /> Add expense</button></div></div><div className="filter-row"><label>Category<select value={filter} onChange={(event) => onFilter(event.target.value as CategoryFilter)}><option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><span>{transactions.length} expense{transactions.length === 1 ? "" : "s"}</span></div><div className="transaction-table">{transactions.length ? transactions.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} currency={profile.currency} actions={<span className="transaction-actions"><button className="icon-button quiet" onClick={() => onEdit(transaction)} aria-label={`Edit ${transaction.merchant}`}><PencilSimple /></button><button className="icon-button quiet danger-button" onClick={() => void onDelete(transaction)} aria-label={`Delete ${transaction.merchant}`}><Trash /></button></span>} />) : <EmptyState icon={<Receipt weight="fill" />} title="No expenses here yet." copy="Add an expense or import a CSV to start this month’s picture." />}</div></section>;
}

function BudgetsView({ budgetDraft, summary, profile, onChange, onSubmit }: { budgetDraft: CategoryBudget[]; summary: ReturnType<typeof getBudgetSummary>; profile: StudentProfile; onChange: (category: Category, amountCents: number) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  return <section className="page-panel"><div className="page-panel-heading"><div><h2>Category budgets</h2><p>Set the ceilings that make your plan feel possible, then watch each category update live.</p></div></div><form onSubmit={(event) => void onSubmit(event)} className="budget-editor"><div className="budget-editor-list">{budgetDraft.map((budget) => { const health = summary.categoryHealth.find((item) => item.category === budget.category); return <div className="budget-editor-row" key={budget.category}><div><strong>{budget.category}</strong><span className={health?.status === "over" ? "status-over" : health?.status === "watch" ? "status-watch" : "status-good"}>{health?.status === "over" ? "Over limit" : health?.status === "watch" ? "Almost full" : "On track"}</span></div><div className="budget-editor-input"><label><span>Monthly limit</span><span className="currency-field"><b>$</b><input type="number" min="0" max="100000" step="1" value={Math.round(budget.limitCents / 100)} onChange={(event) => onChange(budget.category, toCents(Number(event.target.value) || 0))} /></span></label><p>{formatMoney(health?.spentCents ?? 0, profile.currency)} spent</p></div></div>; })}</div><div className="editor-footer"><p><Warning weight="fill" /> Limits are monthly. They do not move money or make purchases.</p><button className="primary-button" type="submit"><FloppyDisk weight="bold" /> Save budgets</button></div></form></section>;
}

function GoalsView({ goal, goalSummary, profile, onChange, onSubmit }: { goal: StudentGoal; goalSummary: ReturnType<typeof goalProgress>; profile: StudentProfile; onChange: (goal: StudentGoal) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> }) {
  return <section className="goals-layout"><article className="goal-hero"><div><p className="eyebrow">Savings kept in view</p><h2>{goal.name}</h2><strong>{formatMoney(goal.currentCents, profile.currency)} <small>of {formatMoney(goal.targetCents, profile.currency)}</small></strong><p>{goalSummary ? `${goalSummary.percent}% funded. ${formatMoney(goalSummary.remainingCents, profile.currency)} remains.` : "Set a goal to start tracking progress."}</p></div><div className="goal-ring" style={{ "--progress": `${goalSummary?.percent ?? 0}%` } as React.CSSProperties}><span>{goalSummary?.percent ?? 0}%</span></div></article><section className="page-panel"><div className="page-panel-heading"><div><h2>Update your goal</h2><p>Progress reflects the amount you say is saved. It never relies on bank credentials.</p></div></div><form onSubmit={(event) => void onSubmit(event)} className="settings-form"><div className="form-grid two"><label>Goal name<input value={goal.name} maxLength={80} onChange={(event) => onChange({ ...goal, name: event.target.value })} required /></label><label>Goal type<select value={goal.kind} onChange={(event) => onChange({ ...goal, kind: event.target.value as StudentGoal["kind"] })}><option value="emergency">Emergency fund</option><option value="semester">Semester savings</option></select></label><label>Target amount<input type="number" min="1" step="1" value={Math.round(goal.targetCents / 100)} onChange={(event) => onChange({ ...goal, targetCents: toCents(Number(event.target.value) || 0) })} required /></label><label>Already saved<input type="number" min="0" step="1" value={Math.round(goal.currentCents / 100)} onChange={(event) => onChange({ ...goal, currentCents: toCents(Number(event.target.value) || 0) })} required /></label><label>Target date<input type="date" value={goal.targetDate ?? ""} onChange={(event) => onChange({ ...goal, targetDate: event.target.value || null })} /></label></div><button className="primary-button" type="submit"><FloppyDisk weight="bold" /> Save goal</button></form></section></section>;
}

function InsightsView({ summary, forecast, profile, coachPlan, coachProvenance, coachState, coachError, onRefreshCoach }: { summary: ReturnType<typeof getBudgetSummary>; forecast: ReturnType<typeof getForecast>; profile: StudentProfile; coachPlan: CoachPlan | null; coachProvenance: CoachProvenance | null; coachState: "idle" | "loading"; coachError: string; onRefreshCoach: () => void }) {
  const watchouts = summary.categoryHealth.filter((item) => item.status !== "healthy");
  return <section className="insights-layout"><CoachCard coachPlan={coachPlan} provenance={coachProvenance} state={coachState} error={coachError} currency={profile.currency} onRefresh={onRefreshCoach} /><div className="insight-grid"><article className="panel"><div className="panel-heading"><div><h2>Forecast math</h2><p>Already-paid rent and subscriptions stay fixed. Flexible spending sets the pace.</p></div><ChartDonut /></div><div className="forecast-lines"><span><small>Spent so far</small><strong>{formatMoney(summary.totalSpentCents, profile.currency)}</strong></span><span><small>Flexible daily pace</small><strong>{formatMoney(forecast.flexibleDailyPaceCents, profile.currency)}</strong></span><span><small>Projected month end</small><strong>{formatMoney(forecast.forecastCents, profile.currency)}</strong></span></div></article><article className="panel"><div className="panel-heading"><div><h2>Category watchouts</h2><p>These limits need attention before your next flexible purchase.</p></div><Warning weight="fill" /></div>{watchouts.length ? <div className="watchout-list">{watchouts.map((item) => <div key={item.category}><span style={{ background: categoryColors[item.category] }} /><p><strong>{item.category}</strong><small>{item.status === "over" ? `${formatMoney(Math.abs(item.remainingCents), profile.currency)} over limit` : `${formatMoney(item.remainingCents, profile.currency)} left`}</small></p></div>)}</div> : <EmptyState icon={<CheckCircle weight="fill" />} title="Every category is on track." copy="Keep checking your daily pace as new expenses arrive." compact />}</article></div></section>;
}

function SettingsView({ profile, mode, onSubmit, onDelete }: { profile: StudentProfile; mode: WorkspaceMode; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>; onDelete: () => Promise<void> }) {
  return <section className="settings-layout"><section className="page-panel"><div className="page-panel-heading"><div><h2>Preferences</h2><p>Update the name, currency, and allowance behind your spending plan.</p></div></div><form onSubmit={(event) => void onSubmit(event)} className="settings-form"><div className="form-grid two"><label>Name<input name="displayName" defaultValue={profile.displayName} maxLength={80} required /></label><label>Currency<select name="currency" defaultValue={profile.currency}><option value="USD">USD</option><option value="CAD">CAD</option><option value="GBP">GBP</option><option value="EUR">EUR</option></select></label><label>Monthly income or allowance<input name="monthlyAllowance" type="number" min="0" step="1" defaultValue={Math.round(profile.monthlyAllowanceCents / 100)} required /></label></div><button className="primary-button" type="submit"><FloppyDisk weight="bold" /> Save preferences</button></form></section><section className="privacy-panel"><span><ShieldCheck weight="fill" /></span><div><h2>Private by design</h2><p>{mode === "demo" ? "This browser-only demo uses fictional data and resets on reload." : "Your workspace is scoped to your signed-in account. Pocket Semester does not use bank credentials."}</p><p>Recommendations are educational budgeting guidance, not financial, tax, credit, or investment advice.</p></div></section><section className="danger-panel"><div><h2>Delete my Pocket Semester data</h2><p>{mode === "demo" ? "Reset the sample workspace to its original fictional data." : "This removes your transactions, budgets, goals, merchant rules, and saved coach plans. Your sign-in account stays active."}</p></div><button className="danger-outline-button" onClick={() => void onDelete()}>{mode === "demo" ? "Reset demo" : "Delete my data"}</button></section></section>;
}

function CoachCard({ coachPlan, provenance, state, error, currency, onRefresh, compact = false }: { coachPlan: CoachPlan | null; provenance: CoachProvenance | null; state: "idle" | "loading"; error: string; currency: string; onRefresh: () => void; compact?: boolean }) {
  const isExample = provenance?.source === "example";
  const label = provenance?.source === "openai" ? `Powered by ${provenance.model}` : provenance?.source === "gemini" ? `Development AI · ${provenance.model}` : isExample ? "Example plan · fictional data" : "Guided coach";
  return <article className={`coach-card ${compact ? "coach-card-compact" : ""}`}><div className="coach-card-top"><span className="insight-icon"><ChartDonut weight="fill" /></span><div><span className="ai-label">{label}</span><h2>{coachPlan ? coachPlan.summary : "Ready when you want a focused plan."}</h2></div></div>{isExample && <p className="coach-example-note">This sample plan is preloaded for the fictional demo. Refresh after a change to request a fresh provider result.</p>}{coachPlan ? <><div className="coach-actions">{coachPlan.actions.map((action) => <div key={action.title}><strong>{action.title}</strong><p>{action.detail}</p><small>Estimated room: {formatMoney(action.estimatedImpactCents, currency)}</small></div>)}</div><div className="coach-total">Estimated impact: {formatMoney(coachPlan.estimatedImpactCents, currency)}</div></> : <p className="coach-empty">Refresh your plan to get two or three practical actions based on this month’s spending, category limits, and goal.</p>} {error && <p className="form-error" role="alert">{error}</p>}<button className="coach-refresh" onClick={onRefresh} disabled={state === "loading"}>{state === "loading" ? "Building your plan" : isExample ? "Refresh after your change" : coachPlan ? "Refresh plan" : "Build my spending plan"}<ArrowRight weight="bold" /></button></article>;
}

function EmptyState({ icon, title, copy, compact = false }: { icon: ReactNode; title: string; copy: string; compact?: boolean }) {
  return <div className={`empty-state ${compact ? "empty-state-compact" : ""}`}><span>{icon}</span><strong>{title}</strong><p>{copy}</p></div>;
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, []);
  function trapFocus(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]"));
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="workspace-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} onKeyDown={trapFocus} onMouseDown={(event) => event.stopPropagation()}>{children}</section></div>;
}

function ExpenseModal({ editing, month, onClose, onSubmit }: { editing: BudgetTransaction | null; month: string; onClose: () => void; onSubmit: (values: ExpenseFormValues) => Promise<void> }) {
  const [merchant, setMerchant] = useState(editing?.merchant ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [amount, setAmount] = useState(editing ? String(editing.amountCents / 100) : "");
  const [occurredOn, setOccurredOn] = useState(editing?.occurredOn ?? defaultDateForMonth(month));
  const [category, setCategory] = useState<Category | "auto">(editing?.category ?? "auto");
  const [state, setState] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setState("saving"); setError("");
    try {
      const amountCents = toCents(Number(amount));
      if (!Number.isFinite(amountCents) || amountCents <= 0) throw new Error("Enter a positive expense amount.");
      await onSubmit({ merchant: merchant.trim(), description: description.trim(), amountCents, occurredOn, category: category === "auto" ? null : category });
      onClose();
    } catch (submissionError) { setError(submissionError instanceof Error ? submissionError.message : "Could not save this expense."); }
    finally { setState("idle"); }
  }
  return <Modal title={editing ? "Edit expense" : "Add an expense"} onClose={onClose}><div className="modal-heading"><div><h2>{editing ? "Edit expense" : "Add an expense"}</h2><p>{editing ? "Correct the details or category. Your preference will help future entries." : "Leave category on auto to get an AI-assisted suggestion."}</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div><form onSubmit={submit} className="modal-form"><label>Merchant<input value={merchant} onChange={(event) => setMerchant(event.target.value)} required maxLength={80} placeholder="Campus Market" /></label><label>Description<input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={180} placeholder="Groceries and snacks" /></label><div className="form-grid two"><label>Amount<span className="currency-field"><b>$</b><input value={amount} onChange={(event) => setAmount(event.target.value)} type="number" min="0.01" max="100000" step="0.01" required placeholder="0.00" /></span></label><label>Date<input value={occurredOn} onChange={(event) => setOccurredOn(event.target.value)} type="date" required /></label></div><label>Category<select value={category} onChange={(event) => setCategory(event.target.value as Category | "auto")}>{!editing && <option value="auto">Auto categorize</option>}{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button wide" disabled={state === "saving"}>{state === "saving" ? "Saving expense" : <><Sparkle weight="fill" /> {editing ? "Save changes" : "Categorize and add"}</>}</button></form></Modal>;
}

function guessHeader(headers: string[], terms: string[]) {
  return headers.find((header) => terms.some((term) => header.toLowerCase().includes(term))) ?? "";
}

function CsvImportModal({ onClose, onImport }: { onClose: () => void; onImport: (rows: CsvDraftRow[]) => Promise<void> }) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState({ merchant: "", description: "", amount: "", date: "", category: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const parsedRows = useMemo(() => parseMappedCsvRows(rows, mapping), [mapping, rows]);
  function selectFile(file: File | undefined) {
    if (!file) return; setError("");
    if (file.size > 2_000_000) { setError("Choose a CSV smaller than 2 MB."); return; }
    Papa.parse<Record<string, string>>(file, { header: true, skipEmptyLines: "greedy", complete: (result) => {
      const nextRows = result.data.filter((row) => Object.values(row).some((value) => String(value).trim()));
      const nextHeaders = result.meta.fields ?? [];
      if (!nextHeaders.length) { setError("We could not find CSV column headers."); return; }
      setHeaders(nextHeaders); setRows(nextRows.slice(0, 500));
      setMapping({ merchant: guessHeader(nextHeaders, ["merchant", "vendor", "payee", "name"]), description: guessHeader(nextHeaders, ["description", "memo", "note"]), amount: guessHeader(nextHeaders, ["amount", "spent", "debit"]), date: guessHeader(nextHeaders, ["date", "posted", "transaction"]), category: guessHeader(nextHeaders, ["category", "type"]) });
      if (result.errors.length) setError("Some CSV rows may need attention before import.");
    }, error: () => setError("We could not read that file. Please try another CSV.") });
  }
  async function submit() {
    if (!parsedRows.valid.length) { setError("Map merchant, amount, and date columns before importing."); return; }
    setSaving(true); setError("");
    try { await onImport(parsedRows.valid); onClose(); } catch (importError) { setError(importError instanceof Error ? importError.message : "Could not import CSV rows."); } finally { setSaving(false); }
  }
  return <Modal title="Import transactions from CSV" onClose={onClose}><div className="modal-heading"><div><h2>Import transactions</h2><p>Preview and map the file before it becomes part of your budget.</p></div><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div><div className="csv-import"><label className="file-picker"><UploadSimple /><span><strong>Choose CSV file</strong><small>Up to 500 rows and 2 MB</small></span><input type="file" accept=".csv,text/csv" onChange={(event) => selectFile(event.target.files?.[0])} /></label>{headers.length > 0 && <><div className="csv-map"><CsvMapping label="Merchant" value={mapping.merchant} headers={headers} onChange={(value) => setMapping((current) => ({ ...current, merchant: value }))} required /><CsvMapping label="Description" value={mapping.description} headers={headers} onChange={(value) => setMapping((current) => ({ ...current, description: value }))} /><CsvMapping label="Amount" value={mapping.amount} headers={headers} onChange={(value) => setMapping((current) => ({ ...current, amount: value }))} required /><CsvMapping label="Date" value={mapping.date} headers={headers} onChange={(value) => setMapping((current) => ({ ...current, date: value }))} required /><CsvMapping label="Category" value={mapping.category} headers={headers} onChange={(value) => setMapping((current) => ({ ...current, category: value }))} /></div><div className="csv-preview"><div><strong>Preview</strong><span>{parsedRows.valid.length} ready · {parsedRows.invalid} skipped</span></div>{parsedRows.valid.slice(0, 4).map((row, index) => <p key={`${row.merchant}-${index}`}><span>{row.merchant}</span><span>{displayDate(row.occurredOn)}</span><strong>{formatMoney(row.amountCents)}</strong></p>)}</div></>}{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button wide" disabled={saving || !parsedRows.valid.length} onClick={() => void submit()}>{saving ? "Importing expenses" : <><FileCsv weight="fill" /> Import {parsedRows.valid.length || ""} expenses</>}</button></div></Modal>;
}

function CsvMapping({ label, value, headers, onChange, required = false }: { label: string; value: string; headers: string[]; onChange: (value: string) => void; required?: boolean }) {
  return <label>{label}{required && <small>Required</small>}<select value={value} onChange={(event) => onChange(event.target.value)}><option value="">Not mapped</option>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</select></label>;
}
