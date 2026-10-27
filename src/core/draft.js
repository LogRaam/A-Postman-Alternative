/**
 * The draft: one request as the editor holds it, and as history entries and saved requests keep it.
 * Every place that stores a request stores this shape, so its fields are listed once, here.
 */

/** Every field of a draft, as [path, type], for the export file's validator and map. "[]" marks array items. */
export const DRAFT_FIELDS = [
  ['method', 'string'],
  ['url', 'string'],
  ['params', 'array'],
  ['params[].enabled', 'boolean'],
  ['params[].key', 'string'],
  ['params[].value', 'string'],
  ['headers', 'array'],
  ['headers[].enabled', 'boolean'],
  ['headers[].key', 'string'],
  ['headers[].value', 'string'],
  ['bodyMode', 'string'],
  ['body', 'string'],
];

/** A new, empty draft: what the editor shows on first open. */
export function emptyDraft() {
  return { method: 'GET', url: '', params: [], headers: [], bodyMode: 'none', body: '' };
}

/** A deep copy of a draft, rows included, with every field present (a field missing from old data gets its default). */
export function copyDraft(draft) {
  const empty = emptyDraft();
  return {
    method: draft.method ?? empty.method,
    url: draft.url ?? empty.url,
    params: (draft.params || []).map(copyRow),
    headers: (draft.headers || []).map(copyRow),
    bodyMode: draft.bodyMode ?? empty.bodyMode,
    body: draft.body ?? empty.body,
  };
}

/** True when two drafts would send the same request: what "unsaved changes" means for a saved request. */
export function sameDraft(a, b) {
  return JSON.stringify(copyDraft(a)) === JSON.stringify(copyDraft(b));
}

/** A row with all three fields present: ticked unless explicitly unticked, empty strings rather than undefined. */
function copyRow(row) {
  return { enabled: row.enabled !== false, key: row.key ?? '', value: row.value ?? '' };
}
