import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("installer stops a running native host before replacing installed files", async () => {
  const script = await readFile("../installer/windows/install.ps1", "utf8");

  assert.match(script, /function Stop-RunningNativeHost/);
  assert.match(script, /Get-CimInstance Win32_Process/);
  assert.match(script, /Stop-Process -Id \$process\.ProcessId -Force/);
  assert.ok(
    script.indexOf("Stop-RunningNativeHost") < script.indexOf("Copy-Item -Recurse -Force"),
  );
});
