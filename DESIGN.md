## How I approached it

- **Read the spec** Thought about the spec and how best to design a system that could scale with aditional services while also supporting required settings.
- **Added CI + formatting early.** Lint, type‑check, tests, prettier/ruff/black—boring but saves hours.
- **Bootstrapped the project using UV + React Router V7** With design figured out i.e How will we do auth, what DB will we use, how will python integrate with our app, it was a matter of starting the project
- **Using AI assisted coding heavily** Building a produciton level version of ChatGPT from scratch would be difficult to do without AI assisted coding so I used that a bit to help lay the ground work
- **Review AI assisted coding heavily** AI Coding assistants are pretty great but they also write some rather ugly code once in a while so also read every line it wrote and re-prompted or hand-wrote areas in which in struggled

## Architecture

- **React Router v7 + BFF.**

  - Has strong data fetching primitives (loaders/actions) which minimizes useEffect fetching.
  - Centralizes all application logic using BFF that way we can use the full stack feature set of RRv7 while also minimizing our risk by only exposing our node server to the public

## LLM layer

- **DSPy** for programmatic tuning over time—less brittle than hand‑rolled prompt tweaking.
- Gets better as we get more data which is very important to have set up initially.
- Did some minor experimentation with DSPy to optimize the model using SemanticF1

## Auth

- **WorkOS** for SSO + orgs. Solid multi‑tenant primitives and a clean path to plug into React Router + BFF sessions.

## Developer experience

- PRs run build, type checks, lint/format
- Data schemas (OpenAPI/Prisma Schema) which keeps DB calls and API calls in sync
