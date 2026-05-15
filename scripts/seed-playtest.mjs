/**
 * Seeds demo posts/reports into the playtest subreddit via Reddit OAuth.
 * Uses the Devvit CLI login token (~/.devvit/token).
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SUBREDDIT = 'queue_toolk_dev';

const DEMOS = [
  {
    title: '[DEMO HIGH] Free money crypto scam — act now!!!',
    text: 'Limited giveaway phishing link. scam spam free money.',
    reason: 'spam',
    reports: 1,
  },
  {
    title: '[DEMO MED] Suspicious vendor DM me for deals',
    text: 'Not sure if this is allowed but posting anyway.',
    reason: 'spam',
    reports: 1,
  },
  {
    title: '[DEMO LOW] Weekly community check-in thread',
    text: 'How is everyone doing this week? Share updates.',
    reason: 'its personal information',
    reports: 1,
  },
];

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
  const created = [];

  console.log(`Seeding r/${SUBREDDIT}...`);

  for (const demo of DEMOS) {
    const data = await submitPost(token, demo);
    const fullname = data?.name ?? data?.id;
    if (!fullname) {
      throw new Error(`No post id returned for: ${demo.title}`);
    }

    const id = fullname.startsWith('t3_') ? fullname : `t3_${fullname}`;
    created.push({ id, title: demo.title });

    for (let i = 0; i < demo.reports; i += 1) {
      try {
        await reportThing(token, id, demo.reason);
      } catch (error) {
        console.warn(`Report skipped for ${id}:`, error.message);
      }
    }

    console.log(`  ✓ Post ${id}: ${demo.title}`);
  }

  const comment = await submitComment(
    token,
    created[0].id,
    'DM me for free crypto giveaway — scam link inside'
  );
  const commentId = comment?.things?.[0]?.data?.id
    ? `t1_${comment.things[0].data.id}`
  : comment?.name;

  if (commentId) {
    try {
      await reportThing(token, commentId, 'spam');
      console.log(`  ✓ Comment ${commentId} reported`);
    } catch (error) {
      console.warn(`Comment report skipped:`, error.message);
    }
  }

  console.log('\nDone! Open mod queue:');
  console.log(`https://www.reddit.com/r/${SUBREDDIT}/about/modqueue/`);
  console.log(
    `https://www.reddit.com/r/${SUBREDDIT}/?playtest=queue-toolk`
  );
};

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
