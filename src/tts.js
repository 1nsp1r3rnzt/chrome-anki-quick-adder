// Text-to-speech audio for new notes.
// When enabled in Settings, addNote requests get AnkiConnect's "audio" option: Anki downloads the
// spoken version of one field from a TTS URL and puts [sound:...] into the chosen field.
// No extra extension permissions are needed because AnkiConnect does the download.

var TTS_DEFAULT_URL = "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl={lang}&q={text}";
var TTS_DEFAULT_MAX_CHARS = 200; // the default endpoint rejects longer text

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

// Returns {params, skipped} where params is a copy of the addNote params with "audio" added,
// or the original params plus a reason in `skipped` when no audio was added.
function addTtsAudio(params, settings) {
    if (!settings || settings.ttsEnabled !== true) return { params: params, skipped: null };
    var note = params && params.note;
    if (!note || !note.fields) return { params: params, skipped: null };
    var names = Object.keys(note.fields);
    var srcIndex = (parseInt(settings.ttsSourceField, 10) || 1) - 1;
    var src = names[srcIndex];
    if (!src) return { params: params, skipped: "TTS: this note type has no field #" + (srcIndex + 1) };
    var text = ttsPlainText(note.fields[src]);
    if (!text) return { params: params, skipped: null };
    var template = (settings.ttsUrl || "").trim() || TTS_DEFAULT_URL;
    if (template === TTS_DEFAULT_URL && text.length > TTS_DEFAULT_MAX_CHARS) {
        return { params: params, skipped: "TTS: text longer than " + TTS_DEFAULT_MAX_CHARS + " characters, no audio added" };
    }
    var target = settings.ttsTargetField && names.indexOf(settings.ttsTargetField) !== -1 ? settings.ttsTargetField : src;
    if (/\[sound:/.test(note.fields[target] || "")) return { params: params, skipped: null };
    var lang = (settings.ttsLang || "en").trim();
    var url = template.replace(/\{lang\}/g, encodeURIComponent(lang)).replace(/\{text\}/g, encodeURIComponent(text));
    var copy = JSON.parse(JSON.stringify(params));
    copy.note.audio = (copy.note.audio || []).concat([{
        url: url,
        filename: "quickadder_tts_" + ttsHash(lang + "|" + text) + ".mp3",
        fields: [target]
    }]);
    return { params: copy, skipped: null };
}

if (typeof module !== "undefined") {
    module.exports = { addTtsAudio: addTtsAudio, ttsPlainText: ttsPlainText, TTS_DEFAULT_URL: TTS_DEFAULT_URL };
}
