import { reddit } from '@devvit/web/server';
import type { RemovalReasonDto } from '../shared/api.js';

export const loadRemovalReasons = async (
  subredditName: string
): Promise<RemovalReasonDto[]> => {
  try {
    const reasons = await reddit.getSubredditRemovalReasons(subredditName);
    return reasons.map((r) => ({
      id: r.id,
      title: r.title,
    }));
  } catch (error) {
    console.error('loadRemovalReasons failed', error);
    return [];
  }
};
