# Unofficial OpenAI Academy Subtitle Helper

Local subtitle generation and display tooling for OpenAI Academy videos.

This is an unofficial community project. It is not affiliated with, endorsed by, or sponsored by OpenAI.

Languages: [English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

> Current status: Windows only. macOS and Linux are not supported yet.

## What It Does

- Detects OpenAI Academy video pages in Chrome.
- Loads translated subtitles from a local cache when available.
- Generates translated subtitles locally through the Codex CLI when subtitles are missing.
- Displays translated subtitles directly over the Academy video player.
- Supports target language selection, reasoning effort, parallel generation, cancel/resume, progress display, subtitle styling, and Y-position adjustment.

Supported target languages in the extension:

- Korean
- Japanese
- Chinese Simplified
- Spanish
- French
- German

The tool does not download video files and this repository does not include Academy content, source subtitles, generated subtitles, translated subtitles, or translation chunks.

## Screenshots

Extension popup during subtitle generation:

![Extension popup showing generation progress](docs/images/extension-popup-progress.png)

Translated subtitle overlay on an Academy video:

![Translated subtitle overlay on an Academy video](docs/images/academy-subtitle-overlay.png)

## Repository Layout

```text
extension/      Chrome extension source
native-host/    Chrome native messaging host
installer/      Windows install/uninstall scripts
scripts/        Subtitle generation scripts
viewer/         Local subtitle overlay/viewer utilities
subtitles/      Local output/cache folder, ignored by Git
```

See [RELEASE_NOTES.md](RELEASE_NOTES.md) for version history.

## Requirements

- Windows
- Google Chrome
- Node.js available in `PATH`
- Codex CLI installed and authenticated
- `curl.exe`, included in recent Windows versions

## Install

Run the Windows installer:

```bat
installer\windows\install.bat
```

Then load the Chrome extension:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click **Load unpacked**.
4. Select the `extension` folder from this repository.

The installer registers the native messaging host for the extension's stable ID.

## Use

1. Open an OpenAI Academy video page.
2. Open the extension popup.
3. If a local translated subtitle exists, it is loaded automatically.
4. If no local subtitle exists, click **Generate**.
5. Use **Cancel** to stop generation and **Resume** to continue from completed chunks.
6. Adjust subtitle style and Y position from the popup.

Generated files are written under `subtitles/` or the local app cache and are intentionally ignored by Git.

## CLI

The CLI workflow is also available and defaults to Korean:

```bat
oash.bat "https://academy.openai.com/home/videos/..."
```

For other target languages, use `scripts\oash.ps1` directly with `-TargetLanguageCode` and `-TargetLanguageName`.
The generator runs 5 translation chunks in parallel by default. Use `-ParallelJobs 1` through `-ParallelJobs 10` to tune it.

## Content And Subtitle Files

Do not commit or redistribute:

- Original Academy subtitles
- Translated Academy subtitles
- Subtitle chunks
- Extracted Academy text
- Video files or other Academy content

This repository is intended to publish the tool code only.

## License

MIT
