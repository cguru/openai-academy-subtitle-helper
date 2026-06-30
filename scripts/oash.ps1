param(
    [Parameter(Mandatory = $true)]
    [string] $Url,

    [string] $OutDir = (Join-Path $PSScriptRoot "..\subtitles"),

    [switch] $TranslateWithCodex,

    [int] $ChunkSize = 75,

    [ValidateRange(1, 10)]
    [int] $ParallelJobs = 5,

    [string] $TargetLanguageCode = "ko",

    [string] $TargetLanguageName = "Korean",

    [ValidateSet("low", "medium", "high", "xhigh")]
    [string] $ReasoningEffort = "low",

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

function Set-Utf8TextFileWithRetry {
    param(
        [Parameter(Mandatory = $true)][string] $Path,
        [Parameter(Mandatory = $true)][string] $Value,
        [int] $MaxAttempts = 10,
        [int] $DelayMilliseconds = 100
    )

    $directory = Split-Path -LiteralPath $Path -Parent
    $leaf = Split-Path -LiteralPath $Path -Leaf
    $encoding = [System.Text.UTF8Encoding]::new($false)

    for ($attempt = 1; $attempt -le $MaxAttempts; $attempt += 1) {
        $tempPath = Join-Path $directory ("$leaf.$PID.$([Guid]::NewGuid().ToString('N')).tmp")

        try {
            [System.IO.File]::WriteAllText($tempPath, $Value, $encoding)
            Move-Item -LiteralPath $tempPath -Destination $Path -Force
            return
        } catch [System.IO.IOException] {
            Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
            if ($attempt -eq $MaxAttempts) {
                throw
            }
            Start-Sleep -Milliseconds ($DelayMilliseconds * $attempt)
        } catch {
            Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
            throw
        }
    }
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
            Index = $chunkPlans.Count + 1
            StartId = $startId
            EndId = $endId
            EnglishPath = $enChunk
            TranslatedPath = $translatedChunk
        }
    }

    function Write-GenerationProgress {
        param(
            [Parameter(Mandatory = $true)][string] $Path,
            [Parameter(Mandatory = $true)][array] $ChunkPlans,
            [Parameter(Mandatory = $true)][object] $Progress,
            [Parameter(Mandatory = $true)][string] $Status,
            [int] $CurrentChunk = $Progress.CurrentChunk
        )

        $progressJson = @{
            videoId = $vimeoId
            targetLanguageCode = $TargetLanguageCode
            targetLanguageName = $TargetLanguageName
            sourceCueCount = $cues.Count
            totalChunks = $ChunkPlans.Count
            completedChunks = $Progress.CompletedChunks
            currentChunk = $CurrentChunk
            chunkSize = $ChunkSize
            parallelJobs = $ParallelJobs
            status = $Status
            updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
        } | ConvertTo-Json -Depth 3

        Set-Utf8TextFileWithRetry -Path $Path -Value ($progressJson + "`n")
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

    function Start-TranslationJob {
        param([Parameter(Mandatory = $true)][object] $ChunkPlan)

        Start-Job -ArgumentList @(
            $ChunkPlan.EnglishPath,
            $ChunkPlan.TranslatedPath,
            $ChunkPlan.StartId,
            $ChunkPlan.EndId,
            $TargetLanguageName,
            $ReasoningEffort,
            $OutDir
        ) -ScriptBlock {
            param(
                [string] $EnglishPath,
                [string] $TranslatedPath,
                [int] $StartId,
                [int] $EndId,
                [string] $TargetLanguageName,
                [string] $ReasoningEffort,
                [string] $OutDir
            )

            $logPath = "$TranslatedPath.log"
            $prompt = @"
Translate the TSV subtitle cues in $EnglishPath into $TargetLanguageName.

Write the result to $TranslatedPath.

Rules:
- Output TSV lines only, same cue id then tab then $TargetLanguageName translation.
- Preserve every cue id exactly and include all rows $StartId through $EndId.
- Translate only the English text into natural $TargetLanguageName.
- Keep product names such as OpenAI, Codex, ChatGPT, GitHub, Slack, API, CLI, URL, HTML, CSS, JavaScript in English.
- Keep each line concise enough for subtitles.
- Do not add markdown or explanation.
"@

            try {
                $prompt | codex exec -C $OutDir -s danger-full-access --ignore-user-config --ignore-rules -c "model_reasoning_effort='$ReasoningEffort'" --skip-git-repo-check - *> $logPath
                $exitCode = $LASTEXITCODE
                if ($exitCode -ne 0) {
                    return [pscustomobject]@{
                        Success = $false
                        StartId = $StartId
                        EndId = $EndId
                        ExitCode = $exitCode
                        LogPath = $logPath
                        Message = "Codex translation command failed for cues $StartId-$EndId."
                    }
                }

                if (-not (Test-Path -LiteralPath $TranslatedPath)) {
                    return [pscustomobject]@{
                        Success = $false
                        StartId = $StartId
                        EndId = $EndId
                        ExitCode = 1
                        LogPath = $logPath
                        Message = "Expected translated chunk was not created: $TranslatedPath"
                    }
                }

                return [pscustomobject]@{
                    Success = $true
                    StartId = $StartId
                    EndId = $EndId
                    ExitCode = 0
                    LogPath = $logPath
                    Message = ""
                }
            } catch {
                return [pscustomobject]@{
                    Success = $false
                    StartId = $StartId
                    EndId = $EndId
                    ExitCode = 1
                    LogPath = $logPath
                    Message = $_.Exception.Message
                }
            }
        }
    }

    $progressPath = Join-Path $chunkDir "progress.json"
    $planProgress = Get-ChunkPlanProgress -ChunkPlans $chunkPlans
    Write-GenerationProgress -Path $progressPath -ChunkPlans $chunkPlans -Progress $planProgress -Status "translating"

    $pendingPlans = New-Object System.Collections.Queue
    foreach ($chunkPlan in $chunkPlans) {
        if (Test-Path -LiteralPath $chunkPlan.TranslatedPath) {
            Write-Host "Translated chunk already exists: $($chunkPlan.TranslatedPath)"
            continue
        }
        $pendingPlans.Enqueue($chunkPlan)
    }

    $runningJobs = @{}
    while ($pendingPlans.Count -gt 0 -or $runningJobs.Count -gt 0) {
        while ($pendingPlans.Count -gt 0 -and $runningJobs.Count -lt $ParallelJobs) {
            $chunkPlan = $pendingPlans.Dequeue()
            $planProgress = Get-ChunkPlanProgress -ChunkPlans $chunkPlans
            Write-GenerationProgress `
                -Path $progressPath `
                -ChunkPlans $chunkPlans `
                -Progress $planProgress `
                -Status "translating" `
                -CurrentChunk $chunkPlan.Index
            Write-Host "Starting translation chunk $($chunkPlan.Index) of $($chunkPlans.Count): $($chunkPlan.StartId)-$($chunkPlan.EndId)"
            $job = Start-TranslationJob -ChunkPlan $chunkPlan
            $runningJobs[[string]$job.Id] = [pscustomobject]@{
                Job = $job
                ChunkPlan = $chunkPlan
            }
        }

        if ($runningJobs.Count -eq 0) {
            continue
        }

        $activeJobs = @($runningJobs.Values | ForEach-Object { $_.Job })
        $completedJobs = @(Wait-Job -Job $activeJobs -Any)
        foreach ($completedJob in $completedJobs) {
            $entry = $runningJobs[[string]$completedJob.Id]
            $result = Receive-Job -Job $completedJob |
                Where-Object { $_ -and $_.PSObject.Properties["Success"] } |
                Select-Object -Last 1
            Remove-Job -Job $completedJob -Force
            $runningJobs.Remove([string]$completedJob.Id)

            if (-not $result -or -not $result.Success) {
                $message = if ($result) { $result.Message } else { "Translation job failed without a result." }
                if ($result -and $result.LogPath -and (Test-Path -LiteralPath $result.LogPath)) {
                    $logTail = (Get-Content -LiteralPath $result.LogPath -Tail 20 -ErrorAction SilentlyContinue) -join "`n"
                    if (-not [string]::IsNullOrWhiteSpace($logTail)) {
                        $message = "$message`n$logTail"
                    }
                }
                foreach ($remainingJob in @($runningJobs.Values | ForEach-Object { $_.Job })) {
                    Stop-Job -Job $remainingJob -ErrorAction SilentlyContinue
                    Remove-Job -Job $remainingJob -Force -ErrorAction SilentlyContinue
                }
                throw $message
            }

            Write-Host "Completed translation chunk $($entry.ChunkPlan.Index) of $($chunkPlans.Count): $($entry.ChunkPlan.StartId)-$($entry.ChunkPlan.EndId)"
            $planProgress = Get-ChunkPlanProgress -ChunkPlans $chunkPlans
            Write-GenerationProgress -Path $progressPath -ChunkPlans $chunkPlans -Progress $planProgress -Status "translating"
        }
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

    $completedProgressJson = @{
        videoId = $vimeoId
        targetLanguageCode = $TargetLanguageCode
        targetLanguageName = $TargetLanguageName
        sourceCueCount = $cues.Count
        totalChunks = $chunkPlans.Count
        completedChunks = $chunkPlans.Count
        chunkSize = $ChunkSize
        parallelJobs = $ParallelJobs
        status = "completed"
        updatedAt = [DateTimeOffset]::UtcNow.ToString("o")
    } | ConvertTo-Json -Depth 3
    Set-Utf8TextFileWithRetry -Path $progressPath -Value ($completedProgressJson + "`n")
}
