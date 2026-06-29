import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_UI_LANGUAGE,
  getDefaultTargetLanguage,
  getMessage,
  normalizeUiLanguage,
  resolveUiLanguage,
} from "../src/i18n.js";

test("falls back to English for unsupported UI languages", () => {
  assert.equal(normalizeUiLanguage("id-ID"), DEFAULT_UI_LANGUAGE);
  assert.equal(normalizeUiLanguage("ms-MY"), DEFAULT_UI_LANGUAGE);
  assert.equal(normalizeUiLanguage("pt-BR"), DEFAULT_UI_LANGUAGE);
});

test("normalizes supported browser language variants", () => {
  assert.equal(normalizeUiLanguage("ko-KR"), "ko");
  assert.equal(normalizeUiLanguage("ja-JP"), "ja");
  assert.equal(normalizeUiLanguage("zh-CN"), "zh-Hans");
  assert.equal(normalizeUiLanguage("es-419"), "es");
  assert.equal(normalizeUiLanguage("fr-CA"), "fr");
  assert.equal(normalizeUiLanguage("de-DE"), "de");
});

test("uses the UI language as the default target only when the target is supported", () => {
  assert.equal(getDefaultTargetLanguage("ko-KR"), "ko");
  assert.equal(getDefaultTargetLanguage("ja-JP"), "ja");
  assert.equal(getDefaultTargetLanguage("id-ID"), "ko");
  assert.equal(getDefaultTargetLanguage("en-US"), "ko");
});

test("resolves auto UI language from browser settings with English fallback", () => {
  assert.equal(resolveUiLanguage({ storedLanguage: "auto", browserLanguage: "ko-KR" }), "ko");
  assert.equal(resolveUiLanguage({ storedLanguage: "auto", browserLanguage: "id-ID" }), "en");
  assert.equal(resolveUiLanguage({ storedLanguage: "ja", browserLanguage: "ko-KR" }), "ja");
});

test("returns localized messages with English fallback", () => {
  assert.equal(getMessage("ko", "generate"), "생성");
  assert.equal(getMessage("ja", "targetLanguage"), "翻訳先言語");
  assert.equal(getMessage("id-ID", "generate"), "Generate");
  assert.equal(getMessage("ko", "loadedCues", { count: 3 }), "로컬 캐시에서 3개 자막을 불러왔습니다.");
});
