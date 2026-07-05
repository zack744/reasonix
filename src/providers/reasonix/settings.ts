import { getProviderConfig, setProviderConfig } from '../../core/providers/providerConfig';
import type { HostnameCliPaths } from '../../core/types/settings';
import { getHostnameKey, migrateLegacyHostnameKeyedMap } from '../../utils/env';

export interface PersistedReasonixProviderSettings {
  cliPath: string;
  cliPathsByHost: HostnameCliPaths;
  enabled: boolean;
  model: string;
  systemPrompt: string;
}

export type ReasonixProviderSettings = PersistedReasonixProviderSettings;

export const DEFAULT_REASONIX_PROVIDER_SETTINGS: Readonly<PersistedReasonixProviderSettings> = Object.freeze({
  cliPath: '',
  cliPathsByHost: {},
  enabled: true,
  model: 'deepseek-v4-flash',
  systemPrompt: '',
});

function normalizeHostnameCliPaths(value: unknown): HostnameCliPaths {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const result: HostnameCliPaths = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' && entry.trim()) {
      result[key] = entry.trim();
    }
  }
  return result;
}

export function getReasonixProviderSettings(
  settings: Record<string, unknown>,
): ReasonixProviderSettings {
  const config = getProviderConfig(settings, 'reasonix');
  const normalizedCliPathsByHost = normalizeHostnameCliPaths(config.cliPathsByHost);
  const cliPathsByHost = Object.keys(normalizedCliPathsByHost).length > 0
    ? migrateLegacyHostnameKeyedMap(
      normalizedCliPathsByHost,
      getHostnameKey(),
      getHostnameKey(),
    )
    : normalizedCliPathsByHost;

  return {
    cliPath: (config.cliPath as string | undefined)
      ?? DEFAULT_REASONIX_PROVIDER_SETTINGS.cliPath,
    cliPathsByHost,
    enabled: (config.enabled as boolean | undefined)
      ?? DEFAULT_REASONIX_PROVIDER_SETTINGS.enabled,
    model: (config.model as string | undefined)
      ?? DEFAULT_REASONIX_PROVIDER_SETTINGS.model,
    systemPrompt: (config.systemPrompt as string | undefined)
      ?? DEFAULT_REASONIX_PROVIDER_SETTINGS.systemPrompt,
  };
}

export function updateReasonixProviderSettings(
  settings: Record<string, unknown>,
  updates: Partial<ReasonixProviderSettings>,
): ReasonixProviderSettings {
  const current = getReasonixProviderSettings(settings);
  const hostnameKey = getHostnameKey();

  const nextCliPathsByHost = 'cliPathsByHost' in updates
    ? normalizeHostnameCliPaths(updates.cliPathsByHost)
    : { ...current.cliPathsByHost };

  let nextCliPath = current.cliPath.trim();

  if ('cliPath' in updates && !('cliPathsByHost' in updates)) {
    const trimmedCliPath = typeof updates.cliPath === 'string' ? updates.cliPath.trim() : '';
    if (trimmedCliPath) {
      nextCliPathsByHost[hostnameKey] = trimmedCliPath;
    } else {
      delete nextCliPathsByHost[hostnameKey];
    }
    nextCliPath = '';
  }

  const next: ReasonixProviderSettings = {
    ...current,
    ...updates,
    cliPath: nextCliPath,
    cliPathsByHost: nextCliPathsByHost,
  };

  setProviderConfig(settings, 'reasonix', {
    cliPath: next.cliPath,
    cliPathsByHost: next.cliPathsByHost,
    enabled: next.enabled,
    model: next.model,
    systemPrompt: next.systemPrompt,
  });

  return next;
}
