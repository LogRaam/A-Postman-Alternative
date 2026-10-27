// How a response and a failure are described to the reader.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { statusLabel, statusClass, formatBytes, formatDuration, prettyBody } from '../src/core/response.js';
import { explainFetchError } from '../src/core/errors.js';

describe('The response summary', () => {
  test('fills in the reason when HTTP/2 leaves statusText empty', () => {
    assert.equal(statusLabel(404, ''), '404 Not Found');
    assert.equal(statusLabel(299, ''), '299');
  });
  test('groups statuses into success, redirect, client error and server error', () => {
    assert.deepEqual([204, 302, 418, 503].map(statusClass), ['ok', 'redirect', 'client-error', 'server-error']);
  });
  test('says sizes and durations the way a reader does', () => {
    assert.deepEqual([formatBytes(512), formatBytes(1536), formatBytes(3 * 1024 * 1024)], ['512 B', '1.5 KB', '3.0 MB']);
    assert.deepEqual([formatDuration(84.6), formatDuration(1240)], ['85 ms', '1.24 s']);
  });
  test('re-indents a JSON body whatever its content type claimed', () => {
    assert.deepEqual(prettyBody('{"a":[1,2]}'), { text: '{\n  "a": [\n    1,\n    2\n  ]\n}', kind: 'json' });
  });
  test('shows a body that only looks like JSON as received', () => {
    assert.deepEqual(prettyBody('{not json'), { text: '{not json', kind: 'text' });
  });
});

describe('A failed send', () => {
  test('a TypeError is explained as CORS or unreachable, without pretending to know which', () => {
    const message = explainFetchError(new TypeError('Failed to fetch'), 'https://api.example.com', 'file:');
    assert.match(message, /CORS/);
    assert.match(message, /does not say which/);
  });
  test('an http address from an https page is named as mixed content', () => {
    assert.match(explainFetchError(new TypeError('x'), 'http://a.example', 'https:'), /blocks requests to plain http/);
  });
  test('a cancel says only that', () => {
    assert.equal(explainFetchError({ name: 'AbortError' }, 'https://a', 'file:'), 'Cancelled.');
  });
});
