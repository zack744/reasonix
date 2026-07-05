import * as fs from 'node:fs';

import { Setting } from 'obsidian';

import type { ProviderSettingsTabRenderer } from '../../../core/providers/types';
import { getHostnameKey } from '../../../utils/env';
import { expandHomePath } from '../../../utils/path';
import { maybeGetReasonixWorkspaceServices } from '../app/ReasonixWorkspaceServices';
import {
  getReasonixProviderSettings,
  updateReasonixProviderSettings,
} from '../settings';

export const reasonixSettingsTabRenderer: ProviderSettingsTabRenderer = {
  render(container, context) {
    const settingsBag = context.plugin.settings as unknown as Record<string, unknown>;
    const rxSettings = getReasonixProviderSettings(settingsBag);
    const hostnameKey = getHostnameKey();
    const workspace = maybeGetReasonixWorkspaceServices();

    new Setting(container).setName('Setup').setHeading();

    new Setting(container)
      .setName('Enable Reasonix')
      .setDesc('Use the local Reasonix CLI (DeepSeek terminal agent) as the chat provider.')
      .addToggle((toggle) =>
        toggle
          .setValue(rxSettings.enabled)
          .onChange(async (value) => {
            updateReasonixProviderSettings(settingsBag, { enabled: value });
            await context.plugin.saveSettings();
            context.refreshModelSelectors();
          })
      );

    const validationEl = container.createDiv({
      cls: 'claudian-setting-validation claudian-setting-validation-error claudian-hidden',
    });
    let cliPathInputEl: HTMLInputElement | null = null;

    const updateCliPathValidation = (value: string, inputEl?: HTMLInputElement): boolean => {
      const error = validateCliPath(value);
      if (error) {
        validationEl.setText(error);
        validationEl.toggleClass('claudian-hidden', false);
        inputEl?.toggleClass('claudian-input-error', true);
        return false;
      }
      validationEl.toggleClass('claudian-hidden', true);
      inputEl?.toggleClass('claudian-input-error', false);
      return true;
    };

    const persistCliPath = async (value: string): Promise<void> => {
      if (!updateCliPathValidation(value, cliPathInputEl ?? undefined)) {
        return;
      }

      const cliPathsByHost = { ...getReasonixProviderSettings(settingsBag).cliPathsByHost };
      const trimmed = value.trim();
      if (trimmed) {
        cliPathsByHost[hostnameKey] = trimmed;
      } else {
        delete cliPathsByHost[hostnameKey];
      }

      updateReasonixProviderSettings(settingsBag, { cliPathsByHost });
      workspace?.cliResolver?.reset();
      await context.plugin.saveSettings();
      context.refreshModelSelectors();
    };

    new Setting(container)
      .setName('CLI path')
      .setDesc('Optional absolute path to the reasonix CLI for this computer. Leave empty to use `reasonix` from PATH.')
      .addText((text) => {
        const currentValue = rxSettings.cliPathsByHost[hostnameKey] || '';
        text
          .setPlaceholder(process.platform === 'win32'
            ? 'C:\\Users\\you\\AppData\\Roaming\\npm\\reasonix.cmd'
            : '/usr/local/bin/reasonix')
          .setValue(currentValue)
          .onChange((value) => {
            void persistCliPath(value);
          });
        cliPathInputEl = text.inputEl;
        updateCliPathValidation(currentValue, text.inputEl);
      });

    new Setting(container).setName('Model').setHeading();

    new Setting(container)
      .setName('Model')
      .setDesc('The model to use with Reasonix.')
      .addText((text) => {
        text
          .setPlaceholder('deepseek-v4-flash')
          .setValue(rxSettings.model)
          .onChange(async (value) => {
            updateReasonixProviderSettings(settingsBag, { model: value.trim() });
            await context.plugin.saveSettings();
            context.refreshModelSelectors();
          });
      });

    new Setting(container)
      .setName('System prompt')
      .setDesc('Optional system prompt prepended to each message.')
      .addTextArea((text) => {
        text
          .setPlaceholder('You are a helpful assistant...')
          .setValue(rxSettings.systemPrompt)
          .onChange(async (value) => {
            updateReasonixProviderSettings(settingsBag, { systemPrompt: value });
            await context.plugin.saveSettings();
          });
        text.inputEl.rows = 4;
        text.inputEl.cols = 40;
      });
  },
};

function validateCliPath(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const expandedPath = expandHomePath(trimmed);
  if (!fs.existsSync(expandedPath)) {
    return 'Path does not exist';
  }

  if (!fs.statSync(expandedPath).isFile()) {
    return 'Path must point to a file';
  }

  return null;
}
