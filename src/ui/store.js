/**
 * Working state kept in the browser between visits: the draft, the history and the collections. localStorage can
 * be missing or throw (private windows, blocked site data, file:// in some browsers), so every access is
 * guarded and the app works without it. The durable copy is the export file, not this.
 */

/** Storage key of the draft in the editor. */
const DRAFT_KEY = 'postman-alternative.draft.v1';
/** Storage key of the history list. */
const HISTORY_KEY = 'postman-alternative.history.v1';
/** Storage key of the collections. */
const COLLECTIONS_KEY = 'postman-alternative.collections.v1';
/** Storage key of the id of the saved request open in the editor. */
const OPEN_REQUEST_KEY = 'postman-alternative.open-request.v1';

/** The saved collections, or an empty list. */
export function loadCollections() {
  const collections = readJson(COLLECTIONS_KEY);
  return Array.isArray(collections) ? collections : [];
}

/** Saves the collections; silently does nothing when storage is unavailable. */
export function saveCollections(collections) {
  writeJson(COLLECTIONS_KEY, collections);
}

/** The id of the saved request open in the editor, or null. */
export function loadOpenRequestId() {
  const id = readJson(OPEN_REQUEST_KEY);
  return typeof id === 'string' ? id : null;
}

/** Remembers which saved request is open in the editor (null for none). */
export function saveOpenRequestId(id) {
  writeJson(OPEN_REQUEST_KEY, id);
}

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
