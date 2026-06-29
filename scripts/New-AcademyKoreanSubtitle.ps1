param(
    [Parameter(Mandatory = $true)]
    [string] $Url,

    [string] $OutDir = (Join-Path $PSScriptRoot "..\subtitles"),

    [switch] $TranslateWithCodex,

    [int] $ChunkSize = 25,

    [string] $TargetLanguageCode = "ko",

    [string] $TargetLanguageName = "Korean",

    [ValidateSet("low", "medium", "high", "xhigh")]
    [string] $ReasoningEffort = "medium",

    [switch] $CacheNameByVideoId
)

$ErrorActionPreference = "Stop"

function Invoke-CurlText {
    param([Parameter(Mandatory = $true)][string] $Uri)

    $text = & curl.exe -L --silent $Uri
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($text)) {
        throw "Failed to fetch URL: $Uri"
    }
    return ($text -join "`n")
}

function Get-SafeName {
    param([string] $Value)

    $name = $Value -replace '[\\/:*?"<>|]+', '-'
    $name = $name -replace '\s+', '-'
    $name = $name.Trim('-')
    if ([string]::IsNullOrWhiteSpace($name)) { return "academy-video" }
    return $name.ToLowerInvariant()
}

function Get-VimeoId {
    param([string] $InputUrl, [string] $Html)

    $patterns = @(
        'player\.vimeo\.com/video/(\d+)',
        'vimeo\.com/(\d+)',
        'contentUrl"\s*:\s*"https://vimeo\.com/(\d+)'
    )

    foreach ($pattern in $patterns) {
        $match = [regex]::Match($InputUrl, $pattern)
        if ($match.Success) { return $match.Groups[1].Value }
    }

    foreach ($pattern in $patterns) {
        $match = [regex]::Match($Html, $pattern)
        if ($match.Success) { return $match.Groups[1].Value }
    }

    throw "Could not find a Vimeo video id in the URL or page HTML."
}

function Get-TitleSlug {
    param([string] $Html, [string] $Fallback)

    $titleMatch = [regex]::Match($Html, '<title[^>]*>(.*?)</title>', 'Singleline')
    if ($titleMatch.Success) {
        $decoded = [System.Net.WebUtility]::HtmlDecode($titleMatch.Groups[1].Value)
        $decoded = $decoded -replace '\s*\|\s*OpenAI Academy\s*$', ''
        return Get-SafeName $decoded
    }
    return $Fallback
}

function Convert-VttToSrt {
    param(
        [Parameter(Mandatory = $true)][string] $VttPath,
        [Parameter(Mandatory = $true)][string] $SrtPath
    )

    $text = Get-Content -LiteralPath $VttPath -Raw -Encoding UTF8
    $normalized = $text -replace "`r`n", "`n"
    $blocks = $normalized.Trim() -split "`n\s*`n"
    $out = New-Object System.Collections.Generic.List[string]
    $sequence = 1

    foreach ($block in $blocks) {
        $lines = @($block -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
        if ($lines.Count -eq 0 -or $lines[0] -eq "WEBVTT") { continue }

        $timeLine = $null
        $content = @()

        if ($lines[0] -match '^\d+$' -and $lines.Count -ge 3 -and $lines[1] -match '-->') {
            $timeLine = $lines[1]
            $content = @($lines | Select-Object -Skip 2)
        } elseif ($lines.Count -ge 2 -and $lines[0] -match '-->') {
            $timeLine = $lines[0]
            $content = @($lines | Select-Object -Skip 1)
        } else {
            continue
        }

        $timeLine = $timeLine -replace '(\d{2}:\d{2}:\d{2})\.(\d{3})', '$1,$2'
        $out.Add([string]$sequence)
        $out.Add($timeLine)
        foreach ($line in $content) { $out.Add($line) }
        $out.Add("")
        $sequence += 1
    }

    [System.IO.File]::WriteAllText($SrtPath, ($out -join "`n"), [System.Text.UTF8Encoding]::new($false))
    return $sequence - 1
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$pageHtml = ""
if ($Url -match 'academy\.openai\.com') {
    $pageHtml = Invoke-CurlText $Url
}

$vimeoId = Get-VimeoId -InputUrl $Url -Html $pageHtml
$slug = if ($pageHtml) { Get-TitleSlug -Html $pageHtml -Fallback "vimeo-$vimeoId" } else { "vimeo-$vimeoId" }
$outputBaseName = if ($CacheNameByVideoId) { $vimeoId } else { $slug }

$playerUrl = "https://player.vimeo.com/video/$vimeoId"
$playerHtml = Invoke-CurlText $playerUrl

$captionMatch = [regex]::Match(
    $playerHtml,
    'https:\\/\\/captions\.vimeo\.com\\/captions\\/[^"]+?\.vtt\?expires=\d+\\u0026sig=[a-f0-9]+'
)

if (-not $captionMatch.Success) {
    $captionMatch = [regex]::Match(
        $playerHtml,
        'https://captions\.vimeo\.com/captions/[^"]+?\.vtt\?expires=\d+&sig=[a-f0-9]+'
    )
}

if (-not $captionMatch.Success) {
    $captionMatch = [regex]::Match(
        $playerHtml,
        'captions\.vimeo\.com/captions/[^"]+?\.vtt\?expires=\d+\\u0026sig=[a-f0-9]+'
    )
}

if (-not $captionMatch.Success) {
    throw "Could not find a Vimeo VTT caption URL."
}

$captionUrl = $captionMatch.Value.Replace('\/', '/').Replace('\u0026', '&')
if ($captionUrl -notmatch '^https://') {
    $captionUrl = "https://$captionUrl"
}
$enPath = Join-Path $OutDir "$outputBaseName.en.vtt"
$translatedPath = Join-Path $OutDir "$outputBaseName.$TargetLanguageCode.vtt"
$translatedSrtPath = Join-Path $OutDir "$outputBaseName.$TargetLanguageCode.srt"

& curl.exe -L --silent $captionUrl --output $enPath
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $enPath)) {
    throw "Failed to download captions."
}

Write-Host "English VTT: $enPath"

if ($TranslateWithCodex) {
    $chunkDir = Join-Path $OutDir "$outputBaseName.$TargetLanguageCode.chunks"
    New-Item -ItemType Directory -Force -Path $chunkDir | Out-Null

    $vttText = Get-Content -LiteralPath $enPath -Raw -Encoding UTF8
    $normalized = $vttText -replace "`r`n", "`n"
    $blocks = $normalized -split "`n\s*`n"
    $cues = @()

    foreach ($block in $blocks) {
        $lines = $block.Trim("`n") -split "`n"
        if ($lines.Count -ge 3 -and $lines[0] -match '^\d+$' -and $lines[1] -match '-->') {
            $cue = [pscustomobject]@{
                Id = [int] $lines[0]
                Time = $lines[1]
                Text = (($lines | Select-Object -Skip 2) -join ' ').Trim()
            }
            $cues += $cue
        }
    }

    if ($cues.Count -eq 0) {
        throw "No subtitle cues found in $enPath"
    }

    $chunkPlans = @()
    for ($offset = 0; $offset -lt $cues.Count; $offset += $ChunkSize) {
        $chunkCues = $cues | Select-Object -Skip $offset -First $ChunkSize
        $startId = $chunkCues[0].Id
        $endId = $chunkCues[-1].Id
        $enChunk = Join-Path $chunkDir ("en_{0}_{1}.tsv" -f $startId, $endId)
        $translatedChunk = Join-Path $chunkDir ("$TargetLanguageCode`_{0}_{1}.tsv" -f $startId, $endId)

        $chunkCues |
            ForEach-Object { "$($_.Id)`t$($_.Text)" } |
            Set-Content -LiteralPath $enChunk -Encoding UTF8

        $chunkPlans += [pscustomobject]@{
            StartId = $startId
            EndId = $endId
            EnglishPath = $enChunk
            TranslatedPath = $translatedChunk
        }
    }

    function Get-ChunkPlanProgress {
        param([Parameter(Mandatory = $true)][array] $ChunkPlans)

        $completedChunks = @($ChunkPlans | Where-Object { Test-Path -LiteralPath $_.TranslatedPath }).Count
        $currentChunk = $ChunkPlans.Count

        for ($index = 0; $index -lt $ChunkPlans.Count; $index += 1) {
            if (-not (Test-Path -LiteralPath $ChunkPlans[$index].TranslatedPath)) {
                $currentChunk = $index + 1
                break
            }
        }

        return [pscustomobject]@{
            CompletedChunks = $completedChunks
            CurrentChunk = $currentChunk
        }
    }

    $progressPath = Join-Path $chunkDir "progress.json"
    @{
        videoId = $vimeoId
        targetLanguageCode = $TargetLanguageCode
        targetLanguageName = $TargetLanguageName
        sourceCueCount = $cues.Count
        totalChunks = $chunkPlans.Count
        chunkSize = $ChunkSize
        status = "translating"
        updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
    } | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $progressPath -Encoding UTF8

    foreach ($chunkPlan in $chunkPlans) {
        $startId = $chunkPlan.StartId
        $endId = $chunkPlan.EndId
        $enChunk = $chunkPlan.EnglishPath
        $translatedChunk = $chunkPlan.TranslatedPath
        $currentChunk = [array]::IndexOf($chunkPlans, $chunkPlan) + 1

        if (Test-Path -LiteralPath $translatedChunk) {
            Write-Host "Translated chunk already exists: $translatedChunk"
            continue
        }

        $planProgress = Get-ChunkPlanProgress -ChunkPlans $chunkPlans
        @{
            videoId = $vimeoId
            targetLanguageCode = $TargetLanguageCode
            targetLanguageName = $TargetLanguageName
            sourceCueCount = $cues.Count
            totalChunks = $chunkPlans.Count
            completedChunks = $planProgress.CompletedChunks
            currentChunk = $currentChunk
            chunkSize = $ChunkSize
            status = "translating"
            updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
        } | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $progressPath -Encoding UTF8

        $prompt = @"
Translate the TSV subtitle cues in $enChunk into $TargetLanguageName.

Write the result to $translatedChunk.

Rules:
- Output TSV lines only, same cue id then tab then $TargetLanguageName translation.
- Preserve every cue id exactly and include all rows $startId through $endId.
- Translate only the English text into natural $TargetLanguageName.
- Keep product names such as OpenAI, Codex, ChatGPT, GitHub, Slack, API, CLI, URL, HTML, CSS, JavaScript in English.
- Keep each line concise enough for subtitles.
- Do not add markdown or explanation.
"@

        $prompt | codex exec -C $OutDir -s danger-full-access --ignore-user-config --ignore-rules -c "model_reasoning_effort='$ReasoningEffort'" --skip-git-repo-check -
        if ($LASTEXITCODE -ne 0) {
            throw "Codex translation command failed for cues $startId-$endId."
        }

        if (-not (Test-Path -LiteralPath $translatedChunk)) {
            throw "Expected translated chunk was not created: $translatedChunk"
        }

        $planProgress = Get-ChunkPlanProgress -ChunkPlans $chunkPlans
        @{
            videoId = $vimeoId
            targetLanguageCode = $TargetLanguageCode
            targetLanguageName = $TargetLanguageName
            sourceCueCount = $cues.Count
            totalChunks = $chunkPlans.Count
            completedChunks = $planProgress.CompletedChunks
            currentChunk = $planProgress.CurrentChunk
            chunkSize = $ChunkSize
            status = "translating"
            updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
        } | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $progressPath -Encoding UTF8
    }

    $translations = @{}
    foreach ($chunkPlan in $chunkPlans) {
        foreach ($line in Get-Content -LiteralPath $chunkPlan.TranslatedPath -Encoding UTF8) {
            if ([string]::IsNullOrWhiteSpace($line)) { continue }
            $parts = $line -split "`t", 2
            if ($parts.Count -ne 2 -or $parts[0] -notmatch '^\d+$') {
                throw "Invalid translated TSV line in $($chunkPlan.TranslatedPath): $line"
            }
            $translations[[int] $parts[0]] = $parts[1].Trim()
        }
    }

    $missing = $cues | Where-Object { -not $translations.ContainsKey($_.Id) } | Select-Object -ExpandProperty Id
    if ($missing.Count -gt 0) {
        throw "Missing translated cue ids: $($missing -join ', ')"
    }

    $outBlocks = New-Object System.Collections.Generic.List[string]
    foreach ($block in $blocks) {
        $lines = $block.Trim("`n") -split "`n"
        if ($lines.Count -ge 3 -and $lines[0] -match '^\d+$' -and $lines[1] -match '-->') {
            $cueId = [int] $lines[0]
            $outBlocks.Add((@($lines[0], $lines[1], $translations[$cueId]) -join "`n"))
        } elseif (-not [string]::IsNullOrWhiteSpace($block)) {
            $outBlocks.Add($block.Trim("`n"))
        }
    }

    [System.IO.File]::WriteAllText($translatedPath, (($outBlocks -join "`n`n").TrimEnd() + "`n"), [System.Text.UTF8Encoding]::new($false))
    Write-Host "Translated VTT: $translatedPath"

    $srtCueCount = Convert-VttToSrt -VttPath $translatedPath -SrtPath $translatedSrtPath
    Write-Host "Translated SRT: $translatedSrtPath"
    Write-Host "SRT cues: $srtCueCount"

    @{
        videoId = $vimeoId
        targetLanguageCode = $TargetLanguageCode
        targetLanguageName = $TargetLanguageName
        sourceCueCount = $cues.Count
        totalChunks = $chunkPlans.Count
        completedChunks = $chunkPlans.Count
        chunkSize = $ChunkSize
        status = "completed"
        updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
    } | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $progressPath -Encoding UTF8
}
