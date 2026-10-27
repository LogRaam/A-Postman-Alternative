/**
 * The draft: one request as the editor holds it, and as history entries and saved requests keep it.
 * Every place that stores a request stores this shape, so its fields are listed once, here.
 */

import { copyRow, ROW_FIELDS } from './rows.js';
import { fieldsAt } from './fields.js';
import { noAuth, copyAuth, AUTH_FIELDS } from './auth.js';

/** Every field of a draft, as [path, type], for the export file's validator and map. "[]" marks array items. */
export const DRAFT_FIELDS = [
  ['method', 'string'],
  ['url', 'string'],
  ['params', 'array'],
  ...fieldsAt('params[]', ROW_FIELDS),
  ['headers', 'array'],
  ...fieldsAt('headers[]', ROW_FIELDS),
  ['bodyMode', 'string'],
  ['body', 'string'],
  ['auth', 'object'],
  ...fieldsAt('auth', AUTH_FIELDS),
];

/**
 * Draft text fields that are choices from a fixed list, not text the user types: never resolved against an
 * environment. Every other string field of DRAFT_FIELDS is (tests/environments.test.mjs checks it).
 */
export const DRAFT_CHOICE_FIELDS = ['method', 'bodyMode', 'auth.type'];

/** A new, empty draft: what the editor shows on first open. */
export function emptyDraft() {
  return { method: 'GET', url: '', params: [], headers: [], bodyMode: 'none', body: '', auth: noAuth() };
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
    auth: copyAuth(draft.auth),
  };
}

/** True when two drafts would send the same request: what "unsaved changes" means for a saved request. */
export function sameDraft(a, b) {
  return JSON.stringify(copyDraft(a)) === JSON.stringify(copyDraft(b));
}
