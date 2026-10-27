// What the editor's draft becomes when it is sent: the address, the headers, the body and the warnings.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUrl, enabledRows } from '../src/core/url.js';
import { toFetchRequest, isForbiddenHeader } from '../src/core/request.js';
import { emptyDraft } from '../src/core/draft.js';

const draft = changes => ({ ...emptyDraft(), url: 'https://example.com/items', ...changes });

describe('The address', () => {
  test('adds https when the address has no scheme', () => {
    assert.equal(buildUrl('example.com/a', []), 'https://example.com/a');
  });
  test('appends enabled parameter rows after the query the address already has', () => {
    const url = buildUrl('https://example.com/a?x=1', [{ enabled: true, key: 'y', value: '2 3' }]);
    assert.equal(url, 'https://example.com/a?x=1&y=2+3');
  });
  test('skips unticked rows and rows without a name', () => {
    const rows = [{ enabled: false, key: 'off', value: '1' }, { enabled: true, key: '  ', value: '2' }, { enabled: true, key: ' on ', value: '3' }];
    assert.deepEqual(enabledRows(rows), [{ key: 'on', value: '3' }]);
  });
  test('refuses an empty address with an example of a good one', () => {
    assert.throws(() => buildUrl('  ', []), /Type an address first/);
  });
  test('refuses schemes other than http and https', () => {
    assert.throws(() => buildUrl('ftp://example.com', []), /Only http and https/);
  });
});

describe('Headers', () => {
  test('are sent in the order typed', () => {
    const { init } = toFetchRequest(draft({ headers: [{ enabled: true, key: 'X-A', value: '1' }, { enabled: true, key: 'X-B', value: '2' }] }));
    assert.deepEqual(init.headers, [['X-A', '1'], ['X-B', '2']]);
  });
  test('a header the browser forbids is not sent, and the user is told', () => {
    const { init, warnings } = toFetchRequest(draft({ headers: [{ enabled: true, key: 'Cookie', value: 'a=1' }] }));
    assert.deepEqual(init.headers, []);
    assert.match(warnings[0], /does not let a page set "Cookie"/);
  });
  test('forbidden names include the proxy- and sec- families, in any case', () => {
    assert.ok(isForbiddenHeader('Sec-Fetch-Mode'));
    assert.ok(isForbiddenHeader('PROXY-Authorization'));
    assert.ok(!isForbiddenHeader('Authorization'));
  });
});

describe('The body', () => {
  test('a JSON body is checked and gets a JSON content type when none was typed', () => {
    const { init } = toFetchRequest(draft({ method: 'POST', bodyMode: 'json', body: '{"a":1}' }));
    assert.equal(init.body, '{"a":1}');
    assert.deepEqual(init.headers, [['Content-Type', 'application/json']]);
  });
  test('a content type the user typed is kept as typed', () => {
    const { init } = toFetchRequest(draft({ method: 'POST', bodyMode: 'json', body: '{}', headers: [{ enabled: true, key: 'content-type', value: 'application/vnd.api+json' }] }));
    assert.deepEqual(init.headers, [['content-type', 'application/vnd.api+json']]);
  });
  test('invalid JSON stops the send with the parser reason', () => {
    assert.throws(() => toFetchRequest(draft({ method: 'POST', bodyMode: 'json', body: '{a:1}' })), /The JSON body is not valid/);
  });
  test('GET and HEAD send no body, and the user is told', () => {
    const { init, warnings } = toFetchRequest(draft({ method: 'GET', bodyMode: 'text', body: 'hello' }));
    assert.equal(init.body, undefined);
    assert.match(warnings[0], /carries no body/);
  });
  test('raw text is sent as typed with no content type added', () => {
    const { init } = toFetchRequest(draft({ method: 'PUT', bodyMode: 'text', body: 'plain' }));
    assert.equal(init.body, 'plain');
    assert.deepEqual(init.headers, []);
  });
});
