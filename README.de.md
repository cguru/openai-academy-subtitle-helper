# Inoffizieller OpenAI Academy Subtitle Helper

Lokales Tool zum Erzeugen und Anzeigen von Untertiteln, damit OpenAI Academy-Videos leichter in anderen Sprachen als Englisch angesehen werden können.

Dieses Projekt ist ein inoffizielles Community-Projekt. Es ist nicht mit OpenAI verbunden und wird nicht von OpenAI empfohlen oder gesponsert.

Sprachen: [English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

> Aktueller Stand: nur Windows. macOS und Linux werden noch nicht unterstützt.

## Was macht das Tool?

- Erkennt OpenAI Academy-Videoseiten in Chrome.
- Lädt vorhandene übersetzte Untertitel automatisch aus dem lokalen Cache.
- Wenn keine Untertitel vorhanden sind, erzeugt es lokal übersetzte Untertitel über die Codex CLI.
- Zeigt die übersetzten Untertitel direkt über dem Academy-Videoplayer an.
- Unterstützt parallele Erzeugung, Abbrechen und Fortsetzen, Fortschrittsanzeige, Auswahl des Reasoning-Aufwands sowie Anpassung von Untertitelgröße und Position.

Das Tool lädt keine Videodateien herunter. Dieses Repository enthält keine Academy-Inhalte, Originaluntertitel, übersetzten Untertitel, Untertitel-Chunks oder extrahierten Texte.

## Screenshots

Erweiterungs-Popup während der Untertitelerzeugung:

![Erweiterungs-Popup mit Fortschritt der Untertitelerzeugung](docs/images/extension-popup-progress.png)

Übersetzte Untertitel auf einem Academy-Video:

![Übersetzte Untertitel auf einem Academy-Video](docs/images/academy-subtitle-overlay.png)

## Unterstützte Sprachen

In der Chrome-Erweiterung können folgende Zielsprachen gewählt werden.

- Koreanisch
- Japanisch
- Chinesisch, vereinfacht
- Spanisch
- Französisch
- Deutsch

Die Standardsprache ist Koreanisch. Der CLI-Wrapper `oash.bat` erzeugt standardmäßig ebenfalls koreanische Untertitel.

## Repository-Struktur

```text
extension/      Quellcode der Chrome-Erweiterung
native-host/    Chrome Native Messaging Host
installer/      Windows-Installations- und Deinstallationsskripte
scripts/        Skripte zur Untertitelerzeugung
viewer/         Lokale Untertitel-Overlay- und Viewer-Hilfsprogramme
subtitles/      Lokaler Ausgabe- und Cache-Ordner, von Git ignoriert
```

## Anforderungen

- Windows
- Google Chrome
- Node.js im `PATH`
- Installierte und authentifizierte Codex CLI
- `curl.exe`

Aktuelle Windows-Versionen enthalten normalerweise `curl.exe`.

## Installation

Führe den Windows-Installer aus.

```bat
installer\windows\install.bat
```

Lade danach die Chrome-Erweiterung manuell.

1. Öffne `chrome://extensions` in Chrome.
2. Aktiviere den Entwicklermodus.
3. Klicke auf **Load unpacked**.
4. Wähle den Ordner `extension` aus diesem Repository.

Der Installer registriert den Native Messaging Host für die stabile ID der Erweiterung.

## Verwendung

1. Öffne eine OpenAI Academy-Videoseite.
2. Öffne das Popup der Chrome-Erweiterung.
3. Wähle unter `Target language` die Zielsprache.
4. Wenn lokal übersetzte Untertitel vorhanden sind, werden sie automatisch geladen.
5. Wenn keine lokalen Untertitel vorhanden sind, klicke auf **Generate**.
6. Zum Anhalten der Erzeugung klicke auf **Cancel**.
7. Zum Fortsetzen aus gespeicherten Chunks klicke auf **Resume**.
8. Passe Größe, Position, Farbe, Hintergrunddeckkraft und Fettschrift im Popup an.

Erzeugte Dateien werden unter `subtitles/` oder im lokalen App-Cache gespeichert und sind so konfiguriert, dass sie nicht in Git aufgenommen werden.

## CLI-Verwendung

Der CLI-Workflow ist ebenfalls verfügbar. Dieser Befehl erzeugt standardmäßig koreanische Untertitel.

```bat
oash.bat "https://academy.openai.com/home/videos/..."
```

Für andere Sprachen führe das PowerShell-Skript direkt aus und setze `-TargetLanguageCode` sowie `-TargetLanguageName`.
Die Erzeugung verarbeitet standardmäßig 5 Übersetzungs-Chunks parallel. Du kannst den Wert mit `-ParallelJobs 1` bis `-ParallelJobs 10` anpassen.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\oash.ps1 `
  -Url "https://academy.openai.com/home/videos/..." `
  -OutDir subtitles `
  -TranslateWithCodex `
  -ParallelJobs 5 `
  -TargetLanguageCode ja `
  -TargetLanguageName Japanese
```

## Inhalte und Untertiteldateien

Bitte nicht committen oder weiterverteilen:

- Originaluntertitel von OpenAI Academy
- Übersetzte OpenAI Academy-Untertitel
- Untertitel-Chunks
- Extrahierter Academy-Text
- Videodateien oder andere Academy-Inhalte

Dieses Repository ist nur zur Veröffentlichung des Tool-Codes gedacht.

## Fehlerbehebung

- Wenn die Erweiterung das Video nicht findet, lade die Academy-Seite neu und versuche es erneut.
- Wenn die Erzeugung unterwegs fehlschlägt, kannst du mit **Resume** aus gespeicherten Chunks fortsetzen.
- Wenn Erweiterung und Native Messaging Host nach der Installation nicht zusammenpassen, führe `installer\windows\install.bat` erneut aus.
- Wenn die Codex CLI nicht authentifiziert ist, schlägt die Untertitelerzeugung fehl. Authentifiziere zuerst die Codex CLI.

## Lizenz

MIT
