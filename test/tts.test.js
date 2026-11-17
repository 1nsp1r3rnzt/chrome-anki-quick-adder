// Unit tests for src/tts.js. Run with: node --test "test/*.test.js"
const test = require("node:test");
const assert = require("node:assert");
const { planTtsAudio, applyTtsAudio, ttsPlainText, ttsErrorText, TTS_DEFAULT_URL, TTS_NOTIFICATION_ID } = require("../src/tts.js");

const on = { ttsEnabled: true, ttsLang: "fr", ttsSourceField: "1", ttsTargetField: "Audio" };
const noteParams = (fields) => ({ note: { deckName: "D", modelName: "M", fields, tags: [] } });
const okStore = (calls) => (url, filename) => { calls.push({ url, filename }); return Promise.resolve(filename); };

test("ttsPlainText strips cloze, HTML, sound tags and entities", () => {
    assert.strictEqual(ttsPlainText("{{c1::Bonjour::hello}} <b>le</b><br>monde&nbsp;&amp; [sound:x.mp3]"), "Bonjour le monde &");
    assert.strictEqual(ttsPlainText(undefined), "");
});

test("disabled or missing settings: nothing happens", async () => {
    const p = noteParams({ Front: "Bonjour", Audio: "" });
    for (const s of [undefined, {}, { ttsEnabled: false }, { ...on, ttsEnabled: "true" }]) {
        const calls = [];
        const r = await applyTtsAudio(p, s, okStore(calls));
        assert.strictEqual(r.params, p);
        assert.strictEqual(r.warning, null);
        assert.strictEqual(calls.length, 0);
    }
});

test("success: downloads first, then adds [sound:] to the target field without mutating input", async () => {
    const p = noteParams({ Front: "Bonjour", Back: "Hello", Audio: "" });
    const before = JSON.stringify(p);
    const calls = [];
    const r = await applyTtsAudio(p, on, okStore(calls));
    assert.strictEqual(JSON.stringify(p), before);
    assert.strictEqual(calls.length, 1);
    assert.ok(calls[0].url.startsWith("https://translate.google.com/translate_tts"));
    assert.ok(calls[0].url.includes("tl=fr") && calls[0].url.includes("q=Bonjour"));
    assert.match(calls[0].filename, /^quickadder_tts_[0-9a-f]+\.mp3$/);
    assert.strictEqual(r.params.note.fields.Audio, "[sound:" + calls[0].filename + "]");
    assert.strictEqual(r.params.note.fields.Front, "Bonjour");
    assert.strictEqual(r.params.note.audio, undefined, "must not use addNote's audio option");
    assert.strictEqual(r.warning, null);
});

test("uses the filename AnkiConnect actually stored", async () => {
    const r = await applyTtsAudio(noteParams({ Front: "Salut", Audio: "" }), on, () => Promise.resolve("renamed.mp3"));
    assert.strictEqual(r.params.note.fields.Audio, "[sound:renamed.mp3]");
});

test("download failure: note unchanged (no error text in fields), warning returned", async () => {
    const p = noteParams({ Front: "Bonjour", Audio: "" });
    const r = await applyTtsAudio(p, on, () => Promise.reject("https://... download failed with return code 429"));
    assert.strictEqual(r.params, p);
    assert.strictEqual(r.params.note.fields.Audio, "");
    assert.strictEqual(r.params.note.fields.Front, "Bonjour");
    assert.match(r.warning, /download failed.*429/);
});

test("storeMedia throwing synchronously is also caught", async () => {
    const r = await applyTtsAudio(noteParams({ Front: "Bonjour" }), on, () => { throw new Error("boom"); });
    assert.match(r.warning, /boom/);
});

test("Anki unreachable: no TTS warning (addNote reports it)", async () => {
    const p = noteParams({ Front: "Bonjour", Audio: "" });
    const r = await applyTtsAudio(p, on, () => Promise.reject({ ankiUnreachable: true }));
    assert.strictEqual(r.params, p);
    assert.strictEqual(r.warning, null);
});

test("falls back to the source field when the target field doesn't exist", async () => {
    const r = await applyTtsAudio(noteParams({ Front: "Bonjour", Back: "Hello" }), on, okStore([]));
    assert.match(r.params.note.fields.Front, /^Bonjour\[sound:quickadder_tts_[0-9a-f]+\.mp3\]$/);
});

test("reads the configured source field", async () => {
    const calls = [];
    await applyTtsAudio(noteParams({ Front: "Hello", Back: "Bonjour", Audio: "" }), { ...on, ttsSourceField: "2" }, okStore(calls));
    assert.ok(calls[0].url.includes("q=Bonjour"));
});

test("source field index beyond the note type: skipped with a warning", async () => {
    const calls = [];
    const r = await applyTtsAudio(noteParams({ Front: "Bonjour" }), { ...on, ttsSourceField: "3" }, okStore(calls));
    assert.strictEqual(calls.length, 0);
    assert.match(r.warning, /no field #3/);
});

test("over 200 chars with the default endpoint: skipped with a warning, no download", async () => {
    const calls = [];
    const r = await applyTtsAudio(noteParams({ Front: "a".repeat(201), Audio: "" }), on, okStore(calls));
    assert.strictEqual(calls.length, 0);
    assert.match(r.warning, /longer than 200/);
});

test("custom URL: placeholders filled, no length limit", async () => {
    const calls = [];
    const s = { ...on, ttsUrl: "https://tts.example/{lang}/{text}" };
    await applyTtsAudio(noteParams({ Front: "a b".repeat(100), Audio: "" }), s, okStore(calls));
    assert.strictEqual(calls.length, 1);
    assert.ok(calls[0].url.startsWith("https://tts.example/fr/a%20b"));
});

test("target already has a [sound:] tag or empty text: nothing happens", async () => {
    for (const fields of [{ Front: "Bonjour", Audio: "[sound:mine.mp3]" }, { Front: "<br> ", Audio: "" }]) {
        const calls = [];
        const r = await applyTtsAudio(noteParams(fields), on, okStore(calls));
        assert.strictEqual(calls.length, 0);
        assert.strictEqual(r.warning, null);
    }
});

test("same text and language give the same filename", () => {
    const a = planTtsAudio(noteParams({ Front: "<b>Bonjour</b>" }), on).media.filename;
    const b = planTtsAudio(noteParams({ Front: "Bonjour" }), on).media.filename;
    const c = planTtsAudio(noteParams({ Front: "Bonjour" }), { ...on, ttsLang: "en" }).media.filename;
    assert.strictEqual(a, b);
    assert.notStrictEqual(a, c);
});

test("TTS notices use their own notification ID", () => {
    assert.ok(TTS_NOTIFICATION_ID && TTS_NOTIFICATION_ID !== "ankiQuickAdder");
    assert.ok(TTS_DEFAULT_URL.includes("{lang}") && TTS_DEFAULT_URL.includes("{text}"));
});

test("duplicate (canAdd false): nothing downloaded, no TTS warning", async () => {
    const p = noteParams({ Front: "Bonjour", Audio: "" });
    const calls = [];
    const r = await applyTtsAudio(p, on, okStore(calls), () => Promise.resolve(false));
    assert.strictEqual(calls.length, 0);
    assert.strictEqual(r.params, p);
    assert.strictEqual(r.warning, null);
});

test("canAdd true, or canAdd failing (older AnkiConnect): audio still added", async () => {
    for (const canAdd of [() => Promise.resolve(true), () => Promise.reject("unsupported action"), () => { throw new Error("x"); }]) {
        const calls = [];
        const r = await applyTtsAudio(noteParams({ Front: "Bonjour", Audio: "" }), on, okStore(calls), canAdd);
        assert.strictEqual(calls.length, 1);
        assert.match(r.params.note.fields.Audio, /^\[sound:/);
    }
});

test("canAdd gets the original note", async () => {
    let seen;
    const p = noteParams({ Front: "Bonjour", Audio: "" });
    await applyTtsAudio(p, on, okStore([]), (x) => { seen = x; return Promise.resolve(true); });
    assert.strictEqual(seen, p);
});

test("failure notice leaves out the TTS URL and is capped", async () => {
    let url;
    const store = (u) => { url = u; return Promise.reject(u + " download failed with return code 429"); };
    const r = await applyTtsAudio(noteParams({ Front: "Bonjour", Audio: "" }), on, store);
    assert.ok(!r.warning.includes(url) && !r.warning.includes("translate.google.com"));
    assert.match(r.warning, /\(download failed with return code 429\)$/);
    assert.ok(ttsErrorText("e".repeat(500), "u").length <= 120);
    assert.strictEqual(ttsErrorText("", "u"), "unknown error");
});
