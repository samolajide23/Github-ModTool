/**
 * Seeds demo posts/reports into the playtest subreddit via Reddit OAuth.
 * Uses the Devvit CLI login token (~/.devvit/token).
 *
 * Usage:
 *   npm run seed              # default 25 posts + comments
 *   node scripts/seed-playtest.mjs --count 10
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SUBREDDIT = 'queue_toolk_dev';
const DEFAULT_POST_COUNT = 25;
const REQUEST_DELAY_MS = 1200;

const EXTREME_BODIES = [
  'URGENT: free money wire transfer. phishing scam giveaway link — act before ban. spam spam scam.',
  'Double your crypto overnight!!! phishing giveaway free money scam. DM for wallet drain spam.',
  'Official mod giveaway — claim free money now. scam phishing spam link inside. Limited slots!!!',
  'I hacked the system — free money for first 50 replies. scam phishing giveaway spam bot farm.',
  'Wire me $500 get $5000 back guaranteed. phishing scam free money spam giveaway crypto pump.',
  'Exclusive airdrop phishing page — free money scam spam. Click giveaway link before removal!!!',
  'Selling verified accounts + free money method. scam phishing spam giveaway bulk DM list.',
  'Mod team approved giveaway!!! free money scam phishing — spam repost bot network link.',
];

const HIGH_BODIES = [
  'Suspicious vendor — DM for deals. Might be scam or spam, not sure about giveaway rules.',
  'Is this phishing link legit? Someone sent free money offer in modmail. Looks like spam.',
  'Crossposting alleged giveaway — could be scam. Report if spam.',
  'New account posting affiliate spam every hour. Possible scam funnel.',
  'Fake support rep asking for login. Smells like phishing scam spam.',
  'Raid incoming? Multiple giveaway scam posts in last hour. spam spam spam.',
  'Bot comment flood on pinned thread — spam accounts pushing scam links.',
];

const MED_BODIES = [
  'Not sure if vendor posts are allowed — posting anyway for feedback.',
  'Heated argument in comments; might need review. No scam keywords here.',
  'Possible rule break but could be innocent. Community input welcome.',
  'Duplicate post from same user — is this spam or just eager?',
  'Off-topic rant — not sure which rule applies.',
];

const LOW_BODIES = [
  'Weekly community check-in — how is everyone doing?',
  'Reminder: read the sidebar before posting.',
  'Looking for book recommendations from regulars.',
  'Thanks to mods for last week cleanup thread.',
  'Meta: should we run a monthly feedback post?',
];

const COMMENT_TEXTS = [
  'DM me for free crypto giveaway — scam link inside',
  'phishing giveaway free money spam — click my profile',
  'Verified vendor!!! scam spam phishing giveaway DM now',
  'This is clearly spam — free money scam phishing bot',
  'Mod here: ignore giveaway phishing spam links',
  'Second report — still spam scam free money phishing',
  'Low effort scam repost — giveaway link in bio',
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseCount = () => {
  const idx = process.argv.indexOf('--count');
  if (idx === -1) {
    return DEFAULT_POST_COUNT;
  }
  const value = Number.parseInt(process.argv[idx + 1] ?? '', 10);
  if (!Number.isFinite(value) || value < 1) {
    throw new Error('Usage: node scripts/seed-playtest.mjs [--count N]');
  }
  return value;
};

/** @returns {{ title: string; text: string; reason: string; reports: number; tier: string }[]} */
const buildDemoPosts = (count) => {
  const posts = [];
  const extremeCount = Math.max(1, Math.round(count * 0.32));
  const highCount = Math.max(1, Math.round(count * 0.28));
  const medCount = Math.max(1, Math.round(count * 0.2));
  let lowCount = count - extremeCount - highCount - medCount;
  if (lowCount < 1) {
    lowCount = 1;
  }

  const pushTier = (tier, bodies, tierLimit, reports, reason) => {
    bodies.slice(0, tierLimit).forEach((text, index) => {
      if (posts.length >= count) {
        return;
      }
      posts.push({
        title: `[DEMO ${tier} ${String(index + 1).padStart(2, '0')}] ${text.slice(0, 72)}${text.length > 72 ? '…' : ''}`,
        text,
        reason,
        reports,
        tier,
      });
    });
  };

  pushTier('EXTREME', EXTREME_BODIES, extremeCount, 5, 'spam');
  pushTier('HIGH', HIGH_BODIES, highCount, 3, 'spam');
  pushTier('MED', MED_BODIES, medCount, 2, 'spam');
  pushTier('LOW', LOW_BODIES, lowCount, 1, 'its personal information');

  while (posts.length < count) {
    const n = posts.length + 1;
    posts.push({
      title: `[DEMO EXTREME ${String(n).padStart(2, '0')}] Overflow spam scam phishing giveaway free money`,
      text: 'Overflow seed post — spam scam phishing giveaway free money bot raid link.',
      reason: 'spam',
      reports: 4,
      tier: 'EXTREME',
    });
  }

  return posts.slice(0, count);
};

const loadToken = () => {
  const raw = readFileSync(join(homedir(), '.devvit', 'token'), 'utf8');
  const { token } = JSON.parse(raw);
  if (!token) {
    throw new Error('No token in ~/.devvit/token — run: npm run login');
  }

  try {
    const inner = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    if (inner.accessToken) {
      return inner.accessToken;
    }
  } catch {
    // token may already be a bare OAuth access token
  }

  return token;
};

const redditFetch = async (token, path, body) => {
  const response = await fetch(`https://oauth.reddit.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'queueiq-seed-script/1.0',
    },
    body: new URLSearchParams({ ...body, api_type: 'json' }),
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `Reddit API ${path} returned non-JSON (${response.status}): ${text.slice(0, 200)}`
    );
  }

  if (!response.ok || json.json?.errors?.length) {
    throw new Error(
      `Reddit API ${path} failed: ${JSON.stringify(json.json?.errors ?? json)}`
    );
  }

  return json.json?.data;
};

const submitPost = (token, demo) =>
  redditFetch(token, '/api/submit', {
    sr: SUBREDDIT,
    kind: 'self',
    title: demo.title,
    text: demo.text,
    resubmit: 'true',
  });

const submitComment = (token, postFullname, text) =>
  redditFetch(token, '/api/comment', {
    thing_id: postFullname,
    text,
  });

const reportThing = (token, fullname, reason) =>
  redditFetch(token, '/api/report', {
    thing_id: fullname,
    reason,
  });

const main = async () => {
  const token = loadToken();
  const count = parseCount();
  const demos = buildDemoPosts(count);
  const created = [];

  console.log(`Seeding r/${SUBREDDIT} with ${demos.length} posts...`);

  for (const demo of demos) {
    const data = await submitPost(token, demo);
    const fullname = data?.name ?? data?.id;
    if (!fullname) {
      throw new Error(`No post id returned for: ${demo.title}`);
    }

    const id = fullname.startsWith('t3_') ? fullname : `t3_${fullname}`;
    created.push({ id, title: demo.title, tier: demo.tier });

    for (let i = 0; i < demo.reports; i += 1) {
      try {
        await reportThing(token, id, demo.reason);
        await sleep(300);
      } catch (error) {
        console.warn(`Report skipped for ${id}:`, error.message);
      }
    }

    console.log(`  ✓ [${demo.tier}] ${id}: ${demo.title.slice(0, 60)}…`);
    await sleep(REQUEST_DELAY_MS);
  }

  const commentTargets = created.filter((post) => post.tier === 'EXTREME').slice(0, 7);
  console.log(`\nAdding ${commentTargets.length} reported comments on extreme posts...`);

  for (let i = 0; i < commentTargets.length; i += 1) {
    const target = commentTargets[i];
    const text = COMMENT_TEXTS[i % COMMENT_TEXTS.length];

    try {
      const comment = await submitComment(token, target.id, text);
      const commentId = comment?.things?.[0]?.data?.id
        ? `t1_${comment.things[0].data.id}`
        : comment?.name;

      if (commentId) {
        for (let r = 0; r < 2; r += 1) {
          try {
            await reportThing(token, commentId, 'spam');
            await sleep(300);
          } catch (error) {
            console.warn(`Comment report skipped:`, error.message);
          }
        }
        console.log(`  ✓ Comment ${commentId} on ${target.id}`);
      }
    } catch (error) {
      console.warn(`Comment skipped on ${target.id}:`, error.message);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  const tierCounts = created.reduce((acc, post) => {
    acc[post.tier] = (acc[post.tier] ?? 0) + 1;
    return acc;
  }, {});

  console.log('\nDone!');
  console.log(`Posts created: ${created.length}`, tierCounts);
  console.log(`Mod queue: https://www.reddit.com/r/${SUBREDDIT}/about/modqueue/`);
  console.log(`Playtest: https://www.reddit.com/r/${SUBREDDIT}/?playtest=queue-toolk`);
  console.log('\nNext: npm run sync-demo  (refresh bundled snapshots for local demo)');
};

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
