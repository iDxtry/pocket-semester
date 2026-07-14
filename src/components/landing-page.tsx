import Link from "next/link";
import { ArrowRight, Brain, CheckCircle, LockKey, Sparkle, Target, UploadSimple } from "@phosphor-icons/react/dist/ssr";
import { BudgetSnapshot } from "@/components/budget-snapshot";
import { createDemoWorkspace } from "@/lib/budget";

const demoData = createDemoWorkspace();

export function LandingPage() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <Link className="brand" href="/">
          <span className="brand-mark"><Sparkle weight="fill" /></span>
          <span>Pocket Semester</span>
        </Link>
        <nav aria-label="Landing navigation">
          <Link className="nav-link" href="/demo">Try demo</Link>
          <Link className="nav-link nav-link-strong" href="/sign-in">Sign in</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow"><Sparkle weight="fill" /> A calmer way to spend the semester</p>
          <h1>Know what today costs your future self.</h1>
          <p className="hero-lede">Pocket Semester turns everyday student spending into clear budget health, a realistic month-end forecast, and one practical next step.</p>
          <div className="hero-actions">
            <Link href="/demo" className="primary-button"><Sparkle weight="fill" /> Try the 60-second demo <ArrowRight weight="bold" /></Link>
            <Link href="/sign-up" className="secondary-button">Start a private budget</Link>
          </div>
          <div className="hero-trust"><LockKey weight="fill" /> No sign-up · fictional data · no bank credentials · educational guidance only.</div>
        </div>
        <div className="hero-workspace">
          <div className="preview-caption"><span>Interactive sample workspace</span><Link href="/demo">Open it <ArrowRight weight="bold" /></Link></div>
          <BudgetSnapshot data={demoData} />
          <div className="preview-insight">
            <span className="preview-insight-icon"><Brain weight="fill" /></span>
            <div><small>Budget coach</small><strong>Food spending is flexible this week. A simple campus-meal plan can protect your emergency goal.</strong></div>
          </div>
        </div>
      </section>

      <section className="landing-proof" aria-label="Pocket Semester features">
        <article><span><UploadSimple weight="fill" /></span><h2>Bring your real spending</h2><p>Add an expense in seconds or preview a CSV import before anything is saved.</p></article>
        <article><span><Target weight="fill" /></span><h2>Plan for the semester</h2><p>Set category limits and an emergency goal that stay visible while you spend.</p></article>
        <article><span><Brain weight="fill" /></span><h2>Get a concrete next move</h2><p>Refresh a focused spending plan that calls out tradeoffs without guilt.</p></article>
      </section>

      <section className="landing-flow">
        <div><p className="eyebrow">Built for the way students budget</p><h2>From purchase to perspective in one short loop.</h2></div>
        <ol>
          <li><span>01</span><div><strong>Capture</strong><p>Log an expense, edit a category, or upload a CSV.</p></div></li>
          <li><span>02</span><div><strong>See the tradeoff</strong><p>Watch category health and your end-of-month forecast update.</p></div></li>
          <li><span>03</span><div><strong>Choose one action</strong><p>Use the coach plan to protect room for what matters this semester.</p></div></li>
        </ol>
      </section>

      <section className="landing-privacy">
        <div className="privacy-icon"><CheckCircle weight="fill" /></div>
        <div><h2>Designed to keep personal money personal.</h2><p>Each signed-in account has private data ownership, a delete-my-data control, and no bank-linking requirement. Pocket Semester is not financial, tax, or investment advice.</p></div>
        <Link href="/demo" className="text-button">See the sample data <ArrowRight weight="bold" /></Link>
      </section>

      <footer className="landing-footer"><span>© 2026 Pocket Semester</span><span>Built for OpenAI Build Week</span></footer>
    </main>
  );
}
