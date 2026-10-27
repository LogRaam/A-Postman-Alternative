// The page as a user meets it: the real built page in headless Chrome, driven by clicks and typing, with a fake
// server. Each test that names a commit pins a bug found there, so it cannot come back.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { runInPage, SKIP_UI } from './ui-harness.mjs';

const options = { skip: SKIP_UI, concurrency: 4 };

describe('Sending', options, () => {
  test('sends the typed address with its parameters and shows the response', { skip: SKIP_UI }, async () => {
    const seen = await runInPage(async ({ $, type, calls, until, text }) => {
      type($('url'), 'https://api.example.com/items');
      $('params').querySelector('.link').click();
      const [key, value] = $('params').querySelectorAll('.row input[type=text]');
      type(key, 'page');
      type(value, '2');
      $('send').click();
      await until(() => text('status'), 'a status');
      return { url: calls[0].url, status: text('status'), body: text('response-body'), history: text('history') };
    }, () => ({ status: 200, body: '{"items":[1]}' }));
    assert.equal(seen.url, 'https://api.example.com/items?page=2');
    assert.equal(seen.status, '200 OK');
    assert.match(seen.body, /"items": \[\s+1\s+\]/);
    assert.match(seen.history, /200GET api\.example\.com\/items/);
  });

  test('the history keeps the request as sent, even when the address is edited during a slow response (9bc19d4)', { skip: SKIP_UI }, async () => {
    const history = await runInPage(async ({ $, type, until, text, sleep }) => {
      type($('url'), 'https://api.example.com/slow');
      $('send').click();
      await sleep(100);
      type($('url'), 'https://api.example.com/edited-while-waiting');
      await until(() => text('status'), 'the slow response');
      return text('history');
    }, () => ({ status: 200, body: '{}', delay: 500 }));
    assert.match(history, /api\.example\.com\/slow/);
    assert.doesNotMatch(history, /edited-while-waiting/);
  });

  test('a request the browser cannot complete is explained, and kept in history as failed', { skip: SKIP_UI }, async () => {
    const seen = await runInPage(async ({ $, type, until, text }) => {
      type($('url'), 'https://no-cors.example.com/');
      $('send').click();
      await until(() => !$('response-error').hidden, 'the error');
      return { error: text('response-error'), history: text('history') };
    }, () => ({ fail: true }));
    assert.match(seen.error, /CORS/);
    assert.match(seen.history, /^failed/);
  });

  test('a header the browser forbids is struck through, reported, and not sent', { skip: SKIP_UI }, async () => {
    const seen = await runInPage(async ({ $, type, calls, until, text }) => {
      type($('url'), 'https://api.example.com/');
      $('headers').querySelector('.link').click();
      const [key, value] = $('headers').querySelectorAll('.row input[type=text]');
      type(key, 'Cookie');
      type(value, 'a=1');
      const struck = key.classList.contains('forbidden');
      $('send').click();
      await until(() => text('status'), 'a status');
      return { struck, sent: calls[0].headers, warning: text('warnings') };
    });
    assert.ok(seen.struck);
    assert.equal(seen.sent.cookie, undefined);
    assert.match(seen.warning, /does not let a page set "Cookie"/);
  });
});

describe('Collections', options, () => {
  test('Save files the request in a new collection; an edit flags it unsaved; Ctrl+S saves it again', { skip: SKIP_UI }, async () => {
    const seen = await runInPage(async ({ $, type, key, until, text, button }) => {
      type($('url'), 'https://api.example.com/users');
      $('save').click();
      await until(() => $('dialog').open, 'the save dialog');
      const suggested = $('dialog').querySelector('input').value;
      button($('dialog'), 'Save').click();
      await until(() => text('request-title') !== 'Unsaved request', 'the saved title');
      const title = text('request-title');
      type($('url'), 'https://api.example.com/users?page=2');
      const flagged = !$('request-dirty').hidden;
      key('s');
      return { suggested, title, flagged, clean: $('request-dirty').hidden, tree: text('collections') };
    });
    assert.equal(seen.suggested, 'GET users');
    assert.equal(seen.title, 'My requests / GET users');
    assert.ok(seen.flagged);
    assert.ok(seen.clean);
    assert.match(seen.tree, /My requests/);
  });

  test('removing the open request and pressing Undo brings it back, opened (495d3db)', { skip: SKIP_UI }, async () => {
    const seen = await runInPage(async ({ $, type, until, text, button }) => {
      type($('url'), 'https://api.example.com/orders');
      $('save').click();
      await until(() => $('dialog').open, 'the save dialog');
      button($('dialog'), 'Save').click();
      await until(() => text('request-title') !== 'Unsaved request', 'the saved title');
      $('collections').querySelector('.request button[title="Remove this request"]').click();
      const afterRemove = text('request-title');
      button($('notice'), 'Undo').click();
      return { afterRemove, afterUndo: text('request-title') };
    });
    assert.equal(seen.afterRemove, 'Unsaved request');
    assert.equal(seen.afterUndo, 'My requests / GET orders');
  });
});

describe('Environments and auth', options, () => {
  test('a variable is resolved in what is sent, while the editor and the history keep {{name}}', { skip: SKIP_UI }, async () => {
    const seen = await runInPage(async ({ $, type, calls, until, text, button }) => {
      $('manage-environments').click();
      await until(() => $('dialog').open, 'the manager');
      button($('dialog'), 'New').click();
      $('dialog').querySelector('.env-rows .link').click();
      const [name, value] = $('dialog').querySelectorAll('.env-rows .row input[type=text]');
      type(name, 'baseUrl');
      type(value, 'https://dev.example.com');
      button($('dialog'), 'Done').click();
      await until(() => $('environment').value !== '', 'the new environment to be selected');
      type($('url'), '{{baseUrl}}/health');
      const preview = text('resolved-url');
      $('send').click();
      await until(() => text('status'), 'a status');
      return { preview, sent: calls[0].url, editor: $('url').value, history: text('history') };
    });
    assert.equal(seen.preview, 'Sends to https://dev.example.com/health');
    assert.equal(seen.sent, 'https://dev.example.com/health');
    assert.equal(seen.editor, '{{baseUrl}}/health');
    assert.match(seen.history, /\{\{baseUrl\}\}\/health/);
  });

  test('a Bearer token taken from a variable is sent as the Authorization header', { skip: SKIP_UI }, async () => {
    const sent = await runInPage(async ({ $, type, calls, until, text, button }) => {
      $('manage-environments').click();
      await until(() => $('dialog').open, 'the manager');
      button($('dialog'), 'New').click();
      $('dialog').querySelector('.env-rows .link').click();
      const [name, value] = $('dialog').querySelectorAll('.env-rows .row input[type=text]');
      type(name, 'token');
      type(value, 's3cret');
      button($('dialog'), 'Done').click();
      await until(() => $('environment').value !== '', 'the new environment to be selected');
      type($('url'), 'https://api.example.com/me');
      type($('auth').querySelector('select'), 'bearer');
      type($('auth').querySelector('input'), '{{token}}');
      $('send').click();
      await until(() => text('status'), 'a status');
      return calls[0].headers;
    });
    assert.equal(sent.authorization, 'Bearer s3cret');
  });
});
