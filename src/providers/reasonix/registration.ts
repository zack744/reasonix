import type { ProviderRegistration } from '../../core/providers/types';
import { ReasonixInlineEditService } from './auxiliary/ReasonixInlineEditService';
import { ReasonixInstructionRefineService } from './auxiliary/ReasonixInstructionRefineService';
import { ReasonixTaskResultInterpreter } from './auxiliary/ReasonixTaskResultInterpreter';
import { ReasonixTitleGenerationService } from './auxiliary/ReasonixTitleGenerationService';
import { REASONIX_PROVIDER_CAPABILITIES } from './capabilities';
import { reasonixSettingsReconciler } from './settingsReconciler';
import { ReasonixConversationHistoryService } from './history/ReasonixConversationHistoryService';
import { ReasonixChatRuntime } from './runtime/ReasonixChatRuntime';
import { ReasonrixCliResolver } from './runtime/ReasonrixCliResolver';
import { getReasonixProviderSettings } from './settings';
import { reasonixChatUIConfig } from './ui/ReasonixChatUIConfig';

const sharedCliResolver = new ReasonrixCliResolver();

export const reasonixProviderRegistration: ProviderRegistration = {
  blankTabOrder: 1,
  capabilities: REASONIX_PROVIDER_CAPABILITIES,
  chatUIConfig: reasonixChatUIConfig,
  createInlineEditService: () => new ReasonixInlineEditService(),
  createInstructionRefineService: () => new ReasonixInstructionRefineService(),
  createRuntime: ({ plugin }) => new ReasonixChatRuntime(plugin, {
    cliResolver: sharedCliResolver,
  }),
  createTitleGenerationService: () => new ReasonixTitleGenerationService(),
  displayName: 'Reasonix',
  historyService: new ReasonixConversationHistoryService(),
  isEnabled: (settings) => getReasonixProviderSettings(settings).enabled,
  settingsReconciler: reasonixSettingsReconciler,
  taskResultInterpreter: new ReasonixTaskResultInterpreter(),
};
