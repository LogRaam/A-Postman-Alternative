/** Saved requests: Save and Save as, New, opening, renaming and removing, and the Collections tab. */

import { emptyDraft, copyDraft } from '../core/draft.js';
import { addCollection, addFolder, addRequest, updateRequestDraft, renameItem, removeItem, findRequest, requestPath } from '../core/collections.js';
import { makeId } from '../core/ids.js';
import { renderCollections } from './collections-panel.js';
import { askText, askSaveTarget } from './dialogs.js';
import { byId, onShortcut, setNotice, showSidebarTab } from './page.js';

/** Wires saving and the Collections tab to the state. */
export function startCollections(state) {
  const collections = () => state.get('collections');

  const show = () => renderCollections(byId('collections'), collections(), state.get('openRequestId'), {
    open: id => state.set({ draft: copyDraft(findRequest(collections(), id).request.draft), openRequestId: id }),
    addFolder: async collectionId => {
      const name = await askText({ title: 'New folder', label: 'Folder name', confirm: 'Add' });
      if (name) state.set({ collections: addFolder(collections(), collectionId, name, makeId()) });
    },
    rename: async (id, current) => {
      const name = await askText({ title: 'Rename', label: 'New name', initial: current, confirm: 'Rename' });
      if (name) state.set({ collections: renameItem(collections(), id, name) });
    },
    remove: (id, label) => {
      const kept = { collections: collections(), openRequestId: state.get('openRequestId') };
      state.set({ collections: removeItem(collections(), id) });
      setNotice('Removed ' + label + '.', () => state.set(kept));
    },
  });

  /** Save: updates the open saved request, or asks where to save a new one. asNew forces the question. */
  async function save(asNew) {
    const draft = state.get('draft');
    const openId = state.get('openRequestId');
    if (openId && !asNew) {
      state.set({ collections: updateRequestDraft(collections(), openId, draft) });
      setNotice('Saved.');
      return;
    }
    const target = await askSaveTarget(collections(), suggestName(draft));
    if (!target) return;
    let next = collections();
    let collectionId = target.collectionId;
    if (!collectionId) {
      collectionId = makeId();
      next = addCollection(next, target.newCollectionName, collectionId);
    }
    const id = makeId();
    next = addRequest(next, { collectionId, folderId: target.folderId, name: target.name, draft, id });
    state.set({ collections: next, openRequestId: id });
    showSidebarTab(byId('tab-collections'));
    setNotice('Saved as ' + requestPath(next, id) + '.');
  }

  byId('save').addEventListener('click', () => save(false));
  byId('save-as').addEventListener('click', () => save(true));
  onShortcut('s', event => save(event.shiftKey));
  byId('new-request').addEventListener('click', () => state.set({ draft: emptyDraft(), openRequestId: null }));
  byId('new-collection').addEventListener('click', async () => {
    const name = await askText({ title: 'New collection', label: 'Collection name', confirm: 'Create' });
    if (name) state.set({ collections: addCollection(collections(), name, makeId()) });
  });

  state.onChange(changed => { if (changed.has('collections') || changed.has('openRequestId')) show(); });
  show();
}

/** A name to offer when saving: the last part of the address path, or the method alone. */
function suggestName(draft) {
  const path = (draft.url || '').replace(/^https?:\/\//i, '').split('?')[0].split('/').filter(Boolean);
  return path.length > 1 ? draft.method + ' ' + path[path.length - 1] : draft.method + ' ' + (path[0] || 'request');
}
