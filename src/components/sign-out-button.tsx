"use client";

import { ReactNode, useState } from "react";

export function SignOutButton({ children }: { children: ReactNode }) {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await fetch("/api/auth/sign-out", { method: "POST" });
    window.location.assign("/");
  }

  return <button className="sidebar-signout" type="button" onClick={signOut} disabled={busy}>{busy ? "Signing out…" : children}</button>;
}
