# Release Notes

## 0.0.2 - 2026-06-30

### Changed

- Default subtitle generation now uses `reasoningEffort=low`, `parallelJobs=5`, and `chunkSize=75`.
- The popup now lets users choose chunk size: `25`, `50`, `75`, or `100`.
- The popup now lets users choose up to `10` parallel jobs.
- The popup now includes a delete subtitles action for rebuilding cached subtitles with different generation settings.
- The Generate button is disabled when cached subtitles already exist for the selected video and language.
- Existing saved generation defaults are migrated once so older default settings move to the new defaults.
- Progress labels no longer show polling details such as "checked just now" or "next check in 1s".
- Progress metadata writes now retry through a temporary file to avoid failures when the popup polls `progress.json`.
- Resume now uses the saved video id for cancelled generations, so it does not require the video iframe to answer before continuing.
- Video frame registration is refreshed over time to handle delayed iframe loads and Academy page navigation.

### Notes

- Reload the unpacked Chrome extension after updating.
- Re-run `installer\windows\install.bat` so Chrome Native Messaging uses the updated native host and generator script.
