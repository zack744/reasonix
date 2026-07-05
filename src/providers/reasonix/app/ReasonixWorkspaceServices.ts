import { ProviderWorkspaceRegistry } from '../../../core/providers/ProviderWorkspaceRegistry';
import type {
  ProviderWorkspaceRegistration,
  ProviderWorkspaceServices,
} from '../../../core/providers/types';
import { ReasonrixCliResolver } from '../runtime/ReasonrixCliResolver';
import { reasonixSettingsTabRenderer } from '../ui/ReasonixSettingsTab';

export interface ReasonixWorkspaceServices extends ProviderWorkspaceServices {}

export async function createReasonixWorkspaceServices(): Promise<ReasonixWorkspaceServices> {
  return {
    cliResolver: new ReasonrixCliResolver(),
    settingsTabRenderer: reasonixSettingsTabRenderer,
  };
}

export const reasonixWorkspaceRegistration: ProviderWorkspaceRegistration<ReasonixWorkspaceServices> = {
  initialize: async () => createReasonixWorkspaceServices(),
};

export function maybeGetReasonixWorkspaceServices(): ReasonixWorkspaceServices | null {
  return ProviderWorkspaceRegistry.getServices('reasonix') as ReasonixWorkspaceServices | null;
}
