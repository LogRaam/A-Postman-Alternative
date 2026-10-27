/** Names the user gives to things: collections, folders, saved requests, environments. */

/** A name trimmed, or the fallback when nothing but spaces was typed. */
export function cleanName(name, fallback) {
  const trimmed = (name || '').trim();
  return trimmed || fallback;
}
