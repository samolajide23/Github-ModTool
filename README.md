# QueueIQ — Prioritized Mod Queue for Reddit

Reddit's mod queue is chronological. A death threat and a wrong-flair post sit in the same list, in the order they arrived. **QueueIQ doesn't.**

QueueIQ scores every reported post and comment in your mod queue with transparent, configurable rules — **no AI, no black box** — and surfaces the highest-risk items first. Moderators see exactly *why* something ranks where it does, act from one dashboard, and tune the math to match their community.

No API keys. No webhooks. No LLM calls. Install it and your queue starts prioritizing immediately with sensible defaults.

---

## The problem

When report volume spikes, moderators — most of them unpaid volunteers — spend the first minutes of every session manually scanning for what actually needs attention. A coordinated spam wave can bury a harassment report. A low-karma account posting banned keywords looks identical to a routine flair complaint until someone reads every title.

For busy subreddits, a flat queue isn't just slow. It's a burnout driver. Mods miss critical content not because they're absent, but because the queue gives them no signal about urgency.

---

## What happens when you install QueueIQ

Your mod queue gets **ranked by score**, highest first. Each item earns points from signals you can see and adjust — reports, keyword matches, author signals, time waiting, mod reports, and flair rules. Color-coded scores make the top of the list impossible to miss.

Open **QueueIQ** from your subreddit mod menu and the riskiest items in your queue are already at the top. Expand any row for a line-by-line breakdown of how the total was calculated. No guessing. No opaque ranking.

| Score band | What it usually means |
|------------|------------------------|
| High (red/orange) | Multiple reports, keyword hits, mod reports, suspicious author signals |
| Mid | Some reports or age in queue, worth a look |
| Low | Routine items — fewer signals, review when you have time |

Within the same score, older queue items surface first so nothing ages out unseen.

---

## How scoring works

QueueIQ uses **simple math mods can audit**, not machine learning. Every weight lives in subreddit install settings. Change a number, refresh the dashboard, and the queue re-sorts.

```
total =
  reports × weight
  + keyword hits × weight
  + low-karma bonus (0 or flat)
  + repeat reports × weight
  + queue age (hours) × weight
  + young-account bonus (0 or flat)
  + mod reports × weight
  + flair bonus
```

Default weights (all editable):

| Signal | Default | How it applies |
|--------|---------|----------------|
| User reports | ×3 each | Report count on the item |
| Banned keywords | ×5 each | Matched against title, body, or comment text |
| Low-karma author | +4 flat | Author below karma threshold |
| Repeat report events | ×2 each | Extra report activity beyond the first |
| Time in queue | ×1 per hour | Capped at 7 days |
| Young account | +3 flat | Account newer than max age (days) |
| Mod reports | ×5 each | When moderators reported the item |
| Flair rules | custom | e.g. `News:10, Meme:2` matched to post flair |

Scores are stored in Redis and recomputed on every refresh. Decimals are supported (e.g. `2.5` points per report).

---

## Key features

**Prioritized dashboard** — Mod menu → **Open QueueIQ** opens an inline custom post listing reported posts and comments ranked by urgency. Filter by Posts / Comments / all, set a minimum score, and expand any item for its full breakdown.

**Inline moderation** — Approve, remove, spam, lock/unlock, ignore or unignore reports, and ban — with confirmation, optional removal reasons, and mod notes. Act without leaving the tool.

**Per-item score** — Right-click any post or comment → **QueueIQ score** for an instant breakdown of why that item ranks where it does.

**Auto-refresh** — Queue re-prioritized every 5 minutes, on new reports, on install/upgrade, and when you tap **Refresh**.

**Optional auto-remove** — Install setting to remove items when score **and** minimum report count thresholds are met (capped per refresh; audit log included). Start with a high threshold and watch the log for false positives.

**Audit log** — Recent mod actions stored in Redis for accountability.

**Moderators only** — API and UI are restricted to subreddit moderators.

> The dashboard is a Devvit custom post inside your subreddit. It complements Reddit's native mod queue with ranking and actions — it does not replace `/mod/.../queue`.

---

## Who benefits most

**High-volume general subs** — When report floods hide the one item with five reports and a banned keyword, QueueIQ puts it at the top automatically so mods respond to the actual threat instead of clearing noise first.

**Communities with spam or raid patterns** — Low-karma authors, young accounts, and keyword lists are first-class scoring signals. Tune weights once; the queue adapts every refresh.

**Any sub with a volunteer mod team** — Transparent scoring means new mods trust the order. Senior mods can adjust weights in install settings without touching code.

---

## Installation

1. Find **QueueIQ** in the [Devvit App Directory](https://developers.reddit.com/apps/queue-toolk) (or install from the Developer Portal while in review).
2. Click **Add to Community** and select your subreddit.
3. From mod tools, open the subreddit menu → **Open QueueIQ**.
4. The prioritized queue loads automatically — defaults work out of the box.

To customize scoring for your community, go to **Mod Tools → App settings** (or the gear on the dashboard). Adding keywords and adjusting weights takes under a minute and requires no code.

---

## Configuration (optional)

| Setting | What it does |
|---------|----------------|
| Banned keywords | Comma-separated phrases matched in content |
| Low karma threshold | Authors below this total karma get the low-karma bonus |
| Points per report / keyword / repeat / hour / mod report | Scoring weights (decimals allowed) |
| Low-karma & young-account bonuses | Flat points + young account max age (days) |
| Flair bonus rules | `FlairName:points` pairs |
| Auto-remove at score | `0` = off; remove when total ≥ threshold **and** report count ≥ min reports (max 15 per refresh) |

A mental health community and a meme subreddit have different threat models. QueueIQ adapts to yours through install settings, not a one-size-fits-all tier list.

---

## For developers

### Prerequisites

- Node.js **22.2.0+**
- A Reddit account with [Reddit Developer](https://developers.reddit.com) access

### Quickstart

```bash
npm run login
npm install
npm run dev          # playtest in a subreddit you moderate
```

Try it: create reported posts/comments → mod menu → **Open QueueIQ** → use filters, expand scores, run mod actions.

Local UI demo (no Reddit): `npm run demo`

### Deploy

**Upload only** (private; test subreddits under ~200 subscribers):

```bash
npm run build
npx devvit upload --bump patch
devvit install r/your_subreddit queue-toolk@<version>
```

**Publish publicly** (App Directory, after Reddit review):

```bash
npm run publish:public
```

You'll get an email when approved. App page: https://developers.reddit.com/apps/queue-toolk

`npm run deploy` runs build, type-check, lint, and `devvit upload` (no publish).

### Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Build + Devvit playtest |
| `npm run build` | Production client + server build |
| `npm run demo` | Local mock dashboard (Vite) |
| `npm run test` | Unit tests (scoring, auto-remove, API helpers, etc.) |
| `npm run type-check` | TypeScript project check |
| `npm run deploy` | Build, type-check, lint, `devvit upload` |
| `npm run launch` | Deploy + publish |

### Project structure

```
src/
  client/              # React dashboard (QueueDashboard, hooks, CSS)
  core/
    scoring.ts         # Pure scoring logic (tested)
    queue.ts           # Mod queue fetch + prioritize + Redis
    config.ts          # Install settings → QueueConfig
    mod-actions.ts     # Approve / remove / spam / ban / lock / ignore …
    mod-guard.ts       # Moderator-only API access
    auto-remove-by-score.ts
    audit-log.ts
    flair-rules.ts
    author-signals.ts
  routes/
    api.ts             # /api/queue, /api/refresh, mod actions
    menu.ts            # Open dashboard, item score
    forms.ts           # Score breakdown form
    triggers.ts        # Install, upgrade, reports
    scheduler.ts       # Cron refresh (every 5 min)
  shared/              # API types, formatters
```

### Project status

- Built on Devvit Web (React dashboard + server routes)
- Scoring, auto-remove, audit log, scheduler, triggers, and mod actions covered by unit tests
- Playtest-ready; public listing via `npm run publish:public` pending Reddit review

---

## Demo pitch

> "We cut mod review time by surfacing the riskiest items first — multiple reports, spam keywords, low-karma and young accounts, stale queue items — using simple math mods can trust, audit, and tune."

---

## License

BSD-3-Clause
