// Authentication from the Auth tab, and the rule that every typed field of a request can use {{variables}}.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { authHeader, authWarnings, copyAuth } from '../src/core/auth.js';
import { toFetchRequest } from '../src/core/request.js';
import { emptyDraft, copyDraft, DRAFT_FIELDS, DRAFT_CHOICE_FIELDS } from '../src/core/draft.js';
import { resolveDraft, addEnvironment, setVariables } from '../src/core/environments.js';

const draft = auth => ({ ...emptyDraft(), url: 'https://example.com', auth: { ...copyAuth(), ...auth } });

describe('The Authorization header', () => {
  test('Bearer sends the token as typed', () => {
    assert.deepEqual(authHeader({ type: 'bearer', token: 'abc.def' }), ['Authorization', 'Bearer abc.def']);
  });
  test('Basic encodes user:password in Base64, accents included (UTF-8)', () => {
    assert.deepEqual(authHeader({ type: 'basic', username: 'Aladdin', password: 'open sesame' }), ['Authorization', 'Basic QWxhZGRpbjpvcGVuIHNlc2FtZQ==']);
    assert.deepEqual(authHeader({ type: 'basic', username: 'André', password: 'é' }), ['Authorization', 'Basic ' + Buffer.from('André:é', 'utf8').toString('base64')]);
  });
  test('none, or an empty Bearer token, sends no header and an empty token is reported', () => {
    assert.equal(authHeader({ type: 'none' }), null);
    assert.equal(authHeader({ type: 'bearer', token: '' }), null);
    assert.match(authWarnings({ type: 'bearer', token: '' }, false)[0], /token is empty/);
  });
  test('the Auth tab becomes the request\'s Authorization header', () => {
    const { init } = toFetchRequest(draft({ type: 'bearer', token: 't' }));
    assert.deepEqual(init.headers, [['Authorization', 'Bearer t']]);
  });
  test('an Authorization header typed in the Headers tab wins, and the user is told', () => {
    const typed = { ...draft({ type: 'bearer', token: 't' }), headers: [{ enabled: true, key: 'authorization', value: 'Custom x' }] };
    const { init, warnings } = toFetchRequest(typed);
    assert.deepEqual(init.headers, [['authorization', 'Custom x']]);
    assert.match(warnings[0], /sent instead of the Auth tab/);
  });
  test('a draft saved before the Auth tab existed opens with no authentication', () => {
    assert.deepEqual(copyDraft({ url: 'https://old' }).auth, { type: 'none', token: '', username: '', password: '' });
  });
});

describe('Variables reach every typed field', () => {
  test('a {{token}} in the Bearer token is resolved from the environment', () => {
    const env = setVariables(addEnvironment([], 'Dev', 'e'), 'e', [{ enabled: true, key: 'token', value: 'secret' }])[0];
    assert.equal(resolveDraft(draft({ type: 'bearer', token: '{{token}}' }), env).draft.auth.token, 'secret');
  });
  test('every text field of DRAFT_FIELDS is resolved, except the choices named in DRAFT_CHOICE_FIELDS', () => {
    // Fills EVERY string field of a draft with {{v}}, then resolves: a field added to DRAFT_FIELDS and
    // forgotten in resolveDraft keeps its {{v}} and fails here, named.
    const filled = { ...emptyDraft(), bodyMode: 'text', params: [{}], headers: [{}], auth: { type: 'basic' } };
    for (const [path, type] of DRAFT_FIELDS) if (type === 'string' && !DRAFT_CHOICE_FIELDS.includes(path)) setPath(filled, path, '{{v}}');
    const env = setVariables(addEnvironment([], 'E', 'e'), 'e', [{ enabled: true, key: 'v', value: 'x' }])[0];
    const resolved = resolveDraft(filled, env).draft;
    const unresolved = DRAFT_FIELDS
      .filter(([path, type]) => type === 'string' && !DRAFT_CHOICE_FIELDS.includes(path))
      .filter(([path]) => getPath(resolved, path) !== 'x')
      .map(([path]) => path);
    assert.deepEqual(unresolved, []);
  });
});

/** Sets a draft field by its DRAFT_FIELDS path; "rows[]" means the first row. */
function setPath(object, path, value) {
  const steps = path.split('.');
  let here = object;
  for (const step of steps.slice(0, -1)) here = step.endsWith('[]') ? here[step.slice(0, -2)][0] : here[step];
  here[steps.at(-1)] = value;
}

/** Reads a draft field by its DRAFT_FIELDS path; "rows[]" means the first row. */
function getPath(object, path) {
  return path.split('.').reduce((here, step) => (step.endsWith('[]') ? here[step.slice(0, -2)][0] : here[step]), object);
}
