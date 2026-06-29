# 非公式 OpenAI Academy 字幕ヘルパー

OpenAI Academy の動画を英語以外の言語でも見やすくするための、ローカル字幕生成・表示ツールです。

このプロジェクトは非公式のコミュニティプロジェクトです。OpenAI と提携、承認、後援されているものではありません。

言語: [English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

## 何ができますか？

- Chrome で OpenAI Academy の動画ページを検出します。
- 生成済みの翻訳字幕がローカルキャッシュにあれば自動で読み込みます。
- 字幕がない場合は Codex CLI を使ってローカルで翻訳字幕を生成します。
- 生成した翻訳字幕を Academy の動画プレイヤー上に直接表示します。
- 並列生成、生成のキャンセルと再開、進捗表示、推論の強さの選択、字幕サイズと位置の調整に対応します。

このツールは動画ファイルをダウンロードしません。このリポジトリには Academy コンテンツ、元字幕、翻訳字幕、字幕チャンク、抽出テキストは含まれていません。

## スクリーンショット

字幕生成中の拡張機能ポップアップ:

![字幕生成の進捗を表示する拡張機能ポップアップ](docs/images/extension-popup-progress.png)

Academy 動画上に表示される翻訳字幕:

![Academy 動画上に表示される翻訳字幕](docs/images/academy-subtitle-overlay.png)

## 対応言語

Chrome 拡張機能で選択できる翻訳先言語は次のとおりです。

- 韓国語
- 日本語
- 簡体字中国語
- スペイン語
- フランス語
- ドイツ語

既定の翻訳先言語は韓国語です。CLI ラッパーの `oash.bat` も既定では韓国語字幕を生成します。

## リポジトリ構成

```text
extension/      Chrome 拡張機能のソース
native-host/    Chrome Native Messaging ホスト
installer/      Windows のインストール・アンインストールスクリプト
scripts/        字幕生成スクリプト
viewer/         ローカル字幕オーバーレイとビューアーユーティリティ
subtitles/      ローカル出力・キャッシュフォルダー、Git では無視
```

## 必要なもの

- Windows
- Google Chrome
- `PATH` から実行できる Node.js
- インストールと認証が完了した Codex CLI
- `curl.exe`

最近の Windows には通常 `curl.exe` が含まれています。

## インストール

Windows インストーラーを実行します。

```bat
installer\windows\install.bat
```

その後、Chrome 拡張機能を手動で読み込みます。

1. Chrome で `chrome://extensions` を開きます。
2. デベロッパーモードを有効にします。
3. **Load unpacked** をクリックします。
4. このリポジトリの `extension` フォルダーを選択します。

インストーラーは、拡張機能の固定 ID に合わせて Native Messaging ホストを登録します。

## 使い方

1. OpenAI Academy の動画ページを開きます。
2. Chrome 拡張機能のポップアップを開きます。
3. `Target language` で翻訳先言語を選択します。
4. ローカルに翻訳字幕があれば自動で読み込まれます。
5. ローカル字幕がなければ **Generate** をクリックします。
6. 生成を止めるには **Cancel** をクリックします。
7. 保存済みチャンクから続けるには **Resume** をクリックします。
8. ポップアップで字幕サイズ、位置、色、背景の透明度、太字を調整します。

生成されたファイルは `subtitles/` またはローカルアプリキャッシュに保存され、Git に含まれないよう設定されています。

## CLI の使い方

CLI でも利用できます。このコマンドは既定で韓国語字幕を生成します。

```bat
oash.bat "https://academy.openai.com/home/videos/..."
```

別の言語で生成する場合は、PowerShell スクリプトを直接実行し、`-TargetLanguageCode` と `-TargetLanguageName` を指定します。
字幕生成は既定で 3 個の翻訳チャンクを並列処理します。調整する場合は `-ParallelJobs 1` から `-ParallelJobs 5` まで指定できます。

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\oash.ps1 `
  -Url "https://academy.openai.com/home/videos/..." `
  -OutDir subtitles `
  -TranslateWithCodex `
  -ParallelJobs 3 `
  -TargetLanguageCode ja `
  -TargetLanguageName Japanese
```

## コンテンツと字幕ファイル

次のファイルやコンテンツはコミットまたは再配布しないでください。

- OpenAI Academy の元字幕
- 翻訳された OpenAI Academy 字幕
- 字幕チャンク
- 抽出された Academy テキスト
- 動画ファイルまたはその他の Academy コンテンツ

このリポジトリはツールのコードのみを公開するためのものです。

## トラブルシューティング

- 拡張機能が動画を見つけられない場合は、Academy ページを再読み込みしてから再試行してください。
- 生成が途中で失敗した場合は、**Resume** で保存済みチャンクから続行できます。
- インストール後に拡張機能と Native Messaging ホストが合わない場合は、`installer\windows\install.bat` を再実行してください。
- Codex CLI が認証されていない場合、字幕生成は失敗します。先に Codex CLI の認証を完了してください。

## ライセンス

MIT
