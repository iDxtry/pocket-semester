import Link from "next/link";
import { ArrowRight, LockKey, Wallet } from "@phosphor-icons/react/dist/ssr";

export function AccountSetupNotice({ title = "Your private workspace is almost ready." }: { title?: string }) {
  return (
    <main className="setup-page">
      <Link className="brand" href="/">
        <span className="brand-mark"><Wallet weight="fill" /></span>
        <span>Pocket Semester</span>
      </Link>
      <section className="setup-card">
        <span className="setup-icon"><LockKey weight="fill" /></span>
        <p className="eyebrow">Private student workspace</p>
        <h1>{title}</h1>
        <p>Sign-in and cloud storage are being connected. Until then, the full fictional workspace is ready to explore without sharing any personal financial data.</p>
        <Link href="/demo" className="primary-button">Try the fictional demo <ArrowRight weight="bold" /></Link>
        <p className="setup-footnote">Pocket Semester never asks for bank credentials. Budget guidance is educational only.</p>
      </section>
    </main>
  );
}
