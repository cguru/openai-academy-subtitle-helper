import test from "node:test";
import assert from "node:assert/strict";
import { decodeNativeMessages, encodeNativeMessage } from "../src/native-protocol.js";

test("encodes a JSON message with a 4 byte little-endian length prefix", () => {
  const encoded = encodeNativeMessage({ type: "ping" });
  const body = encoded.subarray(4).toString("utf8");

  assert.equal(encoded.readUInt32LE(0), Buffer.byteLength(body));
  assert.deepEqual(JSON.parse(body), { type: "ping" });
});

test("decodes one or more length-prefixed JSON messages", () => {
  const first = encodeNativeMessage({ type: "ping" });
  const second = encodeNativeMessage({ type: "getSubtitle", videoId: "123", targetLanguageCode: "ko" });

  assert.deepEqual(decodeNativeMessages(Buffer.concat([first, second])), [
    { type: "ping" },
    { type: "getSubtitle", videoId: "123", targetLanguageCode: "ko" },
  ]);
});

test("leaves incomplete messages in remainder", () => {
  const encoded = encodeNativeMessage({ type: "ping" });
  const partial = encoded.subarray(0, encoded.length - 2);
  const result = decodeNativeMessages(partial, { includeRemainder: true });

  assert.deepEqual(result.messages, []);
  assert.equal(result.remainder.length, partial.length);
});
