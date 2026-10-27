// The export file: the workspace (history, collections, environments) written out and read back, across versions.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { serializeWorkspace, parseExport, EXPORT_FORMAT, EXPORT_VERSION } from '../src/core/export-format.js';
import { historyEntry } from '../src/core/history.js';
import { addCollection, addFolder, addRequest } from '../src/core/collections.js';
import { emptyDraft } from '../src/core/draft.js';
import { addEnvironment, setVariables } from '../src/core/environments.js';

function sampleWorkspace() {
  const history = [
    { ...historyEntry({ ...emptyDraft(), url: 'https://a' }, { status: 200 }, 1), id: 'h1' },
    { ...historyEntry({ ...emptyDraft(), url: 'https://b' }, { error: 'Cancelled.' }, 2), id: 'h2' },
  ];
  let collections = addFolder(addCollection([], 'API', 'c1'), 'c1', 'Users', 'f1');
  collections = addRequest(collections, { collectionId: 'c1', folderId: 'f1', name: 'List', draft: { ...emptyDraft(), url: 'https://a/users' }, id: 'r1' });
  collections = addRequest(collections, { collectionId: 'c1', name: 'Top', draft: emptyDraft(), id: 'r2' });
  const environments = setVariables(addEnvironment([], 'Dev', 'e1'), 'e1', [{ enabled: true, key: 'baseUrl', value: 'https://dev' }]);
  return { history, collections, environments };
}

describe('The export file', () => {
  test('round-trips: what is exported imports back unchanged', () => {
    const workspace = sampleWorkspace();
    assert.deepEqual(parseExport(serializeWorkspace(workspace, '2026-10-26T00:00:00.000Z')), workspace);
  });
  test('a file written by v0.1 (history only, no auth, collections or environments) still imports', () => {
    // Written by the real serializer of commit 0dfa0d9: see tests/fixtures. Never regenerate it.
    const old = parseExport(readFileSync(new URL('./fixtures/export-v0.1-0dfa0d9.json', import.meta.url), 'utf8'));
    assert.equal(old.history.length, 2);
    assert.deepEqual(old.history[0].draft.auth, { type: 'none', token: '', username: '', password: '' });
    assert.equal(old.history[0].draft.body, '{"a":1}');
    assert.deepEqual(old.collections, []);
    assert.deepEqual(old.environments, []);
  });
  test('refuses a file that is not JSON, or JSON that is not ours', () => {
    assert.throws(() => parseExport('nope'), /not JSON/);
    assert.throws(() => parseExport('{"format":"other"}'), /not an export from A Postman Alternative/);
  });
  test('refuses a file from a newer version and says to update', () => {
    assert.throws(() => parseExport(JSON.stringify({ format: EXPORT_FORMAT, version: EXPORT_VERSION + 1 })), /newer version of this app/);
  });
  test('names the first damaged field, in history or in a saved request', () => {
    const file = JSON.parse(serializeWorkspace(sampleWorkspace(), 'now'));
    file.history[0].draft.headers = [{ enabled: true, key: 5, value: '' }];
    assert.throws(() => parseExport(JSON.stringify(file)), /"history\[0\]\.draft\.headers\[0\]\.key" should be string/);
    const other = JSON.parse(serializeWorkspace(sampleWorkspace(), 'now'));
    delete other.collections[0].requests[1].draft.method;
    assert.throws(() => parseExport(JSON.stringify(other)), /"collections\[0\]\.requests\[1\]\.draft\.method" should be string/);
  });
});
