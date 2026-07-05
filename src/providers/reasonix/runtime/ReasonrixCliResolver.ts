import { findCliBinaryPath, resolveConfiguredCliPath } from '../../../utils/cliBinaryLocator';
import { getHostnameKey } from '../../../utils/env';
import { getReasonixProviderSettings } from '../settings';

export class ReasonrixCliResolver {
  private readonly cachedHostname = getHostnameKey();
  private lastCliPath = '';
  private lastHostnamePath = '';
  private resolvedPath: string | null = null;

  resolveFromSettings(settings: Record<string, unknown>): string | null {
    const rxSettings = getReasonixProviderSettings(settings);
    const cliPath = rxSettings.cliPath.trim();
    const hostnamePath = (rxSettings.cliPathsByHost[this.cachedHostname] ?? '').trim();

    if (
      this.resolvedPath !== null
      && cliPath === this.lastCliPath
      && hostnamePath === this.lastHostnamePath
    ) {
      return this.resolvedPath;
    }

    this.lastCliPath = cliPath;
    this.lastHostnamePath = hostnamePath;
    this.resolvedPath = this.resolve(rxSettings.cliPathsByHost);
    return this.resolvedPath;
  }

  private resolve(hostnamePaths: Record<string, string>): string | null {
    const hostnamePath = (hostnamePaths[this.cachedHostname] ?? '').trim();
    return resolveConfiguredCliPath(hostnamePath)
      ?? findCliBinaryPath('reasonix');
  }

  reset(): void {
    this.lastCliPath = '';
    this.lastHostnamePath = '';
    this.resolvedPath = null;
  }
}
