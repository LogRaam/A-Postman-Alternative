/** The page: wires the editor, the send button, the response panel and the history sidebar together. */

import { METHODS, emptyDraft, toFetchRequest, methodTakesNoBody } from '../core/request.js';
import { statusLabel, statusClass, formatBytes, formatDuration, prettyBody } from '../core/response.js';
import { explainFetchError } from '../core/errors.js';
import { historyEntry, addToHistory, mergeHistory, historyLabel, copyDraft } from '../core/history.js';
import { serializeHistory, parseExport } from '../core/export-format.js';
import { loadDraft, saveDraft, loadHistory, saveHistory } from './store.js';
import { renderRows } from './rows-editor.js';

/** Starts the app once the page is loaded. */
export function startApp() {
  const $ = id => document.getElementById(id);
  let draft = loadDraft() || emptyDraft();
  let history = loadHistory();
  let inFlight = null;

  const method = $('method');
  for (const name of METHODS) method.append(new Option(name, name));

  const changed = () => { saveDraft(draft); refreshBodyHint(); };

  function showDraft() {
    method.value = draft.method;
    $('url').value = draft.url;
    $('body-mode').value = draft.bodyMode;
    $('body').value = draft.body;
    renderRows($('params'), draft.params, rows => { draft.params = rows; changed(); }, { keyPlaceholder: 'Parameter' });
    renderRows($('headers'), draft.headers, rows => { draft.headers = rows; changed(); }, { keyPlaceholder: 'Header', checkHeaders: true });
    refreshBodyHint();
  }

  function refreshBodyHint() {
    $('body').hidden = draft.bodyMode === 'none';
    $('body-hint').textContent = draft.bodyMode !== 'none' && methodTakesNoBody(draft.method)
      ? 'A ' + draft.method + ' request carries no body: this one will not be sent.'
      : '';
    $('tab-params').textContent = 'Params' + countLabel(draft.params);
    $('tab-headers').textContent = 'Headers' + countLabel(draft.headers);
  }

  method.addEventListener('change', () => { draft.method = method.value; changed(); });
  $('url').addEventListener('input', () => { draft.url = $('url').value; changed(); });
  $('body-mode').addEventListener('change', () => { draft.bodyMode = $('body-mode').value; changed(); });
  $('body').addEventListener('input', () => { draft.body = $('body').value; changed(); });

  setUpTabs('request-tabs');
  setUpTabs('response-tabs');

  $('request-line').addEventListener('submit', event => {
    event.preventDefault();
    if (inFlight) inFlight.abort();
    else send();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); if (!inFlight) send(); }
  });

  async function send() {
    let request;
    try {
      request = toFetchRequest(draft);
    } catch (error) {
      showError(error.message);
      return;
    }
    $('warnings').replaceChildren(...request.warnings.map(text => paragraph(text)));
    const sentAt = Date.now();
    inFlight = new AbortController();
    setSending(true);
    const started = performance.now();
    try {
      const response = await fetch(request.url, { ...request.init, signal: inFlight.signal });
      const bytes = new Uint8Array(await response.arrayBuffer());
      const elapsed = performance.now() - started;
      showResponse(response, bytes, elapsed);
      remember(sentAt, { status: response.status });
    } catch (error) {
      const message = explainFetchError(error, request.url, location.protocol);
      showError(message);
      if (error.name !== 'AbortError') remember(sentAt, { error: message });
    } finally {
      inFlight = null;
      setSending(false);
    }
  }

  function setSending(sending) {
    $('send').textContent = sending ? 'Cancel' : 'Send';
    $('send').classList.toggle('cancel', sending);
    $('response').classList.toggle('loading', sending);
  }

  function showResponse(response, bytes, elapsed) {
    $('response-empty').hidden = true;
    $('response-error').hidden = true;
    $('response-content').hidden = false;
    const status = $('status');
    status.textContent = statusLabel(response.status, response.statusText);
    status.className = 'badge ' + statusClass(response.status);
    $('time').textContent = formatDuration(elapsed);
    $('size').textContent = formatBytes(bytes.byteLength);
    const body = prettyBody(new TextDecoder().decode(bytes));
    $('response-body').textContent = body.text || '(empty body)';
    $('response-body').dataset.kind = body.kind;
    const rows = [];
    response.headers.forEach((value, name) => rows.push([name, value]));
    $('response-headers').replaceChildren(...rows.map(([name, value]) => tableRow(name, value)));
    $('tab-response-headers').textContent = 'Headers (' + rows.length + ')';
    $('headers-note').hidden = false;
  }

  function showError(message) {
    $('response-empty').hidden = true;
    $('response-content').hidden = true;
    $('response-error').hidden = false;
    $('response-error').textContent = message;
  }

  function remember(sentAt, outcome) {
    history = addToHistory(history, historyEntry(draft, outcome, sentAt));
    saveHistory(history);
    showHistory();
  }

  function showHistory() {
    const list = $('history');
    list.replaceChildren();
    $('history-empty').hidden = history.length > 0;
    for (const entry of history) {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      const outcome = document.createElement('span');
      outcome.className = 'outcome ' + (entry.status ? statusClass(entry.status) : 'failed');
      outcome.textContent = entry.status ? String(entry.status) : 'failed';
      const label = document.createElement('span');
      label.className = 'label';
      label.textContent = historyLabel(entry);
      button.title = new Date(entry.sentAt).toLocaleString() + (entry.error ? '\n' + entry.error : '');
      button.append(outcome, label);
      button.addEventListener('click', () => { draft = copyDraft(entry.draft); saveDraft(draft); showDraft(); });
      item.append(button);
      list.append(item);
    }
  }

  $('export').addEventListener('click', () => {
    const text = serializeHistory(history, new Date().toISOString());
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    link.download = 'relais-history-' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });

  $('import').addEventListener('click', () => $('import-file').click());
  $('import-file').addEventListener('change', async () => {
    const file = $('import-file').files[0];
    $('import-file').value = '';
    if (!file) return;
    try {
      const imported = parseExport(await file.text());
      const before = history.length;
      history = mergeHistory(history, imported);
      saveHistory(history);
      showHistory();
      setNotice('Imported ' + (history.length - before) + ' new request(s) from ' + file.name + '.');
    } catch (error) {
      setNotice(error.message);
    }
  });

  $('clear').addEventListener('click', () => {
    if (history.length === 0) return;
    const kept = history;
    history = [];
    saveHistory(history);
    showHistory();
    setNotice('History cleared.', () => { history = kept; saveHistory(history); showHistory(); setNotice(''); });
  });

  function setNotice(text, undo) {
    const notice = $('notice');
    notice.replaceChildren(text);
    if (undo) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'link';
      button.textContent = 'Undo';
      button.addEventListener('click', undo);
      notice.append(' ', button);
    }
  }

  showDraft();
  showHistory();
}

/** Makes the tab buttons of one tab list show their own panel and hide the others. */
function setUpTabs(groupId) {
  const group = document.getElementById(groupId);
  const tabs = [...group.querySelectorAll('[role=tab]')];
  for (const tab of tabs) {
    tab.addEventListener('click', () => {
      for (const other of tabs) {
        const selected = other === tab;
        other.setAttribute('aria-selected', String(selected));
        document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
      }
    });
  }
}

/** " (3)" for three rows that will be sent, or "" when none will. */
function countLabel(rows) {
  const count = rows.filter(row => row.enabled !== false && (row.key || '').trim()).length;
  return count ? ' (' + count + ')' : '';
}

/** A <p> holding this text. */
function paragraph(text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

/** A table row: the header name in a <th>, its value in a <td>. */
function tableRow(name, value) {
  const row = document.createElement('tr');
  const key = document.createElement('th');
  key.textContent = name;
  const cell = document.createElement('td');
  cell.textContent = value;
  row.append(key, cell);
  return row;
}
