# Pocket Semester

Pocket Semester is a student-first budget coach. Students set a semester plan, add or import expenses, see the health of each category, and receive a practical spending plan for the current month.

It is being built for OpenAI Build Week in the **Apps for Your Life** category.

## Current status

The public, resettable demo is ready at `/demo`. It has fictional data, does not expose another person's records, and starts with a clearly labeled example coach plan so a judge can see the intended outcome immediately. The full local budgeting loop supports:

- Add, edit, delete, and correct expenses.
- Import a mapped CSV with preview and validation.
- Switch months and inspect category-level spending.
- Set category budgets and savings goals.
- View a transparent end-of-month forecast that keeps fixed costs fixed.
- Request a structured AI spending plan, with clear unavailable feedback when a plan cannot be refreshed.

### Judge path

1. Open [`/demo`](/demo) — no sign-up is required and the workspace is fictional.
2. Choose **Add expense**, leave category on **Auto categorize**, then save it.
3. Review the visible category, confidence/rationale, forecast effect, and choose **Refresh after your change** for the coach plan.

The sample import file is available at [`public/samples/pocket-semester-demo.csv`](public/samples/pocket-semester-demo.csv).

The account layer, database-backed sessions, Drizzle schema, Neon-compatible database access, migrations, and authenticated APIs are included in this repository. It becomes live once a Neon database URL is set; no auth vendor or custom domain is required.

## Why this project

Students often know that they should budget but do not know what to do next. Pocket Semester turns a category total into a small, concrete action: for example, protect a remaining food budget by planning two lower-cost meals, or pause a flexible purchase while an emergency cushion is behind target.

It deliberately excludes bank linking and receipt scanning from the MVP. Manual entry and CSV import make the story judgeable without collecting bank credentials or adding financial-data integration risk.

## Product tour

| Route | Purpose |
| --- | --- |
| `/` | Judge-friendly landing page with demo and sign-in entry points. |
| `/demo` | Public fictional workspace. Browser-only state resets on reload. |
| `/dashboard` | Signed-in budget overview and monthly forecast. |
| `/transactions` | Persistent transaction management and CSV import. |
| `/budgets` | Category limits and spending health. |
| `/goals` | Emergency or semester savings goals. |
| `/insights` | Structured coach plans and category watchouts. |
| `/settings` | Profile settings and delete-my-data control. |

The interface includes a mobile navigation drawer, keyboard-safe dialogs, loading and error states, visible focus styles, a consistent light-mode palette, and clear feedback around AI availability.

## Tech stack

- Next.js 16 App Router, React 19, TypeScript, and CSS.
- App-owned email/password accounts with scrypt password hashes and signed, httpOnly database sessions.
- Neon Postgres with Drizzle ORM for private, persistent data.
- Zod for API input and AI structured-output validation.
- OpenAI Responses API structured-output adapter for final GPT-5.6 production use; Gemini remains development-only until OpenAI credits are available.
- Papa Parse for CSV import preview and mapping.
- Recharts for spending visualization.

Money is stored as integer cents. Every authenticated API derives ownership from the server session rather than accepting a client-supplied user ID.

## Data model

- `auth_users`: normalized email, scrypt password hash, and display name.
- `auth_sessions`: hashed session tokens with expiry timestamps.
- `profiles`: local user ID, display name, currency, semester dates, allowance, onboarding state.
- `transactions`: merchant, description, amount cents, date, category, confidence, and source.
- `budgets`: one category limit per user and month.
- `goals`: emergency or semester target, current amount, and target date.
- `merchant_rules`: a user's corrected merchant-to-category preferences.
- `coach_runs`: generated structured plans, model metadata, and month.

The initial migration is tracked in [`drizzle/0000_uneven_maggott.sql`](drizzle/0000_uneven_maggott.sql), with the local-auth additions in [`drizzle/0001_local_auth.sql`](drizzle/0001_local_auth.sql).

## Local development

Requirements: Node.js 20.9+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), or jump directly to [http://localhost:3000/demo](http://localhost:3000/demo).

Never commit `.env.local` or any credential.

### Development AI adapter

During development, the app can use Gemini through this server-only environment configuration:

```bash
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.1-flash-lite
```

If that provider is unavailable, expense categorization uses a clearly labeled local rule-based result so the transaction still saves. Coach plans do **not** pretend to be AI-generated when a live provider is unavailable; the UI tells the student that the personalized plan could not be refreshed.

### Final GPT-5.6 production adapter

The OpenAI adapter is implemented but intentionally inactive while development uses Gemini. When OpenAI credits arrive, set these **server-only** Vercel environment variables:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6
```

The adapter calls the OpenAI Responses API with strict JSON Schema output, then Zod-validates every expense analysis and coach plan. API responses include truthful `source` and `model` metadata. The UI displays a GPT-5.6 provenance label only after a real OpenAI response; local categorization is explicitly identified as a rule-based fallback.

### Neon and local auth setup

1. Create a free Neon Postgres database and add its connection string to local and Vercel environments:

   ```bash
   DATABASE_URL=...
   ```

2. Apply the tracked schema:

   ```bash
   npm run db:push
   ```

3. Open `/sign-up`, create an account, and finish onboarding. Passwords are hashed with Node's built-in scrypt implementation; raw passwords are never stored.

Until these variables exist, account pages intentionally show a setup notice instead of simulating private cloud storage.

## API surface

| Endpoint | Capability |
| --- | --- |
| `POST /api/analyze` | Categorize one expense with a validated result. Public demo calls are rate-limited. |
| `POST /api/auth/sign-up` | Create a local account and start an httpOnly session. |
| `POST /api/auth/sign-in` | Verify credentials and start an httpOnly session. |
| `POST /api/auth/sign-out` | Revoke the current session and clear the cookie. |
| `GET, POST /api/transactions` | List and create owned transactions. |
| `PATCH, DELETE /api/transactions/:id` | Edit or delete an owned transaction. |
| `POST /api/imports/transactions` | Validate and create mapped CSV rows. |
| `GET, PUT /api/budgets` | Read or replace category budgets for a month. |
| `GET, PUT /api/goals` | Read or update owned savings goals. |
| `POST /api/onboarding` | Create/update the signed-in student's profile and initial plan. |
| `PATCH, DELETE /api/profile` | Update a profile or delete its stored app data. |
| `POST /api/coach` | Generate and persist an owned monthly coach plan with a per-user cooldown. |

## Verification

```bash
npm test
npm run lint
npm run build
```

The test suite covers cents math, budget aggregation, fixed-cost forecasting, CSV mapping and validation, structured AI response parsing, provider selection, Responses API output extraction, and source/model provenance. Before a production submission, also test a real account journey: sign up, onboard, import a CSV, correct a category, refresh a plan, reload, delete data, and confirm that only that user's data remains visible.

## Build Week: final production switch

Gemini is development-only. Before submitting to OpenAI Build Week:

1. Keep the free Vercel domain and configure only the private Neon database in Vercel.
2. Set `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and `OPENAI_MODEL=gpt-5.6`.
3. Verify one live expense categorization and one coach plan on Vercel. Both must report `source: "openai"` and the GPT-5.6 model.
4. Confirm the deployed UI contains no Gemini claims, record the live result in the demo video, and only then describe GPT-5.6 as active on Devpost.

The provider boundary preserves Zod validation, server-only credentials, rate limits, and the no-fake-fallback behavior during this switch.

## Codex contribution

Codex accelerated the product scoping, app architecture, data model, responsive interface, CSV flow, AI output schemas, automated tests, and browser verification of the add-expense-to-transactions journey. The submission video should show this workflow alongside the final GPT-5.6 experience.

## Submission checklist

- [ ] Deploy the production app to Vercel with Neon, local auth, and final GPT-5.6 configuration.
- [ ] Keep this GitHub repository public, or grant access to the required Build Week reviewer addresses if private.
- [ ] Update the existing Devpost draft as **Pocket Semester**, including the live URL, public repository, country, submitter type, category, and required `/feedback` session ID.
- [ ] Upload a public YouTube video under three minutes with voiceover: student problem, onboarding, manual or CSV expense, live category update, coach action, budget outcome, Codex, and GPT-5.6.

## Privacy and safety

Pocket Semester does not ask for bank credentials and does not link bank accounts. Data in the public demo is fictional. Private app data is scoped to the signed-in account, and settings include a delete-my-data control. Its suggestions are educational budgeting guidance only, not financial, investment, tax, credit, or legal advice.

## License

[MIT](LICENSE)
