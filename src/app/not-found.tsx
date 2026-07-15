import Link from "next/link";

export default function NotFound() {
  return <main className="legal-page"><article><p className="eyebrow">404</p><h1>This page is not in the budget.</h1><p>The link may be outdated, or the page may have moved. The public demo is still available without an account.</p><div className="hero-actions"><Link className="primary-button" href="/demo">Open the demo</Link><Link className="secondary-button" href="/">Go home</Link></div></article></main>;
}
