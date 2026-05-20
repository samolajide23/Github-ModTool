declare module '@devvit/web/client' {
  export function navigateTo(url: string): void;
  export function showForm(options: unknown): Promise<{ action: string }>;
  export const context: { username?: string };
  export function requestExpandedMode(options?: unknown): void;
}
