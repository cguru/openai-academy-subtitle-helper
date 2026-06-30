import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { deleteCachedSubtitle, findCachedSubtitle } from "./cache.js";
import { buildGeneratorCommand, readGenerationProgress } from "./generator.js";
import { decodeNativeMessages, encodeNativeMessage } from "./native-protocol.js";

const defaultJobs = new Map();

export async function handleMessage(message, context = {}) {
  const cacheDir = context.cacheDir ?? defaultCacheDir();
  const generatorScriptPath = context.generatorScriptPath ?? defaultGeneratorScriptPath();
  const startCommand = context.startCommand ?? startCommandWithOutput;
  const readProgress = context.readProgress ?? readGenerationProgress;
  const jobs = context.jobs ?? defaultJobs;
  const now = context.now ?? (() => new Date());

  try {
    if (message.type === "ping") {
      return { type: "pong" };
    }

    if (message.type === "getSubtitle") {
      const targetLanguageCode = message.targetLanguageCode || "ko";
      const result = await findCachedSubtitle({
        cacheDir,
        videoId: message.videoId,
        targetLanguageCode,
      });

      if (!result.found) {
        return { type: "subtitleMissing", videoId: message.videoId, targetLanguageCode };
      }

      return {
        type: "subtitleFound",
        videoId: message.videoId,
        targetLanguageCode,
        path: result.path,
        format: result.format,
        cues: result.cues,
      };
    }

    if (message.type === "deleteSubtitle") {
      const targetLanguageCode = message.targetLanguageCode || "ko";
      const result = await deleteCachedSubtitle({
        cacheDir,
        videoId: message.videoId,
        targetLanguageCode,
      });

      return {
        type: "subtitleDeleted",
        videoId: message.videoId,
        targetLanguageCode,
        ...result,
      };
    }

    if (message.type === "generateSubtitle" || message.type === "resumeGeneration") {
      const targetLanguageCode = message.targetLanguageCode || "ko";
      const targetLanguageName = message.targetLanguageName || "Korean";
      const reasoningEffort = message.reasoningEffort || "low";
      const parallelJobs = message.parallelJobs || 5;
      const chunkSize = message.chunkSize || 75;
      const command = buildGeneratorCommand({
        scriptPath: generatorScriptPath,
        academyUrl: message.pageUrl,
        outDir: cacheDir,
        targetLanguageCode,
        targetLanguageName,
        chunkSize,
        parallelJobs,
        reasoningEffort,
      });
      const jobId = createJobId(targetLanguageCode);
      const processJob = startCommand(command);
      const job = {
        jobId,
        status: "running",
        videoId: message.videoId,
        targetLanguageCode,
        startedAt: now().toISOString(),
        cancel: processJob.cancel,
      };
      jobs.set(jobId, job);

      processJob.done.then((result) => {
        job.stdout = result.stdout;
        job.stderr = result.stderr;
        job.exitCode = result.exitCode;
        if (job.status === "cancelled") {
          return;
        }

        if (result.exitCode === 0) {
          job.status = "completed";
          return;
        }

        job.status = "failed";
        job.message = result.stderr || result.stdout || `Generator exited with code ${result.exitCode}`;
      });

      return { type: "generationStarted", jobId, status: job.status, targetLanguageCode };
    }

    if (message.type === "getGenerationStatus") {
      const job = findGenerationJob({
        jobs,
        jobId: message.jobId,
        videoId: message.videoId,
        targetLanguageCode: message.targetLanguageCode,
      });
      const targetLanguageCode = job?.targetLanguageCode || message.targetLanguageCode || "ko";
      const progress =
        message.videoId || job?.videoId
          ? await readProgress({
              cacheDir,
              videoId: message.videoId || job.videoId,
              targetLanguageCode,
            })
          : { totalChunks: 0, completedChunks: 0, percent: 0 };

      return buildGenerationStatusResponse(job, {
        videoId: message.videoId || job?.videoId,
        targetLanguageCode,
        progress: withProgressRuntimeMetadata(progress, job, now),
      });
    }

    if (message.type === "cancelGeneration") {
      const job = jobs.get(message.jobId);
      if (!job) {
        return { type: "generationStatus", jobId: message.jobId, status: "not_found" };
      }

      if (job.status === "running") {
        job.status = "cancelled";
        job.cancel?.();
      }

      return buildGenerationStatusResponse(job);
    }

    return { type: "error", message: `Unsupported message type: ${message.type}` };
  } catch (error) {
    return { type: "error", message: error.message };
  }
}

export function defaultCacheDir() {
  return join(homedir(), "AppData", "Local", "OpenAI-Academy-Subtitle-Helper", "subtitles");
}

export function defaultGeneratorScriptPath() {
  return join(
    fileURLToPath(new URL("..", import.meta.url)),
    "..",
    "scripts",
    "oash.ps1",
  );
}

export function runCommandWithOutput(command) {
  return startCommandWithOutput(command).done;
}

export function startCommandWithOutput(command) {
  const child = spawn(command.command, command.args, { windowsHide: true });
  let stdout = "";
  let stderr = "";

  const done = new Promise((resolve) => {
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      resolve({ exitCode: 1, stdout, stderr: error.message });
    });

    child.on("close", (exitCode) => {
      resolve({ exitCode, stdout, stderr });
    });
  });

  return {
    done,
    cancel: () => {
      if (process.platform === "win32" && child.pid) {
        spawn("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], { windowsHide: true });
        return;
      }

      child.kill();
    },
  };
}

function createJobId(targetLanguageCode) {
  return `${targetLanguageCode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function findGenerationJob({ jobs, jobId, videoId, targetLanguageCode }) {
  if (jobId && jobs.has(jobId)) {
    return jobs.get(jobId);
  }

  for (const job of jobs.values()) {
    if (
      (!videoId || job.videoId === videoId) &&
      (!targetLanguageCode || job.targetLanguageCode === targetLanguageCode)
    ) {
      return job;
    }
  }

  return null;
}

function buildGenerationStatusResponse(job, overrides = {}) {
  if (!job) {
    return withoutUndefined({
      type: "generationStatus",
      jobId: null,
      status: "idle",
      videoId: overrides.videoId,
      targetLanguageCode: overrides.targetLanguageCode,
      progress: overrides.progress,
    });
  }

  return withoutUndefined({
    type: "generationStatus",
    jobId: job.jobId,
    status: job.status,
    videoId: overrides.videoId || job.videoId,
    targetLanguageCode: overrides.targetLanguageCode || job.targetLanguageCode,
    progress: overrides.progress,
    message: job.message,
  });
}

function withProgressRuntimeMetadata(progress, job, now) {
  return withoutUndefined({
    ...progress,
    startedAt: job?.startedAt,
    checkedAt: now().toISOString(),
  });
}

function withoutUndefined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
}

async function runNativeHost() {
  let buffer = Buffer.alloc(0);

  process.stdin.on("data", async (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    const decoded = decodeNativeMessages(buffer, { includeRemainder: true });
    buffer = decoded.remainder;

    for (const message of decoded.messages) {
      const response = await handleMessage(message);
      process.stdout.write(encodeNativeMessage(response));
    }
  });
}

const isEntrypoint = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isEntrypoint) {
  runNativeHost();
}
