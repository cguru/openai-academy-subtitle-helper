import test from "node:test";
import assert from "node:assert/strict";
import { parseSubtitleText } from "../src/subtitle-parser.js";

test("parses VTT cues into normalized cue objects", () => {
  const cues = parseSubtitleText(`WEBVTT

1
00:00:01.000 --> 00:00:03.500
안녕하세요.

2
00:00:04.000 --> 00:00:05.250
두 번째 줄
입니다.
`);

  assert.deepEqual(cues, [
    { id: "1", start: 1, end: 3.5, text: "안녕하세요." },
    { id: "2", start: 4, end: 5.25, text: "두 번째 줄\n입니다." },
  ]);
});

test("parses SRT cues into normalized cue objects", () => {
  const cues = parseSubtitleText(`1
00:00:01,000 --> 00:00:03,500
Hello.

2
00:00:04,000 --> 00:00:05,250
World.
`);

  assert.deepEqual(cues, [
    { id: "1", start: 1, end: 3.5, text: "Hello." },
    { id: "2", start: 4, end: 5.25, text: "World." },
  ]);
});
