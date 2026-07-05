import type { ProviderConfigMap } from '../core/types/settings';
import { DEFAULT_REASONIX_PROVIDER_SETTINGS } from './reasonix/settings';

export function getBuiltInProviderDefaultConfigs(): ProviderConfigMap {
  return {
    reasonix: { ...DEFAULT_REASONIX_PROVIDER_SETTINGS },
  };
}
