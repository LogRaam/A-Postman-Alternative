/** Identifiers for things the user keeps: history entries, collections, folders, saved requests. */

/** A new identifier, unique enough for one person's workspace: the time, then six random characters. */
export function makeId(now = Date.now()) {
  return now.toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}
