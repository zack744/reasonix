import type {
  InstructionRefineResult,
  InstructionRefineService,
} from '../../../core/providers/types';

export class ReasonixInstructionRefineService implements InstructionRefineService {
  resetConversation(): void {}

  async refineInstruction(
    rawInstruction: string,
  ): Promise<InstructionRefineResult> {
    return {
      refinedInstruction: rawInstruction,
      clarifyingQuestion: undefined,
    };
  }

  async continueConversation(_message: string): Promise<InstructionRefineResult> {
    return {
      refinedInstruction: '',
      clarifyingQuestion: undefined,
    };
  }

  cancel(): void {}
}
