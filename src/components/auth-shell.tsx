import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Wallet } from "@phosphor-icons/react/dist/ssr";

export function AuthShell({ children, title, copy }: { children: ReactNode; title: string; copy: string }) {
  return (
    <main className="auth-page">
      <section className="auth-shell" aria-labelledby="auth-heading">
        <Link className="brand auth-brand" href="/">
          <span className="brand-mark"><Wallet weight="fill" /></span>
          <span>Pocket Semester</span>
        </Link>
        <div className="auth-copy">
          <p className="auth-kicker">Private student budget</p>
          <h1 id="auth-heading">{title}</h1>
          <p>{copy}</p>
        </div>
        <div className="auth-card">{children}</div>
        <p className="auth-note">No bank credentials. Your spending plan stays private.</p>
        <Link className="auth-demo-link" href="/demo">Try the fictional demo <ArrowRight weight="bold" /></Link>
      </section>
    </main>
  );
}
