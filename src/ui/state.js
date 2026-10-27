/**
 * The app's state: every value the page shows and keeps, in one place. A change goes through set(), which
 * saves the slices that changed and tells every controller, so no controller holds its own copy.
 */

import { emptyDraft, copyDraft } from '../core/draft.js';
import { findRequest } from '../core/collections.js';
import { loadSlice, saveSlice } from './store.js';

/**
 * The state as last saved. get(name) reads a slice; set(changes, origin) replaces slices, saves them and calls
 * every onChange listener with (the set of changed names, origin), origin naming the controller that made the
 * change so it can skip redrawing what the user is typing in.
 */
export function createState() {
  const values = {
    draft: copyDraft(loadSlice('draft') || emptyDraft()),
    history: loadSlice('history'),
    collections: loadSlice('collections'),
    openRequestId: loadSlice('openRequestId'),
    environments: loadSlice('environments'),
    activeEnvironmentId: loadSlice('activeEnvironmentId'),
  };
  keepLinksValid(values);
  const listeners = [];
  return {
    get: name => values[name],
    set(changes, origin = null) {
      Object.assign(values, changes);
      const changed = new Set([...Object.keys(changes), ...keepLinksValid(values)]);
      for (const name of changed) saveSlice(name, values[name]);
      for (const listener of listeners) listener(changed, origin);
    },
    onChange(listener) {
      listeners.push(listener);
    },
    /** The environment requests are resolved against, or null. */
    activeEnvironment: () => values.environments.find(e => e.id === values.activeEnvironmentId) || null,
  };
}

/**
 * Clears a link to something that no longer exists: the open request once its collection entry is removed,
 * the active environment once it is deleted. Returns the names it cleared.
 */
function keepLinksValid(values) {
  const cleared = [];
  if (values.openRequestId && !findRequest(values.collections, values.openRequestId)) {
    values.openRequestId = null;
    cleared.push('openRequestId');
  }
  if (values.activeEnvironmentId && !values.environments.some(e => e.id === values.activeEnvironmentId)) {
    values.activeEnvironmentId = null;
    cleared.push('activeEnvironmentId');
  }
  return cleared;
}
