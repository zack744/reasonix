import type { ProviderSettingsReconciler } from '../../core/providers/types';

export const reasonixSettingsReconciler: ProviderSettingsReconciler = {
  handleEnvironmentChange(_settings: Record<string, unknown>): boolean {
    return false;
  },

  reconcileModelWithEnvironment(
    _settings: Record<string, unknown>,
    _conversations: import('../../core/types').Conversation[],
  ): { changed: boolean; invalidatedConversations: import('../../core/types').Conversation[] } {
    return { changed: false, invalidatedConversations: [] };
  },

  normalizeModelVariantSettings(_settings: Record<string, unknown>): boolean {
    return false;
  },
};
