import type {
  TitleGenerationService,
  TitleGenerationResult,
  TitleGenerationCallback,
} from '../../../core/providers/types';

export class ReasonixTitleGenerationService implements TitleGenerationService {
  async generateTitle(
    _conversationId: string,
    _userMessage: string,
    callback: TitleGenerationCallback,
  ): Promise<void> {
    const now = new Date();
    const title = now.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const result: TitleGenerationResult = { success: true, title };
    await callback(_conversationId, result);
  }

  cancel(): void {}
}
