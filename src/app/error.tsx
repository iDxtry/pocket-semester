"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="setup-page"><section className="setup-card"><p className="eyebrow">Pocket Semester</p><h1>That budget view did not load.</h1><p>Nothing was changed. Please try loading the workspace again.</p><button className="primary-button" onClick={reset}>Try again</button></section></main>;
}
