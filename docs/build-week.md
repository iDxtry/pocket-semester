# Build Week record

Pocket Semester was meaningfully extended during OpenAI Build Week beginning July 13, 2026.

## Codex and GPT-5.6 workflow

The core work was completed in Codex using GPT-5.6: product scoping, design critique, implementation, test repair, responsive review, and submission preparation. The associated `/feedback` Session ID from the primary implementation task is supplied in the Devpost submission.

## Key decisions

- Focus the product on one judge-visible job: whether a student's money will last through finals.
- Keep money math deterministic and integer-cent based; AI may categorize or explain, but it does not calculate balances or invent savings impacts.
- Keep Gemini as the runtime model because Build Week credits are for Codex, not API usage. All UI and submission copy distinguish this from build-time GPT-5.6 use.
- Keep the public demo resettable and fictional, with no bank linking or account required.
- Use a warm, editorial campus-ledger design rather than generic AI styling.

## Validation performed

- Unit tests for money math, month states, CSV parsing, AI schemas, provenance, auth helpers, and semester-runway tradeoffs.
- Lint and production build checks.
- Desktop and mobile browser checks for the demo, dialogs, navigation, and responsive layout.

Relevant Build Week commits are dated July 13, 2026 or later on the public repository.
