# QueueIQ — Mod Queue Prioritizer

**QueueIQ** is a [Devvit](https://developers.reddit.com) mod tool for Reddit. It scores every item in your mod queue with transparent, configurable rules—**no LLMs**—and shows moderators **what to review first**.

QueueIQ turns an overwhelming mod queue into a sorted, explainable to-do list: higher score means review sooner. Moderators can see exactly how each score was calculated, act from one dashboard, and tune behavior in subreddit install settings.

## What it does

- **Prioritized dashboard** — Inline custom post (mod menu → **Open QueueIQ**) lists reported posts and comments ranked by urgency, with color-coded scores, filters (Posts / Comments / all, minimum score), and expandable score breakdowns.
- **Mod actions in-app** — Approve, remove, spam, lock/unlock, ignore or unignore reports, and ban (with confirmation, optional removal reasons, and mod notes).
- **Per-item score** — **QueueIQ score** on any post or comment explains why that item ranks where it does.
- **Auto-refresh** — Queue re-prioritized every 5 minutes, on new reports, on install/upgrade, and when you tap **Refresh** on the dashboard.
- **Optional auto-remove** — Install setting to remove items when score **and** minimum report count thresholds are met (capped per refresh; audit log included).
- **Audit log** — Recent mod actions stored in Redis for accountability.
- **Moderators only** — API and UI are restricted to subreddit moderators; regular users do not get the tool.

> **Note:** The full dashboard is a Devvit custom post inside your subreddit. It does not replace Reddit’s native `/mod/.../queue` page, but complements it with ranking and actions.

## Scoring

Each queue item gets an urgency **total** from weighted signals (defaults shown; all weights are editable in install settings):

| Signal | Default weight | How it applies |
|--------|----------------|----------------|
| User reports | ×3 per report | Report count on the item |
| Banned keywords | ×5 per match | Comma-separated list vs title/body/comment text |
| Low-karma author | +4 flat | Author below karma threshold |
| Repeat report events | ×2 | Extra report activity beyond the first |
| Time in queue | ×1 per hour | Older items score higher (capped at 7 days) |
| Young account | +3 flat | Account newer than max age (days) |
| Mod reports | ×5 per mod report | When moderators reported the item |
| Flair rules | custom | e.g. `News:10, Meme:5` matched to post flair |

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

Scores are stored in Redis and recomputed on refresh. The dashboard shows a line-by-line breakdown for every item. **Scoring weights**, **auto-remove threshold**, **flair points**, and the dashboard **minimum score filter** support **decimals** (e.g. `2.5` points per report). Karma threshold, account age (days), and min report counts stay whole numbers.

## Install settings

Open **Mod Tools → App settings** (or the gear on the dashboard) for your subreddit:

| Setting | Purpose |
|---------|---------|
| Banned keywords | Comma-separated phrases to match in content |
| Low karma threshold | Authors below this total karma get the low-karma bonus |
| Points per report / keyword / repeat / hour / mod report | Scoring weights |
| Low-karma & young-account bonuses | Flat points + young account max age (days) |
| Flair bonus rules | `FlairName:points` pairs |
| Auto-remove at score | `0` = off; otherwise remove when total ≥ threshold **and** report count ≥ min reports (max 15 per refresh) |

Start auto-remove with a **high** score threshold and a **minimum report** count; watch the audit log for false positives.

## Quickstart

### Prerequisites

- Node.js **22.2.0+**
- A Reddit account with [Reddit Developer](https://developers.reddit.com) access

### Setup

1. Log in to Devvit:

   ```bash
   npm run login
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Playtest in a subreddit you moderate:

   ```bash
   npm run dev
   ```

4. Install **QueueIQ** on that subreddit (playtest link or Developer Portal).

5. Configure **install settings** (keywords, weights, optional auto-remove).

### Try it

1. Create a few reported posts and comments in your test subreddit.
2. Subreddit mod menu → **Open QueueIQ** to open the dashboard post.
3. On any post or comment → **QueueIQ score** for a breakdown.
4. Use filters, expand score details, and run mod actions from the list.

### Local UI demo (no Reddit)

```bash
npm run demo
```

Opens a local mock dashboard for layout and interaction testing.

## Deploy

**Upload only** (private to you; test subreddits under ~200 subscribers):

```bash
npm run build
npx devvit upload --bump patch
devvit install r/your_subreddit queue-toolk@<version>
```

**Publish publicly** (App Directory + any subreddit you moderate, after Reddit review):

```bash
npm run publish:public
```

That runs `devvit publish --public`, uploads source for review, and submits the version. You’ll get an email when approved. Until then, the app is **not** listed publicly—only uploaded builds you install yourself work.

App page: https://developers.reddit.com/apps/queue-toolk

`npm run deploy` runs build, type-check, lint, and `devvit upload` (no publish).

## Demo pitch

> “We cut mod review time by surfacing the riskiest items first—multiple reports, spam keywords, low-karma and young accounts, stale queue items—using simple math mods can trust, audit, and tune.”

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Build + Devvit playtest |
| `npm run build` | Production client + server build |
| `npm run demo` | Local mock dashboard (Vite) |
| `npm run test` | Unit tests (scoring, auto-remove, API helpers, etc.) |
| `npm run type-check` | TypeScript project check |
| `npm run deploy` | Build, type-check, lint, `devvit upload` |
| `npm run launch` | Deploy + publish |

## Project structure

```
src/
  client/              # React dashboard (QueueDashboard, hooks, CSS)
  core/
    scoring.ts         # Pure scoring logic (tested)
    queue.ts           # Mod queue fetch + prioritize + Redis
    config.ts          # Install settings → QueueConfig
    mod-actions.ts     # Approve / remove / spam / ban / lock / ignore …
    mod-guard.ts         # Moderator-only API access
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

## License

BSD-3-Clause
