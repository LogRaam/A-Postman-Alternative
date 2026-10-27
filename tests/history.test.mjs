// The history of sent requests, and the draft every stored request keeps.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { historyEntry, addToHistory, mergeHistory, historyLabel } from '../src/core/history.js';
import { emptyDraft, copyDraft, sameDraft } from '../src/core/draft.js';

const sample = (id, sentAt) => ({ ...historyEntry({ ...emptyDraft(), url: 'https://example.com/' + id }, { status: 200 }, sentAt), id });

describe('History', () => {
  test('a new entry goes on top and the oldest fall off past the limit', () => {
    const history = addToHistory([sample('b', 2), sample('a', 1)], sample('c', 3), 2);
    assert.deepEqual(history.map(e => e.id), ['c', 'b']);
  });
  test('an entry keeps the draft as it was sent, not as edited afterwards', () => {
    const draft = { ...emptyDraft(), headers: [{ enabled: true, key: 'X', value: '1' }] };
    const entry = historyEntry(draft, { status: 200 }, 1);
    draft.headers[0].value = 'changed';
    assert.equal(entry.draft.headers[0].value, '1');
  });
  test('importing keeps an entry already present once and sorts newest first', () => {
    const merged = mergeHistory([sample('a', 1), sample('c', 3)], [sample('b', 2), sample('a', 1)]);
    assert.deepEqual(merged.map(e => e.id), ['c', 'b', 'a']);
  });
  test('the sidebar label is the method and the address without its scheme', () => {
    assert.equal(historyLabel(sample('x', 1)), 'GET example.com/x');
  });
});

describe('The draft', () => {
  test('a copy fills fields missing from older data with their defaults', () => {
    assert.deepEqual(copyDraft({ url: 'https://a', headers: [{ key: 'X' }] }),
      {
        method: 'GET', url: 'https://a', params: [], headers: [{ enabled: true, key: 'X', value: '' }], bodyMode: 'none', body: '',
        auth: { type: 'none', token: '', username: '', password: '' },
      });
  });
  test('two drafts are the same when they would send the same request', () => {
    assert.ok(sameDraft({ ...emptyDraft(), url: 'https://a' }, { url: 'https://a' }));
    assert.ok(!sameDraft({ ...emptyDraft(), url: 'https://a' }, { ...emptyDraft(), url: 'https://b' }));
  });
});
