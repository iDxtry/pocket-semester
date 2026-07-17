# Pocket Semester

Pocket Semester is a student budget coach built for OpenAI Build Week's **Apps for Your Life** track. Its core question is simple: **will my money last through finals?**

Live demo: [pocket-semester.vercel.app/demo](https://pocket-semester.vercel.app/demo) — no sign-in, fictional data, and resettable browser state.

## What it does

- Add, edit, delete, correct, or CSV-import expenses.
- Show category health and a fixed-cost-aware month-end forecast.
- Learn a signed-in student's corrected merchant categories.
- Test a planned purchase against a deterministic semester runway, then apply concrete tradeoffs to see the covered-through date and finals buffer change.
- Generate clearly labeled AI expense categorization and monthly coaching when Gemini is configured.

The demo uses a fictional student and does not connect to a bank account or request bank credentials. Budgeting guidance is educational only.

## Judge path

1. Open [the public demo](https://pocket-semester.vercel.app/demo).
2. Choose **Add expense**, leave the category on auto, and save it.
3. Review its category, confidence band, category consequence, and live finals-buffer effect.
4. Toggle a runway tradeoff to see the calculated buffer change.
5. Refresh the coach plan while viewing the current month. The result is labeled with its actual provider.

The sample import file is [public/samples/pocket-semester-demo.csv](public/samples/pocket-semester-demo.csv).

## Architecture

- Next.js 16, React 19, TypeScript, and CSS.
- Neon Postgres and Drizzle for private accounts, with app-owned scrypt password hashing and opaque httpOnly sessions.
- Zod for API and structured-output validation.
- Gemini runtime adapter for categorization and coaching; the UI always identifies Gemini, OpenAI, saved merchant rules, or local fallback truthfully.
- Deterministic integer-cents math for forecasts, category totals, and semester runway calculations. AI explains the result; it does not invent financial calculations.

Private API ownership always comes from the server session, not a client-supplied user ID.

## Local setup

Requirements: Node.js 20.9+ and npm.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000/demo](http://localhost:3000/demo). For private accounts, set `DATABASE_URL` and run:

```bash
npm run db:push
```

Runtime Gemini configuration is server-only:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
```

Without a provider key, an expense can still be saved with a clearly labeled local category; coach refreshes report that they are unavailable.

An optional OpenAI Responses adapter is included for users with separate API billing. It is not active in the public demo and must never be described as active without a verified live response.

## Verification

```bash
npm test
npm run lint
npm run build
```

Tests cover cents math, forecasts, month states, seasonal demo fixtures, CSV validation, AI schemas, provider provenance, local authentication, and the runway before/after calculation.

## GPT-5.6 and Codex contribution

Build Week provides Codex credits, not OpenAI API credits. Pocket Semester therefore uses **GPT-5.6 through Codex for the substantive build work** and Gemini for the deployed runtime AI. This is intentional and disclosed in the product, README, and demo video.

Codex with GPT-5.6 accelerated the product framing, semester-runway engine, provider boundary, structured schemas, mobile/accessibility improvements, test coverage, visual audits, and final submission materials. The human builder selected the student problem, the money assumptions, privacy boundaries, and the final design direction. See [docs/build-week.md](docs/build-week.md) for the dated build record.

Use the Judge path above to reproduce the public demo. The repository keeps product documentation and the build record rather than a word-for-word submission script or paste-ready application copy.

## Privacy

The public demo is browser-only fictional data. Signed-in accounts store budget records in the configured Neon database. When a student actively requests AI help, Pocket Semester sends only the merchant/description/amount or aggregate budget context needed for that request to the configured provider. See the live [privacy page](https://pocket-semester.vercel.app/privacy).

## License

[MIT](LICENSE)
