// Text-to-speech audio for new notes.
// When enabled in Settings, the text of one field is sent to a TTS service. By default that is
// Google Translate's unofficial TTS endpoint; a custom URL can be set instead.
//
// The audio is downloaded by Anki (AnkiConnect "storeMediaFile" with a url) in a separate request
// *before* addNote, and only on success is [sound:...] added to the note. We deliberately don't use
// addNote's "audio" option: when that download fails (rate limit, offline), AnkiConnect appends the
// error text to the field, so the card would end up with an error message in it.
// No extra extension permissions are needed because AnkiConnect does the download.

var TTS_DEFAULT_URL = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl={lang}&q={text}";
var TTS_DEFAULT_MAX_CHARS = 200; // the default endpoint rejects longer text
var TTS_NOTIFICATION_ID = "ankiQuickAdderTts"; // own ID so "Note is added" doesn't overwrite TTS notices

function ttsPlainText(value) {
    if (typeof value !== "string") return "";
    return value
        .replace(/\{\{c\d+::([\s\S]*?)(?:::[\s\S]*?)?\}\}/g, "$1") // cloze {{c1::word::hint}} -> word
        .replace(/<br\s*\/?>/gi, " ")
        .replace(/<[^>]*>/g, "")
        .replace(/\[sound:[^\]]*\]/g, "")
        .replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
}

function ttsHash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(16);
}

// Decides whether a note gets audio. Pure, does no I/O.
// Returns {media: {url, filename, field} | null, skipped: reason | null}.
function planTtsAudio(params, settings) {
    var none = { media: null, skipped: null };
    if (!settings || settings.ttsEnabled !== true) return none;
    var note = params && params.note;
    if (!note || !note.fields) return none;
    var names = Object.keys(note.fields);
    var srcIndex = (parseInt(settings.ttsSourceField, 10) || 1) - 1;
    var src = names[srcIndex];
    if (!src) return { media: null, skipped: "TTS: this note type has no field #" + (srcIndex + 1) + ", no audio added" };
    var text = ttsPlainText(note.fields[src]);
    if (!text) return none;
    var template = (settings.ttsUrl || "").trim() || TTS_DEFAULT_URL;
    if (template === TTS_DEFAULT_URL && text.length > TTS_DEFAULT_MAX_CHARS) {
        return { media: null, skipped: "TTS: text longer than " + TTS_DEFAULT_MAX_CHARS + " characters, no audio added" };
    }
    var target = settings.ttsTargetField && names.indexOf(settings.ttsTargetField) !== -1 ? settings.ttsTargetField : src;
    if (/\[sound:/.test(note.fields[target] || "")) return none;
    var lang = (settings.ttsLang || "en").trim();
    return {
        media: {
            url: template.replace(/\{lang\}/g, encodeURIComponent(lang)).replace(/\{text\}/g, encodeURIComponent(text)),
            filename: "quickadder_tts_" + ttsHash(lang + "|" + text) + ".mp3",
            field: target
        },
        skipped: null
    };
}

// Adds TTS audio to addNote params. storeMedia(url, filename) must return a Promise of the stored
// filename (AnkiConnect storeMediaFile) and reject when the download fails; a rejection with
// `ankiUnreachable: true` means AnkiConnect itself could not be reached.
// Never rejects: on any failure the note is added without audio and `warning` says why.
// Resolves {params, warning}; params is a copy when audio was added, the original otherwise.
function applyTtsAudio(params, settings, storeMedia) {
    var plan = planTtsAudio(params, settings);
    if (!plan.media) return Promise.resolve({ params: params, warning: plan.skipped });
    var media = plan.media;
    return Promise.resolve()
        .then(function () { return storeMedia(media.url, media.filename); })
        .then(function (storedName) {
            var copy = JSON.parse(JSON.stringify(params));
            copy.note.fields[media.field] = (copy.note.fields[media.field] || "") +
                "[sound:" + (storedName || media.filename) + "]";
            return { params: copy, warning: null };
        })
        .catch(function (error) {
            // Anki itself unreachable: addNote will fail and report that, so no extra TTS notice.
            if (error && error.ankiUnreachable) return { params: params, warning: null };
            return { params: params, warning: "TTS: audio download failed, note added without audio (" + String(error) + ")" };
        });
}

if (typeof module !== "undefined") {
    module.exports = {
        planTtsAudio: planTtsAudio,
        applyTtsAudio: applyTtsAudio,
        ttsPlainText: ttsPlainText,
        TTS_DEFAULT_URL: TTS_DEFAULT_URL,
        TTS_NOTIFICATION_ID: TTS_NOTIFICATION_ID
    };
}
