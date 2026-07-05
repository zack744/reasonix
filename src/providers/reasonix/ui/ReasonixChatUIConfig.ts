import type {
  ProviderChatUIConfig,
  ProviderPermissionModeToggleConfig,
  ProviderReasoningOption,
  ProviderUIOption,
} from '../../../core/providers/types';
import { getReasonixProviderSettings } from '../settings';

const REASONIX_MODELS: ProviderUIOption[] = [
  { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash', description: 'Fast and efficient' },
  { value: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro', description: 'More capable' },
  { value: 'reasonix', label: 'Reasonix Default', description: 'Use Reasonix default model' },
];

const DEFAULT_CONTEXT_WINDOW = 128_000;

export const reasonixChatUIConfig: ProviderChatUIConfig = {
  getModelOptions(_settings: Record<string, unknown>): ProviderUIOption[] {
    return [...REASONIX_MODELS];
  },

  ownsModel(model: string, settings: Record<string, unknown>): boolean {
    if (model === 'reasonix') {
      return true;
    }
    const rxSettings = getReasonixProviderSettings(settings);
    return model === rxSettings.model || REASONIX_MODELS.some(m => m.value === model);
  },

  isAdaptiveReasoningModel(_model: string, _settings: Record<string, unknown>): boolean {
    return false;
  },

  getReasoningOptions(_model: string, _settings: Record<string, unknown>): ProviderReasoningOption[] {
    return [];
  },

  getDefaultReasoningValue(_model: string, _settings: Record<string, unknown>): string {
    return 'off';
  },

  getContextWindowSize(
    _model: string,
    customLimits?: Record<string, number>,
  ): number {
    return customLimits?.['reasonix'] ?? DEFAULT_CONTEXT_WINDOW;
  },

  isDefaultModel(model: string): boolean {
    return model === 'reasonix';
  },

  applyModelDefaults(model: string, settings: unknown): void {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      return;
    }
    const settingsBag = settings as Record<string, unknown>;
    settingsBag.model = model;
    settingsBag.effortLevel = 'off';
  },

  normalizeModelVariant(model: string, _settings: Record<string, unknown>): string {
    return model;
  },

  getCustomModelIds(): Set<string> {
    return new Set<string>();
  },

  getPermissionModeToggle(): ProviderPermissionModeToggleConfig | null {
    return null;
  },

  getModeSelector(): null {
    return null;
  },

  getProviderIcon(): null {
    return null;
  },
};
