import type { Form } from '@devvit/shared-types/shared/form.js';

/**
 * Mod-tool modal with read-only body text via form.description.
 */
export const readOnlyResultsForm = (
  title: string,
  body: string,
  options?: { acceptLabel?: string; cancelLabel?: string }
): Form => {
  const form: Form = {
    title,
    description: body,
    acceptLabel: options?.acceptLabel ?? 'Close',
    fields: [],
  };
  if (options?.cancelLabel !== undefined) {
    form.cancelLabel = options.cancelLabel;
  }
  return form;
};
