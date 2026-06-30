# Ayudante no oficial de subtítulos para OpenAI Academy

Herramienta local para generar y mostrar subtítulos, pensada para ver videos de OpenAI Academy con más comodidad en idiomas distintos del inglés.

Este es un proyecto comunitario no oficial. No está afiliado, respaldado ni patrocinado por OpenAI.

Idiomas: [English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [简体中文](README.zh-CN.md) | [Español](README.es.md) | [Français](README.fr.md) | [Deutsch](README.de.md)

> Estado actual: solo Windows. macOS y Linux todavía no son compatibles.

## ¿Qué hace?

- Detecta páginas de video de OpenAI Academy en Chrome.
- Carga automáticamente subtítulos traducidos desde la caché local cuando existen.
- Si no hay subtítulos, genera subtítulos traducidos localmente mediante Codex CLI.
- Muestra los subtítulos traducidos directamente sobre el reproductor de video de Academy.
- Soporta generación paralela, cancelar y reanudar, progreso en vivo, selección de esfuerzo de razonamiento y ajustes de tamaño y posición del subtítulo.

La herramienta no descarga archivos de video. Este repositorio no incluye contenido de Academy, subtítulos originales, subtítulos traducidos, fragmentos de subtítulos ni texto extraído.

## Capturas

Ventana de la extensión durante la generación de subtítulos:

![Ventana de la extensión mostrando el progreso de generación](docs/images/extension-popup-progress.png)

Subtítulos traducidos sobre un video de Academy:

![Subtítulos traducidos sobre un video de Academy](docs/images/academy-subtitle-overlay.png)

## Idiomas compatibles

Estos son los idiomas de destino disponibles en la extensión de Chrome.

- Coreano
- Japonés
- Chino simplificado
- Español
- Francés
- Alemán

El idioma de destino predeterminado es coreano. El wrapper CLI `oash.bat` también genera subtítulos en coreano de forma predeterminada.

## Estructura del repositorio

```text
extension/      Código fuente de la extensión de Chrome
native-host/    Host de Chrome Native Messaging
installer/      Scripts de instalación y desinstalación para Windows
scripts/        Scripts de generación de subtítulos
viewer/         Utilidades del visor y overlay local de subtítulos
subtitles/      Carpeta local de salida y caché, ignorada por Git
```

## Requisitos

- Windows
- Google Chrome
- Node.js disponible en `PATH`
- Codex CLI instalado y autenticado
- `curl.exe`

Las versiones recientes de Windows normalmente incluyen `curl.exe`.

## Instalación

Ejecuta el instalador de Windows.

```bat
installer\windows\install.bat
```

Después carga la extensión de Chrome manualmente.

1. Abre `chrome://extensions` en Chrome.
2. Activa el modo de desarrollador.
3. Haz clic en **Load unpacked**.
4. Selecciona la carpeta `extension` de este repositorio.

El instalador registra el host de Native Messaging para el ID estable de la extensión.

## Uso

1. Abre una página de video de OpenAI Academy.
2. Abre la ventana de la extensión de Chrome.
3. Elige el idioma en `Target language`.
4. Si hay subtítulos traducidos locales, se cargarán automáticamente.
5. Si no hay subtítulos locales, haz clic en **Generate**.
6. Para detener la generación, haz clic en **Cancel**.
7. Para continuar desde fragmentos guardados, haz clic en **Resume**.
8. Ajusta tamaño, posición, color, opacidad de fondo y negrita desde la ventana de la extensión.

Los archivos generados se guardan en `subtitles/` o en la caché local de la aplicación, y están configurados para no incluirse en Git.

## Uso por CLI

También puedes usar el flujo por CLI. Este comando genera subtítulos en coreano de forma predeterminada.

```bat
oash.bat "https://academy.openai.com/home/videos/..."
```

Para generar otro idioma, ejecuta directamente el script de PowerShell con `-TargetLanguageCode` y `-TargetLanguageName`.
La generación procesa 5 fragmentos de traducción en paralelo de forma predeterminada. Puedes ajustar el valor con `-ParallelJobs 1` hasta `-ParallelJobs 10`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts\oash.ps1 `
  -Url "https://academy.openai.com/home/videos/..." `
  -OutDir subtitles `
  -TranslateWithCodex `
  -ParallelJobs 5 `
  -TargetLanguageCode ja `
  -TargetLanguageName Japanese
```

## Contenido y archivos de subtítulos

No hagas commit ni redistribuyas:

- Subtítulos originales de OpenAI Academy
- Subtítulos traducidos de OpenAI Academy
- Fragmentos de subtítulos
- Texto extraído de Academy
- Archivos de video u otro contenido de Academy

Este repositorio está pensado para publicar solo el código de la herramienta.

## Solución de problemas

- Si la extensión no encuentra el video, recarga la página de Academy e inténtalo de nuevo.
- Si la generación falla a mitad de camino, usa **Resume** para continuar desde los fragmentos guardados.
- Si después de instalar la extensión y el host de Native Messaging no coinciden, vuelve a ejecutar `installer\windows\install.bat`.
- Si Codex CLI no está autenticado, la generación de subtítulos fallará. Autentica Codex CLI primero.

## Licencia

MIT
