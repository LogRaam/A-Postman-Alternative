// The app's state and what it keeps in the browser: one place for every value, saved under keys that never change.

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { STORAGE_KEYS, loadSlice } from '../src/ui/store.js';
import { createState } from '../src/ui/state.js';
import { addCollection, addRequest } from '../src/core/collections.js';
import { addEnvironment } from '../src/core/environments.js';
import { emptyDraft } from '../src/core/draft.js';

/** A localStorage stand-in, fresh for every test. */
beforeEach(() => {
  const items = new Map();
  globalThis.window = { localStorage: { getItem: k => (items.has(k) ? items.get(k) : null), setItem: (k, v) => items.set(k, String(v)) } };
});

describe('What is kept in the browser', () => {
  test('the storage keys never change: renaming one would lose users\' data on their next visit', () => {
    assert.deepEqual(STORAGE_KEYS, {
      draft: 'postman-alternative.draft.v1',
      history: 'postman-alternative.history.v1',
      collections: 'postman-alternative.collections.v1',
      openRequestId: 'postman-alternative.open-request.v1',
      environments: 'postman-alternative.environments.v1',
      activeEnvironmentId: 'postman-alternative.active-environment.v1',
    });
  });
  test('a damaged or missing slice reads as its fallback, never as garbage', () => {
    window.localStorage.setItem(STORAGE_KEYS.history, '{"not":"a list"}');
    window.localStorage.setItem(STORAGE_KEYS.openRequestId, '42');
    assert.deepEqual(loadSlice('history'), []);
    assert.equal(loadSlice('openRequestId'), null);
    assert.equal(loadSlice('draft'), null);
  });
  test('without any storage at all the app still starts, with an empty workspace', () => {
    delete globalThis.window;
    const state = createState();
    assert.deepEqual(state.get('history'), []);
    assert.equal(state.get('draft').method, 'GET');
  });
});

describe('The state', () => {
  test('a change is saved and survives a reload', () => {
    createState().set({ draft: { ...emptyDraft(), url: 'https://kept' } });
    assert.equal(createState().get('draft').url, 'https://kept');
  });
  test('listeners hear which slices changed and which controller changed them', () => {
    const state = createState();
    const heard = [];
    state.onChange((changed, origin) => heard.push([[...changed], origin]));
    state.set({ history: [] }, 'test');
    assert.deepEqual(heard, [[['history'], 'test']]);
  });
  test('removing the open request clears the link to it, and listeners hear that too', () => {
    const state = createState();
    const collections = addRequest(addCollection([], 'C', 'c'), { collectionId: 'c', name: 'R', draft: emptyDraft(), id: 'r' });
    state.set({ collections, openRequestId: 'r' });
    const heard = [];
    state.onChange(changed => heard.push(...changed));
    state.set({ collections: [] });
    assert.equal(state.get('openRequestId'), null);
    assert.deepEqual(heard.sort(), ['collections', 'openRequestId']);
  });
  test('deleting the active environment leaves no environment active', () => {
    const state = createState();
    state.set({ environments: addEnvironment([], 'Dev', 'e'), activeEnvironmentId: 'e' });
    assert.equal(state.activeEnvironment().name, 'Dev');
    state.set({ environments: [] });
    assert.equal(state.activeEnvironment(), null);
    assert.equal(createState().get('activeEnvironmentId'), null);
  });
});
