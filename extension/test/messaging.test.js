import test from "node:test";
import assert from "node:assert/strict";
import { withTimeout } from "../src/messaging.js";

test("returns the original value before timeout", async () => {
  const result = await withTimeout(Promise.resolve("ok"), 100, "timed out");

  assert.equal(result, "ok");
});

test("rejects when a message does not resolve before timeout", async () => {
  await assert.rejects(
    withTimeout(new Promise(() => {}), 1, "content frame did not answer"),
    /content frame did not answer/,
  );
});
