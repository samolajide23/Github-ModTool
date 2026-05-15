import { context, reddit } from '@devvit/web/server';
import type { Comment, Post } from '@devvit/web/server';
import { prioritizeModQueue, recordReportEvent } from './queue.js';

type DemoPost = {
  title: string;
  text: string;
  reportReason: string;
  extraReports?: number;
};

const DEMO_POSTS: DemoPost[] = [
  {
    title: '[DEMO HIGH] Free money crypto scam — act now!!!',
    text: 'Limited giveaway phishing link. scam spam free money.',
    reportReason: 'spam',
    extraReports: 2,
  },
  {
    title: '[DEMO MED] Suspicious vendor DM me for deals',
    text: 'Not sure if this is allowed but posting anyway.',
    reportReason: 'spam',
    extraReports: 1,
  },
  {
    title: '[DEMO LOW] Weekly community check-in thread',
    text: 'How is everyone doing this week? Share updates.',
    reportReason: 'its personal information',
  },
];

const DEMO_COMMENT = {
  text: 'DM me for free crypto giveaway — scam link inside',
  reportReason: 'spam',
};

export type SeedResult = {
  postsCreated: number;
  commentsCreated: number;
  reportsSent: number;
  subredditName: string;
};

const reportThing = async (
  thing: Post | Comment,
  reason: string,
  times: number
): Promise<number> => {
  let sent = 0;

  for (let i = 0; i < times; i += 1) {
    try {
      await reddit.report(thing, { reason });
      await recordReportEvent(thing.id);
      sent += 1;
    } catch (error) {
      console.error(`Report failed for ${thing.id} (attempt ${i + 1})`, error);
    }
  }

  return sent;
};

export const seedDemoModQueue = async (): Promise<SeedResult> => {
  const subredditName = context.subredditName;

  if (!subredditName) {
    throw new Error('Seed must run inside a subreddit installation.');
  }

  let postsCreated = 0;
  let commentsCreated = 0;
  let reportsSent = 0;
  let firstPost: Awaited<ReturnType<typeof reddit.submitPost>> | undefined;

  for (const demo of DEMO_POSTS) {
    const post = await reddit.submitPost({
      subredditName,
      title: demo.title,
      text: demo.text,
    });

    postsCreated += 1;
    if (!firstPost) {
      firstPost = post;
    }

    reportsSent += await reportThing(post, demo.reportReason, 1 + (demo.extraReports ?? 0));
  }

  if (firstPost) {
    const comment = await reddit.submitComment({
      id: firstPost.id,
      text: DEMO_COMMENT.text,
    });
    commentsCreated += 1;
    reportsSent += await reportThing(comment, DEMO_COMMENT.reportReason, 2);
  }

  await prioritizeModQueue();

  return {
    postsCreated,
    commentsCreated,
    reportsSent,
    subredditName,
  };
};
