"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export function PasswordAuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const isSignUp = mode === "sign-up";
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error ?? "Could not complete authentication.");
      window.location.assign(isSignUp ? "/onboarding" : "/dashboard");
    } catch (authError) {
      setStatus("error");
      setError(authError instanceof Error ? authError.message : "Could not complete authentication.");
    }
  }

  return (
    <form className="local-auth-form" onSubmit={submit}>
      {isSignUp && <label>Name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required maxLength={80} placeholder="Your first name" /></label>}
      <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required maxLength={160} placeholder="you@example.com" /></label>
      <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={isSignUp ? "new-password" : "current-password"} required minLength={8} maxLength={128} placeholder="At least 8 characters" /></label>
      {status === "error" && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button auth-submit" type="submit" disabled={status === "saving"}>{status === "saving" ? "Checking your account" : isSignUp ? "Create my account" : "Sign in"}</button>
      <p className="local-auth-switch">{isSignUp ? "Already have an account?" : "New to Pocket Semester?"} <Link href={isSignUp ? "/sign-in" : "/sign-up"}>{isSignUp ? "Sign in" : "Create one"}</Link></p>
    </form>
  );
}
