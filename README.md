# Reasonix

An Obsidian plugin that embeds the local [Reasonix CLI](https://github.com/nicepkg/reasonix) (DeepSeek terminal agent) as an AI collaborator in your vault. Your vault becomes its working directory — it can read notes, write files, and assist with knowledge management tasks directly from the sidebar.

## Features

- **Sidebar Chat** — Stream responses from DeepSeek models directly in Obsidian's sidebar
- **Vault Context** — Automatically sends the current note's path and title as context
- **@ Mentions** — Reference other notes with `@filename` to include their content in the prompt
- **Non-Interactive Mode** — Uses `reasonix run` for clean, streaming text output without TUI interference
- **Per-Host CLI Path** — Configure different Reasonix CLI paths for different machines
- **Model Selection** — Switch between DeepSeek models (deepseek-v4-flash, deepseek-v4-pro, etc.)

## Prerequisites

1. [Obsidian](https://obsidian.md/) (v1.7.2+)
2. [Reasonix CLI](https://github.com/nicepkg/reasonix) installed and configured
   - Install via npm: `npm install -g reasonix`
   - Run `reasonix setup` to configure your API key and model preferences

## Installation

### From Release

1. Download `main.js`, `styles.css`, and `manifest.json` from the [latest release](https://github.com/zack744/reasonix/releases)
2. Create a folder `reasonix` in your vault's `.obsidian/plugins/` directory
3. Copy the three files into that folder
4. Open Obsidian → Settings → Community plugins → Enable "Reasonix"

### From Source

```bash
git clone https://github.com/zack744/reasonix.git
cd reasonix
npm install
npm run build
```

Copy `main.js`, `styles.css`, and `manifest.json` to your vault's `.obsidian/plugins/reasonix/` folder.

## Configuration

After enabling the plugin, go to **Settings → Reasonix**:

- **Enable** — Toggle the plugin on/off
- **CLI Path** — Path to the `reasonix` executable. Leave empty to use PATH lookup. On Windows, you may need to specify the full path (e.g., `E:\npm-global\reasonix.cmd`)
- **Model** — DeepSeek model to use (e.g., `deepseek-v4-flash`, `deepseek-v4-pro`)
- **System Prompt** — Optional custom system prompt prepended to each message

## Usage

1. Click the robot icon in the left ribbon to open the chat panel
2. The current note's path and title are automatically included as context
3. Type your message and press Enter
4. Use `@filename` to reference other notes — their content will be included in the prompt

Example: `@project-notes summarize the key points from this note`

## Development

```bash
# Install dependencies
npm install

# Watch mode (auto-rebuild on file change)
npm run dev

# Production build
npm run build

# Type check
npm run typecheck
```

For auto-copy to your vault during development, create a `.env.local` file:

```
OBSIDIAN_VAULT=/path/to/your/vault
```

## Tech Stack

- **TypeScript** + **esbuild** for bundling
- **Obsidian Plugin API** for UI integration
- **child_process.spawn** for CLI subprocess management
- Provider abstraction layer (simplified from Claudian's multi-provider architecture)

## License

[MIT](LICENSE)

## Acknowledgements

This project is based on [Claudian](https://github.com/YishenTu/claudian) by Yishen Tu, licensed under the MIT License. Reasonix simplifies the architecture to focus solely on the Reasonix/DeepSeek CLI as the sole AI provider.
