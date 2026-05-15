import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const loadToken = () => {
  const raw = readFileSync(join(homedir(), '.devvit', 'token'), 'utf8');
  let token = JSON.parse(raw).token;
  try {
    token = JSON.parse(Buffer.from(token, 'base64').toString()).accessToken || token;
  } catch {
    /* */
  }
  return token;
};

const get = async (token, path) => {
  const r = await fetch(`https://oauth.reddit.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'q/1' },
  });
  return r.json();
};

const token = loadToken();
const sub = 'queue_toolk_dev';
const n = await get(token, `/r/${sub}/new?limit=100&raw_json=1`);
console.log('Recent posts (last 15):');
for (const c of (n.data?.children ?? []).slice(0, 15)) {
  console.log(c.data.name, c.data.author, c.data.title?.slice(0, 60));
}
for (const user of ['queue-toolk', 'queue_toolk', 'QueueIQ']) {
  try {
    const u = await get(token, `/user/${user}/submitted?limit=25&raw_json=1`);
    const kids = u.data?.children ?? [];
    console.log(`\nuser/${user}: ${kids.length} posts`);
    for (const c of kids) console.log(' ', c.data.name, c.data.title);
  } catch (e) {
    console.log(`user/${user}: error`, e.message);
  }
}
