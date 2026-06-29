import test from "node:test";
import assert from "node:assert/strict";
import { findActiveCue } from "../src/subtitle-timing.js";

const cues = [
  { id: "1", start: 1, end: 2, text: "one" },
  { id: "2", start: 3, end: 4, text: "two" },
];

test("returns the cue active at the current media time", () => {
  assert.equal(findActiveCue(cues, 1.5)?.text, "one");
  assert.equal(findActiveCue(cues, 2.5), null);
});

test("applies sync offset before matching cues", () => {
  assert.equal(findActiveCue(cues, 2.75, { offsetSeconds: 0.25 })?.text, "two");
  assert.equal(findActiveCue(cues, 3.1, { offsetSeconds: -1.2 })?.text, "one");
});
