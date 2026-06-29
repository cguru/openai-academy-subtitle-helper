# 非官方 OpenAI Academy 字幕助手

这是一个本地字幕生成和显示工具，用来让 OpenAI Academy 视频更容易以英语以外的语言观看。

本项目是非官方社区项目。它不隶属于 OpenAI，也未获得 OpenAI 的认可、背书或赞助。

语言: [English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

## 它能做什么？

- 在 Chrome 中检测 OpenAI Academy 视频页面。
- 如果本地缓存中已有翻译字幕，会自动加载。
- 如果没有字幕，会通过 Codex CLI 在本地生成翻译字幕。
- 将生成的翻译字幕直接显示在 Academy 视频播放器上。
- 支持并行生成、取消和继续生成、进度显示、推理强度选择、字幕大小和位置调整。

此工具不会下载视频文件。本仓库不包含 Academy 内容、原始字幕、翻译字幕、字幕片段或提取文本。

## 截图

字幕生成过程中的扩展弹窗:

![显示字幕生成进度的扩展弹窗](docs/images/extension-popup-progress.png)

显示在 Academy 视频上的翻译字幕:

![显示在 Academy 视频上的翻译字幕](docs/images/academy-subtitle-overlay.png)

## 支持的语言

Chrome 扩展中可选择的目标翻译语言如下。

- 韩语
- 日语
- 简体中文
- 西班牙语
- 法语
- 德语

默认目标语言是韩语。CLI 包装脚本 `oash.bat` 默认也会生成韩语字幕。

## 仓库结构

```text
extension/      Chrome 扩展源代码
native-host/    Chrome Native Messaging 主机
installer/      Windows 安装和卸载脚本
scripts/        字幕生成脚本
viewer/         本地字幕叠加层和查看器工具
subtitles/      本地输出和缓存文件夹，已被 Git 忽略
```

## 要求

- Windows
- Google Chrome
- 可从 `PATH` 运行的 Node.js
- 已安装并完成认证的 Codex CLI
- `curl.exe`

较新的 Windows 通常已经包含 `curl.exe`。

## 安装

运行 Windows 安装脚本。

```bat
installer\windows\install.bat
```

然后手动加载 Chrome 扩展。

1. 在 Chrome 中打开 `chrome://extensions`。
2. 启用开发者模式。
3. 点击 **Load unpacked**。
4. 选择本仓库中的 `extension` 文件夹。

安装脚本会根据扩展的固定 ID 注册 Native Messaging 主机。

## 使用方法

1. 打开 OpenAI Academy 视频页面。
2. 打开 Chrome 扩展弹窗。
3. 在 `Target language` 中选择目标翻译语言。
4. 如果本地已有翻译字幕，会自动加载。
5. 如果没有本地字幕，点击 **Generate**。
6. 生成过程中如需停止，点击 **Cancel**。
7. 如需从已保存的片段继续生成，点击 **Resume**。
8. 在弹窗中调整字幕大小、位置、颜色、背景透明度和粗体。

生成的文件会保存到 `subtitles/` 或本地应用缓存中，并已配置为不会提交到 Git。

## CLI 使用

也可以使用 CLI。此命令默认生成韩语字幕。

```bat
oash.bat "https://academy.openai.com/home/videos/..."
```

如需生成其他语言，请直接运行 PowerShell 脚本，并指定 `-TargetLanguageCode` 和 `-TargetLanguageName`。
字幕生成默认并行处理 3 个翻译片段。可通过 `-ParallelJobs 1` 到 `-ParallelJobs 5` 调整。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\oash.ps1 `
  -Url "https://academy.openai.com/home/videos/..." `
  -OutDir subtitles `
  -TranslateWithCodex `
  -ParallelJobs 3 `
  -TargetLanguageCode ja `
  -TargetLanguageName Japanese
```

## 内容和字幕文件

请不要提交或重新分发以下文件或内容。

- OpenAI Academy 原始字幕
- 翻译后的 OpenAI Academy 字幕
- 字幕片段
- 提取的 Academy 文本
- 视频文件或其他 Academy 内容

本仓库只用于公开工具代码。

## 故障排查

- 如果扩展找不到视频，请刷新 Academy 页面后重试。
- 如果生成中途失败，可以使用 **Resume** 从已保存的片段继续。
- 如果安装后扩展和 Native Messaging 主机不匹配，请重新运行 `installer\windows\install.bat`。
- 如果 Codex CLI 尚未认证，字幕生成会失败。请先完成 Codex CLI 认证。

## 许可证

MIT
