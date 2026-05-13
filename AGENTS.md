<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# HotAgent Project Notes

HotAgent is an AI industry hot-topic operation dashboard. The MVP validates the Agent workflow with AI HOT public data instead of building a crawler.

## Product Scope

- Data source: AI HOT public API (`https://aihot.virxact.com/api/public/items`).
- Default feed: selected AI HOT items from a recent rolling window.
- Core pipeline: perceive hot events, score and classify them, analyze lifecycle/risk, generate an operation strategy, then wait for human confirmation.
- Keep the data source adapter replaceable so Douyin or internal business feeds can be added later without changing the dashboard surface.

## Engineering Rules

- Use `src/lib/aihot.ts` for AI HOT API access. Always send a browser-like `User-Agent`.
- Use `src/lib/hot-events.ts` for PRD-level normalization, scoring, lifecycle, and strategy derivation.
- Do not put API keys in source files. Read secrets from `.env` only when a feature actually needs them.
- Do not introduce a database until persistence is needed. If a database is introduced, use Docker for local PostgreSQL and set the password to `123456` as requested.
- Before changing App Router behavior, read the bundled Next docs under `node_modules/next/dist/docs/`.
