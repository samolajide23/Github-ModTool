/** Per-subreddit Install settings (works when logged in as a mod of that sub). */
export const getInstallSettingsUrl = (subredditName: string, appSlug = 'queue-toolk'): string => {
  const sub = subredditName.replace(/^r\//i, '').trim();
  return `https://developers.reddit.com/r/${sub}/apps/${appSlug}`;
};

/** @deprecated reddit.com/mod/.../apps often 404s — use getInstallSettingsUrl */
export const getModAppsUrl = getInstallSettingsUrl;

export const buildInstallSettingsHelpText = (subredditName: string): string => {
  const sub = subredditName.replace(/^r\//i, '').trim();
  const settingsUrl = getInstallSettingsUrl(sub);
  return [
    `Configure QueueIQ for r/${sub}`,
    '',
    'Method A — direct link (use while logged in as a mod):',
    settingsUrl,
    '',
    'Method B — from your profile:',
    '1. Click your avatar (top right) → My communities',
    '2. Open r/' + sub,
    '3. Find Apps / Community apps → QueueIQ → Settings',
    '',
    'Method C — from the QueueIQ dashboard:',
    '1. Open QueueIQ from the mod menu',
    '2. Tap the settings (gear) icon in the header to open the developer app settings page',
    '',
    'Note: Mod Tools (shield) opens the queue at /mod/.../queue — that is normal.',
    'reddit.com/mod/.../apps often shows “Page not found”.',
    '',
    'After saving: return to the dashboard and tap Refresh scores.',
  ].join('\n');
};
