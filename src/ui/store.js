/**
 * Working state kept in the browser between visits, one slice per kept value. localStorage can be missing or
 * throw (private windows, blocked site data, file:// in some browsers), so every access is guarded and the app
 * works without it. The durable copy is the export file, not this.
 */

/**
 * The storage key of each slice. These strings hold users' data in their browser: renaming one loses that
 * slice silently on the next visit, so they never change (tests/store.test.mjs pins them).
 */
export const STORAGE_KEYS = {
  draft: 'postman-alternative.draft.v1',
  history: 'postman-alternative.history.v1',
  collections: 'postman-alternative.collections.v1',
  openRequestId: 'postman-alternative.open-request.v1',
  environments: 'postman-alternative.environments.v1',
  activeEnvironmentId: 'postman-alternative.active-environment.v1',
};

/** What a slice read from storage may be; anything else (absent, damaged, from a bug) becomes the fallback. */
const SLICE_SHAPES = {
  draft: value => (value && typeof value === 'object' && !Array.isArray(value) ? value : null),
  history: listOrEmpty,
  collections: listOrEmpty,
  openRequestId: idOrNull,
  environments: listOrEmpty,
  activeEnvironmentId: idOrNull,
};

/** The saved value of a slice, or its fallback: null for the draft and ids, an empty list for lists. */
export function loadSlice(name) {
  return sliceShape(name)(readJson(STORAGE_KEYS[name]));
}

/** Saves one slice; silently does nothing when storage is unavailable. */
export function saveSlice(name, value) {
  sliceShape(name);
  writeJson(STORAGE_KEYS[name], value);
}

/** The shape check of a slice; throws for a name that is not a slice, which is a bug in the caller. */
function sliceShape(name) {
  if (!SLICE_SHAPES[name]) throw new Error('Unknown storage slice "' + name + '".');
  return SLICE_SHAPES[name];
}

/** The value if it is a list, else an empty one. */
function listOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

/** The value if it is an id (a string), else null. */
function idOrNull(value) {
  return typeof value === 'string' ? value : null;
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
