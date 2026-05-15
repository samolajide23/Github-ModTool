/**
 * Tests the same Reddit APIs QueueIQ uses (via OAuth, outside Devvit).
 * Run: npm run test:reddit-api
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const SUBREDDIT = 'queue_toolk_dev';

const loadToken = () => {
  const raw = readFileSync(join(homedir(), '.devvit', 'token'), 'utf8');
  const { token } = JSON.parse(raw);
  try {
    const inner = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    if (inner.accessToken) return inner.accessToken;
  } catch {
    /* bare token */
  }
  return token;
};

const redditGet = async (token, path) => {
  const url = `https://oauth.reddit.com${path}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'User-Agent': 'queueiq-test/1.0',
    },
  });
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${path} → non-JSON ${response.status}: ${text.slice(0, 120)}`);
  }
  if (!response.ok) {
    throw new Error(`${path} → HTTP ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
};

const test = async (name, fn) => {
  try {
    const result = await fn();
    console.log(`✓ ${name}`);
    return result;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    return null;
  }
};

const main = async () => {
  const token = loadToken();
  console.log(`Testing Reddit APIs for r/${SUBREDDIT}\n`);

  await test('Subreddit about (what getSubredditByName uses)', () =>
    redditGet(token, `/r/${SUBREDDIT}/about`)
  );

  const modqueue = await test('Mod queue listing (what QueueIQ uses)', () =>
    redditGet(token, `/r/${SUBREDDIT}/about/modqueue?limit=25`)
  );

  await test('Reports listing (fallback)', () =>
    redditGet(token, `/r/${SUBREDDIT}/about/reports?limit=25`)
  );

  if (modqueue?.data?.children?.length) {
    const first = modqueue.data.children[0].data;
    const fullname = first.name;
    console.log(`\nSample queue item: ${fullname} — ${first.title ?? first.body?.slice(0, 40)}`);

    await test('Fetch post/comment by id', () =>
      redditGet(token, `/api/info?id=${fullname}`)
    );
  } else {
    console.log('\nMod queue empty — run npm run seed first');
  }

  console.log('\nDone.');
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
