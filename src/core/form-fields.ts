import type { Form } from '@devvit/shared-types/shared/form.js';
import type { PrioritizedItem } from './queue-types.js';
import { buildInstallSettingsHelpText } from './install-settings-help.js';
import { formatMockQueuePreview, buildMockPrioritizedQueue } from './mock-queue.js';
import { formatQueueItemHelp } from './queue.js';

/**
 * Mod-tool modal with read-only body text via form.description.
 */
export const readOnlyResultsForm = (
  title: string,
  body: string,
  options?: { acceptLabel?: string; cancelLabel?: string }
): Form => ({
  title,
  description: body,
  acceptLabel: options?.acceptLabel ?? 'Close',
  cancelLabel: options?.cancelLabel,
  fields: [],
});

export const installSettingsHelpForm = (subredditName: string): Form =>
  readOnlyResultsForm(
    'How to open Install settings',
    buildInstallSettingsHelpText(subredditName)
  );

/** Playtest-friendly preview — full text in description (groups only show labels). */
export const mockQueuePreviewForm = (): Form => {
  const items = buildMockPrioritizedQueue(20);
  return readOnlyResultsForm(
    'QueueIQ — Mock dashboard preview',
    formatMockQueuePreview(items)
  );
};

/** One form group per queue item for clearer separation in the modal. */
export const prioritizedQueueForm = (items: PrioritizedItem[]): Form => {
  if (items.length === 0) {
    return readOnlyResultsForm(
      'QueueIQ — Prioritized mod queue',
      'Mod queue is empty.\n\nRun npm run seed and npm run sync-demo in your project terminal, then try again.'
    );
  }

  return {
    title: 'QueueIQ — Prioritized mod queue',
    description: `Most urgent first · ${items.length} item(s)\nUse "Review top priority item" to open #1.`,
    acceptLabel: 'Close',
    cancelLabel: 'Cancel',
    fields: items.map((item, index) => {
      const kind = item.kind === 'post' ? 'Post' : 'Comment';
      return {
        type: 'group' as const,
        label: `#${index + 1} · ${item.breakdown.total} pts · ${kind}`,
        helpText: formatQueueItemHelp(item),
        fields: [],
      };
    }),
  };
};
