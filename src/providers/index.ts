import { ProviderRegistry } from '../core/providers/ProviderRegistry';
import { ProviderWorkspaceRegistry } from '../core/providers/ProviderWorkspaceRegistry';
import { reasonixWorkspaceRegistration } from './reasonix/app/ReasonixWorkspaceServices';
import { reasonixProviderRegistration } from './reasonix/registration';

let builtInProvidersRegistered = false;

export function registerBuiltInProviders(): void {
  if (builtInProvidersRegistered) {
    return;
  }

  ProviderRegistry.register('reasonix', reasonixProviderRegistration);
  ProviderWorkspaceRegistry.register('reasonix', reasonixWorkspaceRegistration);
  builtInProvidersRegistered = true;
}

registerBuiltInProviders();
