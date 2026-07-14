import Link from "next/link";
import { ArrowRight, LockKey, Target, UploadSimple, Wallet } from "@phosphor-icons/react/dist/ssr";
import { BudgetSnapshot } from "@/components/budget-snapshot";
import { createDemoWorkspace } from "@/lib/budget";

const demoData = createDemoWorkspace();

export function LandingPage() {
  return (
    <main className="landing">
      <header className="landing-nav">
        <Link className="brand" href="/">
          <span className="brand-mark"><Wallet weight="fill" /></span>
          <span>Pocket Semester</span>
        </Link>
        <nav aria-label="Landing navigation">
          <Link className="nav-link" href="/demo">Try demo</Link>
          <Link className="nav-link nav-link-strong" href="/sign-in">Sign in</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">Student spending, in order</p>
          <h1>A budget that keeps the semester in view.</h1>
          <p className="hero-lede">Pocket Semester helps students record everyday spending, understand the month ahead, and make one useful next move without turning budgeting into a chore.</p>
          <div className="hero-actions">
            <Link href="/demo" className="primary-button">Try the 60-second demo <ArrowRight weight="bold" /></Link>
            <Link href="/sign-up" className="secondary-button">Create a private budget</Link>
          </div>
          <div className="hero-trust"><LockKey weight="fill" /> No sign-up · fictional data · no bank credentials</div>
        </div>
        <div className="hero-workspace">
          <div className="preview-caption"><span>Example student plan</span><Link href="/demo">Open demo <ArrowRight weight="bold" /></Link></div>
          <BudgetSnapshot data={demoData} />
          <div className="preview-footnote"><span>Summer session</span><strong>$145 remains unassigned as a buffer.</strong></div>
        </div>
      </section>

      <section className="landing-ledger" aria-labelledby="ledger-heading">
        <div className="landing-ledger-intro"><p className="eyebrow">A short loop</p><h2 id="ledger-heading">Capture the spending. See the month. Choose the next move.</h2></div>
        <ol>
          <li><span>01</span><div><strong>Capture</strong><p>Add an expense in seconds or bring in a CSV when you need to catch up.</p></div><UploadSimple weight="bold" /></li>
          <li><span>02</span><div><strong>Forecast</strong><p>Watch category limits, fixed costs, and flexible pace turn into a clear month-end view.</p></div><Wallet weight="bold" /></li>
          <li><span>03</span><div><strong>Act</strong><p>Use the coach as a focused prompt for one practical adjustment, not a lecture.</p></div><Target weight="bold" /></li>
        </ol>
      </section>

      <section className="landing-note">
        <LockKey weight="fill" />
        <div><h2>Personal money stays personal.</h2><p>Signed-in workspaces are private, data can be deleted, and Pocket Semester never asks for bank credentials. Budget guidance is educational only.</p></div>
        <Link href="/demo" className="text-button">See the sample data <ArrowRight weight="bold" /></Link>
      </section>

      <footer className="landing-footer"><span>© 2026 Pocket Semester</span><span>Built for OpenAI Build Week</span></footer>
    </main>
  );
}
