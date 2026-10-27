// Saved requests: collections, one level of folders, and what Save, rename, remove and import do to them.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addCollection, addFolder, addRequest, updateRequestDraft, renameItem, removeItem, findRequest, requestPath,
  mergeCollections, requestsIn,
} from '../src/core/collections.js';
import { emptyDraft } from '../src/core/draft.js';

const draft = url => ({ ...emptyDraft(), url });

/** A collection "API" with a folder "Users", one request in the folder and one at the top. */
function workspace() {
  let c = addCollection([], 'API', 'c1');
  c = addFolder(c, 'c1', 'Users', 'f1');
  c = addRequest(c, { collectionId: 'c1', folderId: 'f1', name: 'List users', draft: draft('https://a/users'), id: 'r1' });
  c = addRequest(c, { collectionId: 'c1', name: 'Health', draft: draft('https://a/health'), id: 'r2' });
  return c;
}

describe('Saving', () => {
  test('a request is saved in its folder, or at the top of the collection', () => {
    const [collection] = workspace();
    assert.deepEqual(requestsIn(collection, 'f1').map(r => r.name), ['List users']);
    assert.deepEqual(requestsIn(collection, null).map(r => r.name), ['Health']);
  });
  test('the saved draft is a copy: editing the editor afterwards changes nothing saved', () => {
    const edited = draft('https://a');
    const c = addRequest(addCollection([], 'X', 'c'), { collectionId: 'c', name: 'R', draft: edited, id: 'r' });
    edited.url = 'https://changed';
    assert.equal(findRequest(c, 'r').request.draft.url, 'https://a');
  });
  test('Save on an open request replaces its draft and nothing else', () => {
    const c = updateRequestDraft(workspace(), 'r1', draft('https://a/users?page=2'));
    assert.equal(findRequest(c, 'r1').request.draft.url, 'https://a/users?page=2');
    assert.equal(findRequest(c, 'r1').request.name, 'List users');
    assert.equal(findRequest(c, 'r2').request.draft.url, 'https://a/health');
  });
  test('a blank name falls back to a default rather than an empty label', () => {
    assert.equal(addCollection([], '   ', 'c')[0].name, 'New collection');
  });
});

describe('Finding, renaming, removing', () => {
  test('a request is named by its path: collection, folder, request', () => {
    assert.equal(requestPath(workspace(), 'r1'), 'API / Users / List users');
    assert.equal(requestPath(workspace(), 'r2'), 'API / Health');
    assert.equal(requestPath(workspace(), 'gone'), '');
  });
  test('rename finds a collection, a folder or a request by id', () => {
    const c = renameItem(renameItem(renameItem(workspace(), 'c1', 'Shop'), 'f1', 'People'), 'r2', 'Ping');
    assert.equal(requestPath(c, 'r1'), 'Shop / People / List users');
    assert.equal(requestPath(c, 'r2'), 'Shop / Ping');
  });
  test('removing a folder removes the requests in it, and only those', () => {
    const c = removeItem(workspace(), 'f1');
    assert.equal(findRequest(c, 'r1'), null);
    assert.ok(findRequest(c, 'r2'));
  });
  test('the list given is never changed, so undo can put it back', () => {
    const before = workspace();
    const copy = JSON.stringify(before);
    removeItem(before, 'c1');
    renameItem(before, 'r1', 'x');
    assert.equal(JSON.stringify(before), copy);
  });
});

describe('Importing collections', () => {
  test('new collections, folders and requests are added; ones already here are kept as they are', () => {
    const here = renameItem(workspace(), 'r1', 'Mine');
    const incoming = addRequest(workspace(), { collectionId: 'c1', name: 'New one', draft: draft('https://a/new'), id: 'r3' });
    const merged = mergeCollections(here, [...incoming, ...addCollection([], 'Other', 'c2')]);
    assert.equal(findRequest(merged, 'r1').request.name, 'Mine');
    assert.ok(findRequest(merged, 'r3'));
    assert.deepEqual(merged.map(c => c.name), ['API', 'Other']);
  });
  test('importing the same file twice changes nothing', () => {
    const once = mergeCollections([], workspace());
    assert.deepEqual(mergeCollections(once, workspace()), once);
  });
});
