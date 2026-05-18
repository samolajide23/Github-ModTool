/** Stubs Devvit client APIs for local `npm run demo` (outside Reddit webview). */
export const navigateTo = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

export const showForm = async (): Promise<{ action: string }> => {
  window.alert(
    'Local demo: In Reddit, open Mod Tools → Apps → QueueIQ → Settings, or use the settings (gear) icon on the QueueIQ dashboard.'
  );
  return { action: 'SUBMITTED' };
};

export const context = {
  username: 'demo_moderator',
};

export const requestExpandedMode = (): void => {
  /* no-op locally */
};
