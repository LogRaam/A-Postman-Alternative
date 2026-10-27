// The history of sent requests, and the export file that carries it between machines and versions.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { historyEntry, addToHistory, mergeHistory, historyLabel } from '../src/core/history.js';
import { serializeHistory, parseExport, EXPORT_VERSION } from '../src/core/export-format.js';
import { emptyDraft } from '../src/core/request.js';

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

describe('The export file', () => {
  test('round-trips: what is exported imports back unchanged', () => {
    const history = [sample('a', 1), { ...sample('b', 2), status: null, error: 'Cancelled.' }];
    assert.deepEqual(parseExport(serializeHistory(history, '2026-10-26T00:00:00.000Z')), history);
  });
  test('refuses a file that is not JSON, or JSON that is not ours', () => {
    assert.throws(() => parseExport('nope'), /not JSON/);
    assert.throws(() => parseExport('{"format":"other"}'), /not an export from A Postman Alternative/);
  });
  test('refuses a file from a newer version and says to update', () => {
    assert.throws(() => parseExport(JSON.stringify({ format: 'postman-alternative', version: EXPORT_VERSION + 1 })), /newer version of this app/);
  });
  test('names the first damaged field', () => {
    const file = JSON.parse(serializeHistory([sample('a', 1)], 'now'));
    file.history[0].draft.headers = [{ enabled: true, key: 5, value: '' }];
    assert.throws(() => parseExport(JSON.stringify(file)), /"history\[0\]\.draft\.headers\[0\]\.key" should be string/);
  });
});
