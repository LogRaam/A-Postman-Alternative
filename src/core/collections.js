/**
 * Collections: named requests the user saves, grouped in collections and, optionally, one level of folders.
 * Every function returns a new list and never changes the one it is given, so the page can offer undo.
 */

import { copyDraft } from './draft.js';
import { cleanName } from './names.js';

/** The list with a new, empty collection added at the end. */
export function addCollection(collections, name, id) {
  return [...collections, { id, name: cleanName(name, 'New collection'), folders: [], requests: [] }];
}

/** The list with a folder added to a collection. */
export function addFolder(collections, collectionId, name, id) {
  return collections.map(c => (c.id === collectionId ? { ...c, folders: [...c.folders, { id, name: cleanName(name, 'New folder') }] } : c));
}

/** The list with the draft saved as a new named request, in a collection and optionally one of its folders. */
export function addRequest(collections, { collectionId, folderId = null, name, draft, id }) {
  return collections.map(c => (c.id === collectionId
    ? { ...c, requests: [...c.requests, { id, name: cleanName(name, 'New request'), folderId, draft: copyDraft(draft) }] }
    : c));
}

/** The list with a saved request's draft replaced by this one: what Save does on a request already saved. */
export function updateRequestDraft(collections, requestId, draft) {
  return collections.map(c => ({ ...c, requests: c.requests.map(r => (r.id === requestId ? { ...r, draft: copyDraft(draft) } : r)) }));
}

/** The list with a collection, folder or request renamed, whichever has this id. */
export function renameItem(collections, id, name) {
  return collections.map(c => ({
    ...c,
    name: c.id === id ? cleanName(name, c.name) : c.name,
    folders: c.folders.map(f => (f.id === id ? { ...f, name: cleanName(name, f.name) } : f)),
    requests: c.requests.map(r => (r.id === id ? { ...r, name: cleanName(name, r.name) } : r)),
  }));
}

/** The list without the collection, folder or request with this id. A folder goes with the requests in it. */
export function removeItem(collections, id) {
  return collections
    .filter(c => c.id !== id)
    .map(c => ({
      ...c,
      folders: c.folders.filter(f => f.id !== id),
      requests: c.requests.filter(r => r.id !== id && r.folderId !== id),
    }));
}

/** The saved request with this id and the collection and folder holding it, or null. */
export function findRequest(collections, requestId) {
  for (const collection of collections) {
    const request = collection.requests.find(r => r.id === requestId);
    if (request) return { collection, folder: collection.folders.find(f => f.id === request.folderId) || null, request };
  }
  return null;
}

/** "Collection / Folder / Request" for a saved request, or '' when it no longer exists. */
export function requestPath(collections, requestId) {
  const found = findRequest(collections, requestId);
  if (!found) return '';
  return [found.collection.name, found.folder && found.folder.name, found.request.name].filter(Boolean).join(' / ');
}

/**
 * The collections after importing some from a file. A collection, folder or request already present (same id)
 * is kept as it is here; anything new is added. Importing the same file twice changes nothing.
 */
export function mergeCollections(collections, imported) {
  const result = collections.map(c => ({ ...c, folders: [...c.folders], requests: [...c.requests] }));
  for (const incoming of imported || []) {
    const existing = result.find(c => c.id === incoming.id);
    if (!existing) {
      result.push({ ...incoming, folders: [...incoming.folders], requests: [...incoming.requests] });
      continue;
    }
    for (const folder of incoming.folders) if (!existing.folders.some(f => f.id === folder.id)) existing.folders.push(folder);
    for (const request of incoming.requests) if (!existing.requests.some(r => r.id === request.id)) existing.requests.push(request);
  }
  return result;
}

/** The requests of a collection that sit directly in it, or in one folder, in the order they were saved. */
export function requestsIn(collection, folderId = null) {
  return collection.requests.filter(r => (r.folderId || null) === folderId);
}
