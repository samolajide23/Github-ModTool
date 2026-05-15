import { showForm } from '@devvit/web/client';
import { buildInstallSettingsHelpText } from '../shared/install-settings-url.js';

export const openInstallSettingsHelp = async (subredditName: string): Promise<void> => {
  await showForm({
    form: {
      title: 'How to open Install settings',
      description: buildInstallSettingsHelpText(subredditName),
      acceptLabel: 'Got it',
      fields: [],
    },
  });
};
