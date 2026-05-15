# QueueIQ — Mod Queue Prioritizer (no AI)

**QueueIQ** is a [Devvit](https://developers.reddit.com) mod tool for Reddit hackathons. It scores every item in your mod queue with transparent rules—no LLMs—and shows moderators **what to review first**.

## Scoring formula

Each queue item gets an urgency score:

```
score =
  + report count × 3
  + banned keyword matches × 5
  + low-karma author × 4
  + repeated report events × 2
```

Higher score → review sooner. Scores are stored in Redis and refreshed automatically.

## Features

- **Prioritized mod queue view** — ranked list with score breakdown per item
- **Review top priority** — one click to the most urgent item
- **Per-item score** — menu action on posts/comments (including mod queue)
- **Auto-refresh** — every 5 minutes + on new reports + on install
- **Subreddit settings** — banned keywords and low-karma threshold

## Quickstart

### Prerequisites

- Node.js **22.2.0+**
- A Reddit account with [Reddit Developer](https://developers.reddit.com) access

### Setup

1. Log in to Devvit:

   ```bash
   npm run login
   ```

2. Install dependencies (if you have not already):

   ```bash
   npm install
   ```

3. Run in your test subreddit:

   ```bash
   npm run dev
   ```

4. Install **QueueIQ** on a subreddit you moderate (via the playtest link or Developer Portal).

5. Open **Mod Tools → Install settings** and adjust:
   - **Banned keywords** (comma-separated)
   - **Low karma threshold** (default: 100)
   - **Scoring weights** (points per report, keyword, low karma, repeat reports)

### Try it in mod queue

1. Create a few reported posts/comments in your test subreddit.
2. Use **⋯ → View prioritized mod queue** on the subreddit.
3. Use **Review top priority item** to jump to the highest-scoring item.
4. On any queued item, use **⋯ → QueueIQ score** for the breakdown.

## Demo pitch

> “We cut mod review time by surfacing the riskiest items first—multiple reports, spam keywords, sockpuppety low-karma accounts—using simple math mods can trust and audit.”

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Build + playtest in a test subreddit |
| `npm run build` | Production build |
| `npm run type-check` | TypeScript check |
| `npm run test` | Unit tests for scoring logic |
| `npm run deploy` | Upload to Reddit |

## Project structure

```
src/
  core/
    scoring.ts    # Pure scoring logic (tested)
    queue.ts      # Mod queue fetch + Redis ranking
    config.ts     # Install settings
  routes/
    menu.ts       # Moderator menu actions
    forms.ts      # Queue / score UI forms
    triggers.ts   # Reports + install hooks
    scheduler.ts  # Cron refresh
```

## License

BSD-3-Clause
