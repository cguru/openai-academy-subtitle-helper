# Assistant non officiel de sous-titres pour OpenAI Academy

Outil local de génération et d'affichage de sous-titres, conçu pour regarder plus facilement les vidéos OpenAI Academy dans des langues autres que l'anglais.

Ce projet est un projet communautaire non officiel. Il n'est pas affilié à OpenAI, ni approuvé, ni sponsorisé par OpenAI.

Langues: [English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

## Que fait cet outil ?

- Détecte les pages vidéo OpenAI Academy dans Chrome.
- Charge automatiquement les sous-titres traduits depuis le cache local lorsqu'ils existent.
- Si aucun sous-titre n'est disponible, génère localement des sous-titres traduits avec Codex CLI.
- Affiche les sous-titres traduits directement sur le lecteur vidéo Academy.
- Prend en charge la génération parallèle, l'annulation et la reprise, l'affichage de la progression, le choix de l'effort de raisonnement, ainsi que les réglages de taille et de position des sous-titres.

L'outil ne télécharge pas les fichiers vidéo. Ce dépôt ne contient aucun contenu Academy, sous-titre source, sous-titre traduit, fragment de sous-titre ou texte extrait.

## Captures d'écran

Popup de l'extension pendant la génération des sous-titres:

![Popup de l'extension affichant la progression de génération](docs/images/extension-popup-progress.png)

Sous-titres traduits affichés sur une vidéo Academy:

![Sous-titres traduits affichés sur une vidéo Academy](docs/images/academy-subtitle-overlay.png)

## Langues prises en charge

Les langues cibles disponibles dans l'extension Chrome sont les suivantes.

- Coréen
- Japonais
- Chinois simplifié
- Espagnol
- Français
- Allemand

La langue cible par défaut est le coréen. Le wrapper CLI `oash.bat` génère aussi des sous-titres coréens par défaut.

## Structure du dépôt

```text
extension/      Source de l'extension Chrome
native-host/    Hôte Chrome Native Messaging
installer/      Scripts d'installation et de désinstallation Windows
scripts/        Scripts de génération de sous-titres
viewer/         Utilitaires d'overlay et de visionneuse locale de sous-titres
subtitles/      Dossier local de sortie et de cache, ignoré par Git
```

## Prérequis

- Windows
- Google Chrome
- Node.js disponible dans `PATH`
- Codex CLI installé et authentifié
- `curl.exe`

Les versions récentes de Windows incluent généralement `curl.exe`.

## Installation

Exécutez l'installateur Windows.

```bat
installer\windows\install.bat
```

Chargez ensuite l'extension Chrome manuellement.

1. Ouvrez `chrome://extensions` dans Chrome.
2. Activez le mode développeur.
3. Cliquez sur **Load unpacked**.
4. Sélectionnez le dossier `extension` de ce dépôt.

L'installateur enregistre l'hôte Native Messaging pour l'ID stable de l'extension.

## Utilisation

1. Ouvrez une page vidéo OpenAI Academy.
2. Ouvrez la popup de l'extension Chrome.
3. Choisissez la langue dans `Target language`.
4. Si des sous-titres traduits existent localement, ils sont chargés automatiquement.
5. S'il n'y a pas de sous-titres locaux, cliquez sur **Generate**.
6. Pour arrêter la génération, cliquez sur **Cancel**.
7. Pour reprendre depuis les fragments enregistrés, cliquez sur **Resume**.
8. Réglez la taille, la position, la couleur, l'opacité du fond et le gras dans la popup.

Les fichiers générés sont écrits dans `subtitles/` ou dans le cache local de l'application, et sont configurés pour ne pas être inclus dans Git.

## Utilisation en CLI

Le flux CLI est également disponible. Cette commande génère des sous-titres coréens par défaut.

```bat
oash.bat "https://academy.openai.com/home/videos/..."
```

Pour générer une autre langue, exécutez directement le script PowerShell avec `-TargetLanguageCode` et `-TargetLanguageName`.
La génération traite 3 fragments de traduction en parallèle par défaut. Vous pouvez ajuster cette valeur avec `-ParallelJobs 1` à `-ParallelJobs 5`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\oash.ps1 `
  -Url "https://academy.openai.com/home/videos/..." `
  -OutDir subtitles `
  -TranslateWithCodex `
  -ParallelJobs 3 `
  -TargetLanguageCode ja `
  -TargetLanguageName Japanese
```

## Contenu et fichiers de sous-titres

Ne commitez pas et ne redistribuez pas:

- Les sous-titres originaux d'OpenAI Academy
- Les sous-titres traduits d'OpenAI Academy
- Les fragments de sous-titres
- Le texte extrait d'Academy
- Les fichiers vidéo ou autre contenu Academy

Ce dépôt est destiné à publier uniquement le code de l'outil.

## Dépannage

- Si l'extension ne trouve pas la vidéo, rechargez la page Academy puis réessayez.
- Si la génération échoue en cours de route, utilisez **Resume** pour continuer depuis les fragments enregistrés.
- Si l'extension et l'hôte Native Messaging ne correspondent pas après l'installation, relancez `installer\windows\install.bat`.
- Si Codex CLI n'est pas authentifié, la génération des sous-titres échouera. Authentifiez d'abord Codex CLI.

## Licence

MIT
