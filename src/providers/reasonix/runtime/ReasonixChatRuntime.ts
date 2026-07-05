import type { App, TFile } from 'obsidian';

import type { ProviderCapabilities } from '../../../core/providers/types';
import type { ChatRuntime } from '../../../core/runtime/ChatRuntime';
import type {
  ApprovalCallback,
  AskUserQuestionCallback,
  AutoTurnCallback,
  ChatRewindMode,
  ChatRewindResult,
  ChatRuntimeConversationState,
  ChatRuntimeEnsureReadyOptions,
  ChatRuntimeQueryOptions,
  ChatTurnMetadata,
  ChatTurnRequest,
  ExitPlanModeCallback,
  PreparedChatTurn,
  SessionUpdateResult,
  SubagentRuntimeState,
} from '../../../core/runtime/types';
import type {
  ChatMessage,
  Conversation,
  SlashCommand,
  StreamChunk,
  ToolCallInfo,
} from '../../../core/types';
import type ClaudianPlugin from '../../../main';
import { getVaultPath } from '../../../utils/path';
import { REASONIX_PROVIDER_CAPABILITIES } from '../capabilities';
import { getReasonixProviderSettings } from '../settings';
import { ReasonrixCliResolver } from './ReasonrixCliResolver';
import { ReasonixSubprocess } from './ReasonixSubprocess';

const REASONIX_MODEL_PREFIX = 'reasonix/';

// Strip ANSI/VT terminal escape sequences (CSI, OSC, etc.)
const ANSI_ESCAPE_PATTERN = /\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[=>N7aMc]|\x1b[()][AB012]|\r/g;

function stripAnsiEscapes(text: string): string {
  return text.replace(ANSI_ESCAPE_PATTERN, '');
}

export interface ReasonixChatRuntimeOptions {
  cliResolver: ReasonrixCliResolver;
}

export class ReasonixChatRuntime implements ChatRuntime {
  readonly providerId = 'reasonix' as const;

  private cancelled = false;
  private currentTurnMetadata: ChatTurnMetadata = {};
  private proc: ReasonixSubprocess | null = null;
  private ready = false;
  private readonly readyListeners = new Set<(ready: boolean) => void>();
  private sessionId: string | null = null;
  private sessionInvalidated = false;

  constructor(
    private readonly plugin: ClaudianPlugin,
    private readonly options: ReasonixChatRuntimeOptions,
  ) {}

  getCapabilities(): Readonly<ProviderCapabilities> {
    return REASONIX_PROVIDER_CAPABILITIES;
  }

  prepareTurn(request: ChatTurnRequest): PreparedChatTurn {
    return {
      isCompact: false,
      mcpMentions: new Set(),
      persistedContent: '',
      prompt: request.text,
      request,
    };
  }

  onReadyStateChange(listener: (ready: boolean) => void): () => void {
    this.readyListeners.add(listener);
    return () => {
      this.readyListeners.delete(listener);
    };
  }

  setResumeCheckpoint(_checkpointId: string | undefined): void {}

  syncConversationState(conversation: ChatRuntimeConversationState | null): void {
    if (!conversation) {
      this.sessionId = null;
      this.sessionInvalidated = false;
      return;
    }
    this.sessionId = conversation.sessionId ?? null;
    this.sessionInvalidated = false;
  }

  async reloadMcpServers(): Promise<void> {}

  async ensureReady(options?: ChatRuntimeEnsureReadyOptions): Promise<boolean> {
    const settings = getReasonixProviderSettings(
      this.plugin.settings as unknown as Record<string, unknown>,
    );
    if (!settings.enabled) {
      this.setReady(false);
      return false;
    }

    const cliPath = this.options.cliResolver.resolveFromSettings(
      this.plugin.settings as unknown as Record<string, unknown>,
    );
    if (!cliPath) {
      this.setReady(false);
      return false;
    }

    this.setReady(true);
    return true;
  }

  async *query(
    turn: PreparedChatTurn,
    conversationHistory?: ChatMessage[],
    queryOptions?: ChatRuntimeQueryOptions,
  ): AsyncGenerator<StreamChunk> {
    this.currentTurnMetadata = {};
    this.cancelled = false;

    const settings = getReasonixProviderSettings(
      this.plugin.settings as unknown as Record<string, unknown>,
    );
    if (!settings.enabled) {
      yield { type: 'error', content: 'Reasonix is not enabled. Check the CLI path in settings.' };
      yield { type: 'done' };
      return;
    }

    const cliPath = this.options.cliResolver.resolveFromSettings(
      this.plugin.settings as unknown as Record<string, unknown>,
    );
    if (!cliPath) {
      yield { type: 'error', content: 'Could not find the reasonix CLI. Set the path in settings.' };
      yield { type: 'done' };
      return;
    }

    const cwd = getVaultPath(this.plugin.app) ?? process.cwd();
    const prompt = await this.buildPrompt(turn.request, conversationHistory);
    const model = this.resolveModel(settings.model, queryOptions);

    const args: string[] = ['run'];
    if (model) {
      args.push('--model', model);
    }

    yield { type: 'user_message_start', content: turn.request.text };
    yield { type: 'assistant_message_start' };

    try {
      const env = {
        ...process.env,
        TERM: 'dumb',
        NO_COLOR: '1',
        FORCE_COLOR: '0',
      };
      const launchSpec = {
        args,
        command: cliPath,
        cwd,
        env,
      };

      this.proc = new ReasonixSubprocess(launchSpec);
      this.proc.start();

      // Send the prompt via stdin
      this.proc.stdin.write(prompt);
      this.proc.stdin.end();

      // Read stdout and yield text chunks
      const stdout = this.proc.stdout;
      let buffer = '';

      const textQueue: string[] = [];
      let resolveChunk: ((chunk: string | null) => void) | null = null;
      let streamEnded = false;

      const enqueue = (text: string): void => {
        if (resolveChunk) {
          const fn = resolveChunk;
          resolveChunk = null;
          fn(text);
        } else {
          textQueue.push(text);
        }
      };

      stdout.on('data', (chunk: Buffer | string) => {
        const raw = typeof chunk === 'string' ? chunk : chunk.toString('utf-8');
        const text = stripAnsiEscapes(raw);
        if (text) {
          enqueue(text);
        }
      });

      stdout.on('end', () => {
        streamEnded = true;
        if (resolveChunk) {
          const fn = resolveChunk;
          resolveChunk = null;
          fn(null);
        }
      });

      const nextChunk = (): Promise<string | null> => {
        if (textQueue.length > 0) {
          return Promise.resolve(textQueue.shift()!);
        }
        if (streamEnded) {
          return Promise.resolve(null);
        }
        return new Promise<string | null>((resolve) => {
          resolveChunk = resolve;
        });
      };

      while (true) {
        if (this.cancelled) {
          break;
        }

        const text = await nextChunk();
        if (text === null) {
          break;
        }

        buffer += text;
        yield { type: 'text', content: text };
      }

      // Wait for process to exit
      await this.waitForExit();

      const exitError = this.proc?.getExitError();
      if (exitError && !this.cancelled) {
        const stderr = this.proc?.getStderrSnapshot() ?? '';
        const errorMsg = stderr ? `${exitError.message}\n\n${stderr}` : exitError.message;
        yield { type: 'error', content: errorMsg };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Reasonix request failed';
      const stderr = this.proc?.getStderrSnapshot() ?? '';
      const errorMsg = stderr ? `${message}\n\n${stderr}` : message;
      yield { type: 'error', content: errorMsg };
    } finally {
      await this.proc?.shutdown().catch(() => {});
      this.proc = null;
    }

    this.currentTurnMetadata.wasSent = true;
    yield { type: 'done' };
  }

  cancel(): void {
    this.cancelled = true;
    if (this.proc) {
      void this.proc.shutdown().catch(() => {});
    }
  }

  resetSession(): void {
    this.sessionInvalidated = true;
    this.sessionId = null;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  consumeSessionInvalidation(): boolean {
    const invalidated = this.sessionInvalidated;
    this.sessionInvalidated = false;
    return invalidated;
  }

  isReady(): boolean {
    return this.ready;
  }

  async getSupportedCommands(): Promise<SlashCommand[]> {
    return [];
  }

  getAuxiliaryModel(): string | null {
    return null;
  }

  cleanup(): void {
    if (this.proc) {
      void this.proc.shutdown().catch(() => {});
      this.proc = null;
    }
  }

  async rewind(
    _userMessageId: string,
    _assistantMessageId: string | undefined,
    _mode?: ChatRewindMode,
  ): Promise<ChatRewindResult> {
    return { canRewind: false };
  }

  setApprovalCallback(_callback: ApprovalCallback | null): void {}
  setApprovalDismisser(_dismisser: (() => void) | null): void {}
  setAskUserQuestionCallback(_callback: AskUserQuestionCallback | null): void {}
  setExitPlanModeCallback(_callback: ExitPlanModeCallback | null): void {}
  setPermissionModeSyncCallback(_callback: ((sdkMode: string) => void) | null): void {}
  setSubagentHookProvider(_getState: () => SubagentRuntimeState): void {}
  setAutoTurnCallback(_callback: AutoTurnCallback | null): void {}

  consumeTurnMetadata(): ChatTurnMetadata {
    const metadata = this.currentTurnMetadata;
    this.currentTurnMetadata = {};
    return metadata;
  }

  buildSessionUpdates(params: {
    conversation: Conversation | null;
    sessionInvalidated: boolean;
  }): SessionUpdateResult {
    const updates: Partial<Conversation> = {
      sessionId: this.sessionId,
    };

    if (params.sessionInvalidated && !this.sessionId) {
      updates.sessionId = null;
    }

    return { updates };
  }

  resolveSessionIdForFork(_conversation: Conversation | null): string | null {
    return null;
  }

  async loadSubagentToolCalls(_agentId: string): Promise<ToolCallInfo[]> {
    return [];
  }

  async loadSubagentFinalResult(_agentId: string): Promise<string | null> {
    return null;
  }

  // -- Private helpers --

  private resolveModel(
    settingsModel: string,
    queryOptions?: ChatRuntimeQueryOptions,
  ): string {
    const model = typeof queryOptions?.model === 'string'
      ? queryOptions.model
      : settingsModel;
    if (!model) {
      return '';
    }
    // Strip the provider prefix if present
    if (model.startsWith(REASONIX_MODEL_PREFIX)) {
      return model.slice(REASONIX_MODEL_PREFIX.length);
    }
    return model;
  }

  private async buildPrompt(
    request: ChatTurnRequest,
    conversationHistory?: ChatMessage[],
  ): Promise<string> {
    const settings = getReasonixProviderSettings(
      this.plugin.settings as unknown as Record<string, unknown>,
    );
    const parts: string[] = [];

    // System prompt
    if (settings.systemPrompt) {
      parts.push(settings.systemPrompt);
    }

    // Current note context
    const notePath = request.currentNotePath;
    if (notePath) {
      const noteTitle = this.extractNoteTitle(notePath);
      parts.push(`\n--- Context ---\nCurrent note: ${notePath}\nTitle: ${noteTitle}`);
    }

    // @file mentions
    const mentionContext = await this.resolveMentions(request.text);
    if (mentionContext) {
      parts.push(mentionContext);
    }

    // Conversation history (previous messages in this conversation)
    if (conversationHistory && conversationHistory.length > 0) {
      const historyText = conversationHistory
        .map(msg => {
          const role = msg.role === 'user' ? 'User' : 'Assistant';
          const content = msg.displayContent ?? msg.content ?? '';
          return `${role}: ${content}`;
        })
        .join('\n\n');
      parts.push(`\n--- Conversation History ---\n${historyText}`);
    }

    // User's message
    parts.push(`\n--- User Message ---\n${request.text}`);

    return parts.join('\n');
  }

  private extractNoteTitle(notePath: string): string {
    const basename = notePath.split(/[/\\]/).pop() ?? notePath;
    return basename.replace(/\.[^.]+$/, '');
  }

  private async resolveMentions(text: string): Promise<string | null> {
    const mentionPattern = /@([^\s@]+)/g;
    const matches = [...text.matchAll(mentionPattern)];
    if (matches.length === 0) {
      return null;
    }

    const app: App = this.plugin.app;
    const fileContents: string[] = [];

    for (const match of matches) {
      const fileName = match[1];
      const file = this.findFileByName(app, fileName);
      if (file) {
        try {
          const content = await app.vault.read(file);
          fileContents.push(`\n@${fileName}:\n${content}`);
        } catch {
          // Skip files that can't be read
        }
      }
    }

    return fileContents.length > 0
      ? `\n--- Referenced Files ---${fileContents.join('\n')}`
      : null;
  }

  private findFileByName(app: App, fileName: string): TFile | null {
    const allFiles = app.vault.getMarkdownFiles();
    // Try exact match first
    let file = allFiles.find(f => f.name === fileName || f.name === `${fileName}.md`) ?? null;
    if (file) {
      return file;
    }
    // Try path contains match
    file = allFiles.find(f => f.path.includes(fileName)) ?? null;
    return file;
  }

  private async waitForExit(): Promise<void> {
    if (!this.proc) {
      return;
    }
    // The subprocess doesn't expose a direct exit promise, so we poll briefly.
    // This is simpler than rewiring the subprocess event system.
    const maxWait = 30_000;
    const start = Date.now();
    while (this.proc.isAlive() && Date.now() - start < maxWait) {
      await new Promise(resolve => window.setTimeout(resolve, 50));
    }
  }

  private setReady(ready: boolean): void {
    if (this.ready === ready) {
      return;
    }
    this.ready = ready;
    for (const listener of this.readyListeners) {
      listener(ready);
    }
  }
}
