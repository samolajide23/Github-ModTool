import { Hono } from 'hono';

import type {

  OnAppInstallRequest,

  OnCommentReportRequest,

  OnPostReportRequest,

  TriggerResponse,

} from '@devvit/web/shared';

import { getOrCreateDashboardPost } from '../core/dashboard-post.js';

import { prioritizeModQueue, recordReportEvent } from '../core/queue.js';

import {

  snapshotFromComment,

  snapshotFromPost,

  trackSnapshot,

} from '../core/storage.js';



export const triggers = new Hono();



const ensureDashboardPost = async (label: string): Promise<void> => {

  try {

    const post = await getOrCreateDashboardPost();

    console.log(`${label}: dashboard post ${post.id} → ${post.url}`);

  } catch (error) {

    console.error(`${label}: dashboard post failed`, error);

  }

};



triggers.post('/on-app-install', async (c) => {

  const input = await c.req.json<OnAppInstallRequest>();

  console.log('QueueIQ installed on r/' + input.subreddit?.name);



  try {

    const result = await prioritizeModQueue();

    console.log(`Initial queue scan: ${result.itemCount} items`);

  } catch (error) {

    console.error('Initial queue scan failed', error);

  }



  await ensureDashboardPost('onAppInstall');



  return c.json<TriggerResponse>({ status: 'success' }, 200);

});



triggers.post('/on-app-upgrade', async (c) => {

  await c.req.json();

  await ensureDashboardPost('onAppUpgrade');

  return c.json<TriggerResponse>({ status: 'success' }, 200);

});



triggers.post('/on-post-report', async (c) => {

  const input = await c.req.json<OnPostReportRequest>();



  if (input.post) {

    await trackSnapshot(snapshotFromPost(input.post));

    await recordReportEvent(

      input.post.id.startsWith('t3_') ? input.post.id : `t3_${input.post.id}`

    );

  }



  return c.json<TriggerResponse>({ status: 'success' }, 200);

});



triggers.post('/on-comment-report', async (c) => {

  const input = await c.req.json<OnCommentReportRequest>();



  if (input.comment) {

    await trackSnapshot(snapshotFromComment(input.comment));

    await recordReportEvent(

      input.comment.id.startsWith('t1_')

        ? input.comment.id

        : `t1_${input.comment.id}`

    );

  }



  return c.json<TriggerResponse>({ status: 'success' }, 200);

});


