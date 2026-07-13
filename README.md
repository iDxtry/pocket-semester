# Pocket Semester

Pocket Semester is a smart personal budget tracker designed for university students. It turns everyday transactions into clear category totals and gives one specific, non-judgmental action a student can take next.

This repository is an early MVP for the OpenAI Build Week **Apps for Your Life** category.

## What works

- A responsive monthly budget dashboard with realistic sample data
- Add-expense workflow with server-side validation
- Automatic expense categorization with confidence scoring
- Personalized insight and recommended next action
- Live budget, category, and transaction updates
- Gemini 3.1 Flash Lite integration when `GEMINI_API_KEY` is configured
- Deterministic local fallback so the demo remains testable without credentials
- Light and dark color schemes based on the operating-system preference

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

To enable live Gemini analysis, place a Gemini API key in `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
```

Environment files are ignored by Git. Never commit an API key.

## Test the MVP

1. Select **Add expense**.
2. Enter a merchant, description, and amount.
3. Select **Categorize and add**.
4. Confirm the new transaction appears and the recommendation changes.

The included sample data is fictional and is safe to use during judging.

## Architecture

- Next.js 16 App Router and React 19
- TypeScript and Tailwind CSS 4
- Recharts for the weekly spending visualization
- Zod for API input and model-output validation
- Server-only AI calls through `POST /api/analyze`

The browser never receives the provider credential. If the AI provider is unavailable, the route returns a rules-based classification and still completes the user flow.

## Build Week status

The current MVP uses Gemini for low-cost development. OpenAI Build Week requires GPT-5.6 and Codex in the submitted project, so the AI adapter must be moved to GPT-5.6 before final submission. The route boundary and validated response shape are intentionally small to make that change contained.

Codex was used to scope the product, implement the dashboard and API flow, validate the build, and test the complete expense interaction in desktop and mobile browser sizes. The final submission should also include the required Codex `/feedback` session ID and a public demo video under three minutes.

## Verification

```bash
npm run lint
npm run build
```

Both commands pass on the current revision.

## Privacy and financial safety

Pocket Semester currently uses fictional sample data and does not connect to bank accounts. Recommendations are educational budgeting guidance, not financial, tax, or investment advice.

## License

MIT
