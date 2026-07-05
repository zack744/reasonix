import type {
  InlineEditRequest,
  InlineEditResult,
  InlineEditService,
} from '../../../core/providers/types';

export class ReasonixInlineEditService implements InlineEditService {
  resetConversation(): void {}

  async editText(_request: InlineEditRequest): Promise<InlineEditResult> {
    return {
      success: false,
      error: 'Inline edit is not supported by Reasonix.',
    };
  }

  async continueConversation(_message: string, _contextFiles?: string[]): Promise<InlineEditResult> {
    return {
      success: false,
      error: 'Inline edit is not supported by Reasonix.',
    };
  }

  cancel(): void {}
}
