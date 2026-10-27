/** The list of requests already sent: newest first, capped, each one enough to reload the editor. */

import { copyDraft } from './draft.js';
import { makeId } from './ids.js';

/** How many sent requests are kept; the oldest go first. */
export const HISTORY_LIMIT = 100;

/**
 * A history entry for a draft just sent and what came back (a status, or the error's text).
 * The draft is copied so later edits in the editor do not change what history recorded.
 */
export function historyEntry(draft, outcome, sentAt) {
  return {
    id: makeId(sentAt),
    sentAt,
    draft: copyDraft(draft),
    status: outcome.status ?? null,
    error: outcome.error ?? null,
  };
}

/** The history with this entry added at the top, trimmed to the limit. Never changes the list it is given. */
export function addToHistory(history, entry, limit = HISTORY_LIMIT) {
  return [entry, ...(history || [])].slice(0, limit);
}

/**
 * The history after importing entries from a file: both lists together, newest first, an entry already
 * present (same id) kept once, trimmed to the limit.
 */
export function mergeHistory(history, imported, limit = HISTORY_LIMIT) {
  const byId = new Map();
  for (const entry of [...(history || []), ...(imported || [])]) if (!byId.has(entry.id)) byId.set(entry.id, entry);
  return [...byId.values()].sort((a, b) => b.sentAt - a.sentAt).slice(0, limit);
}

/** One line naming an entry in the sidebar: method and the address without its scheme. */
export function historyLabel(entry) {
  const address = (entry.draft.url || '').replace(/^https?:\/\//i, '');
  return entry.draft.method + ' ' + (address || '(no address)');
}
