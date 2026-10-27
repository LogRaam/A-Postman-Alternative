// Environments: {{variables}} resolved when a request is sent, so one saved request works everywhere.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addEnvironment, renameEnvironment, removeEnvironment, setVariables, mergeEnvironments, referencedNames, resolveDraft,
  missingVariablesWarning,
} from '../src/core/environments.js';
import { emptyDraft } from '../src/core/draft.js';

const dev = setVariables(addEnvironment([], 'Dev', 'e1'), 'e1', [
  { enabled: true, key: 'baseUrl', value: 'https://dev.example.com' },
  { enabled: true, key: 'token', value: 'abc' },
  { enabled: false, key: 'unused', value: 'off' },
]);

describe('Resolving a request', () => {
  test('replaces {{name}} in the address, parameters, headers and body', () => {
    const draft = {
      ...emptyDraft(), method: 'POST', url: '{{baseUrl}}/items', bodyMode: 'json', body: '{"t":"{{token}}"}',
      params: [{ enabled: true, key: 'k', value: '{{token}}' }],
      headers: [{ enabled: true, key: 'Authorization', value: 'Bearer {{ token }}' }],
    };
    const { draft: sent, missing } = resolveDraft(draft, dev[0]);
    assert.equal(sent.url, 'https://dev.example.com/items');
    assert.equal(sent.params[0].value, 'abc');
    assert.equal(sent.headers[0].value, 'Bearer abc');
    assert.equal(sent.body, '{"t":"abc"}');
    assert.deepEqual(missing, []);
  });
  test('the editor keeps the {{names}}: resolving never changes the draft it is given', () => {
    const draft = { ...emptyDraft(), url: '{{baseUrl}}/a' };
    resolveDraft(draft, dev[0]);
    assert.equal(draft.url, '{{baseUrl}}/a');
  });
  test('an unticked variable does not count, and an unknown name is left as typed and reported', () => {
    const { draft: sent, missing } = resolveDraft({ ...emptyDraft(), url: '{{baseUrl}}/{{unused}}/{{nope}}' }, dev[0]);
    assert.equal(sent.url, 'https://dev.example.com/{{unused}}/{{nope}}');
    assert.deepEqual(missing, ['unused', 'nope']);
  });
  test('with no environment selected, every reference is reported', () => {
    assert.deepEqual(resolveDraft({ ...emptyDraft(), url: '{{a}}/{{b}}' }, null).missing, ['a', 'b']);
  });
  test('the warning names the variables and the environment, or says none is selected', () => {
    assert.equal(missingVariablesWarning(['nope'], dev[0]), '{{nope}} is not defined in "Dev"; sent as typed.');
    assert.match(missingVariablesWarning(['a', 'b'], null), /\{\{a\}\}, \{\{b\}\} used, but no environment is selected/);
    assert.equal(missingVariablesWarning([], null), '');
  });
  test('lists the names an address refers to, each once', () => {
    assert.deepEqual(referencedNames('{{a}}/{{ b }}/{{a}}'), ['a', 'b']);
  });
});

describe('Managing environments', () => {
  test('rename keeps the old name when the new one is blank', () => {
    assert.equal(renameEnvironment(dev, 'e1', '  ')[0].name, 'Dev');
    assert.equal(renameEnvironment(dev, 'e1', 'Test')[0].name, 'Test');
  });
  test('remove takes one environment out and leaves the list given untouched', () => {
    assert.deepEqual(removeEnvironment(dev, 'e1'), []);
    assert.equal(dev.length, 1);
  });
  test('importing adds new environments and keeps the ones already here as they are', () => {
    const incoming = [...renameEnvironment(dev, 'e1', 'Theirs'), ...addEnvironment([], 'Prod', 'e2')];
    assert.deepEqual(mergeEnvironments(dev, incoming).map(e => e.name), ['Dev', 'Prod']);
  });
});
