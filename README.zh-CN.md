# Reasonix

[English](README.md) | 简体中文

将本地 [Reasonix CLI](https://github.com/nicepkg/reasonix)（DeepSeek 终端 Agent）嵌入 Obsidian 的 AI 协作插件。你的笔记仓库就是它的工作目录——它可以读取笔记、编写文件，直接在侧边栏协助你进行知识管理。

## 功能

- **侧边栏聊天** — 在 Obsidian 侧边栏中流式输出 DeepSeek 模型的回复
- **笔记上下文** — 自动将当前笔记的路径和标题作为上下文发送
- **@ 引用** — 用 `@文件名` 引用其他笔记，将其内容包含在提示词中
- **非交互模式** — 使用 `reasonix run` 获取纯净的流式文本输出，无 TUI 干扰
- **多机器配置** — 为不同机器配置不同的 Reasonix CLI 路径
- **模型切换** — 支持 DeepSeek 各模型（deepseek-v4-flash、deepseek-v4-pro 等）

## 前置要求

1. [Obsidian](https://obsidian.md/) 桌面版（v1.7.2+）
2. [Reasonix CLI](https://github.com/nicepkg/reasonix) 已安装并配置
   - npm 安装：`npm install -g reasonix`
   - 运行 `reasonix setup` 配置 API Key 和模型偏好

## 安装

### 方式一：下载 Release

1. 从 [最新发布](https://github.com/zack744/reasonix/releases) 下载 `main.js`、`styles.css` 和 `manifest.json`
2. 在你的仓库 `.obsidian/plugins/` 目录下创建 `reasonix` 文件夹
3. 将三个文件复制到该文件夹中
4. 打开 Obsidian → 设置 → 第三方插件 → 启用「Reasonix」

### 方式二：从源码构建

```bash
git clone https://github.com/zack744/reasonix.git
cd reasonix
npm install
npm run build
```

将 `main.js`、`styles.css` 和 `manifest.json` 复制到仓库的 `.obsidian/plugins/reasonix/` 文件夹中。

## 配置

启用插件后，进入 **设置 → Reasonix**：

- **启用** — 开关插件
- **CLI 路径** — `reasonix` 可执行文件路径。留空则自动从 PATH 查找。Windows 上可能需要填写完整路径（如 `E:\npm-global\reasonix.cmd`）
- **模型** — 使用的 DeepSeek 模型（如 `deepseek-v4-flash`、`deepseek-v4-pro`）
- **系统提示词** — 可选，每条消息前附加的自定义系统提示

## 使用方法

1. 点击左侧栏的机器人图标打开聊天面板
2. 当前笔记的路径和标题会自动作为上下文发送
3. 输入消息并按回车发送
4. 使用 `@文件名` 引用其他笔记——其内容会被包含在提示词中

示例：`@项目笔记 总结一下这篇笔记的要点`

## 开发

```bash
# 安装依赖
npm install

# 监听模式（文件变更自动重新构建）
npm run dev

# 生产构建
npm run build

# 类型检查
npm run typecheck
```

开发时如需自动复制到仓库，创建 `.env.local` 文件：

```
OBSIDIAN_VAULT=/path/to/your/vault
```

## 技术栈

- **TypeScript** + **esbuild** 打包
- **Obsidian 插件 API** 界面集成
- **child_process.spawn** CLI 子进程管理
- Provider 抽象层（从 Claudian 多 Provider 架构简化而来）

## 许可证

[MIT](LICENSE)

## 鸣谢

本项目基于 [Claudian](https://github.com/YishenTu/claudian)（作者 Yishen Tu，MIT 许可）二次开发。Reasonix 简化了架构，专注于将 Reasonix/DeepSeek CLI 作为唯一 AI 提供方。
