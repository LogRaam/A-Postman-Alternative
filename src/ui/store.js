/**
 * Working state kept in the browser between visits: the current draft and the history. localStorage can
 * be missing or throw (private windows, blocked site data, file:// in some browsers), so every access is
 * guarded and the app works without it. The durable copy is the export file, not this.
 */

/** Storage key of the draft in the editor. */
const DRAFT_KEY = 'relais.draft.v1';
/** Storage key of the history list. */
const HISTORY_KEY = 'relais.history.v1';

/** The saved draft, or null when there is none or storage is unavailable. */
export function loadDraft() {
  return readJson(DRAFT_KEY);
}

/** Saves the draft; silently does nothing when storage is unavailable. */
export function saveDraft(draft) {
  writeJson(DRAFT_KEY, draft);
}

/** The saved history, or an empty list. */
export function loadHistory() {
  const history = readJson(HISTORY_KEY);
  return Array.isArray(history) ? history : [];
}

/** Saves the history; silently does nothing when storage is unavailable. */
export function saveHistory(history) {
  writeJson(HISTORY_KEY, history);
}

/** The parsed value stored under a key, or null when missing, unreadable or blocked. */
function readJson(key) {
  try {
    const text = window.localStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

/** Stores a value as JSON under a key, ignoring a full or blocked storage. */
function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the session still works, it just will not be remembered.
  }
}
