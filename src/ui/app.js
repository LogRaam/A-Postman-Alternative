/** The page: wires the editor, the send button, the response panel and the sidebar together. */

import { METHODS, toFetchRequest, methodTakesNoBody } from '../core/request.js';
import { emptyDraft, copyDraft, sameDraft } from '../core/draft.js';
import { statusLabel, statusClass, formatBytes, formatDuration, prettyBody } from '../core/response.js';
import { explainFetchError } from '../core/errors.js';
import { historyEntry, addToHistory, mergeHistory } from '../core/history.js';
import { addCollection, addFolder, addRequest, updateRequestDraft, renameItem, removeItem, findRequest, requestPath, mergeCollections } from '../core/collections.js';
import { makeId } from '../core/ids.js';
import { serializeWorkspace, parseExport } from '../core/export-format.js';
import { loadDraft, saveDraft, loadHistory, saveHistory, loadCollections, saveCollections, loadOpenRequestId, saveOpenRequestId } from './store.js';
import { renderRows } from './rows-editor.js';
import { renderHistory } from './history-panel.js';
import { renderCollections } from './collections-panel.js';
import { askText, askSaveTarget } from './dialogs.js';

/** Starts the app once the page is loaded. */
export function startApp() {
  const $ = id => document.getElementById(id);
  let draft = copyDraft(loadDraft() || emptyDraft());
  let history = loadHistory();
  let collections = loadCollections();
  let openRequestId = loadOpenRequestId();
  if (openRequestId && !findRequest(collections, openRequestId)) openRequestId = null;
  let inFlight = null;

  const method = $('method');
  for (const name of METHODS) method.append(new Option(name, name));

  const changed = () => { saveDraft(draft); refreshBodyHint(); refreshTitle(); };

  function showDraft() {
    method.value = draft.method;
    $('url').value = draft.url;
    $('body-mode').value = draft.bodyMode;
    $('body').value = draft.body;
    renderRows($('params'), draft.params, rows => { draft.params = rows; changed(); }, { keyPlaceholder: 'Parameter' });
    renderRows($('headers'), draft.headers, rows => { draft.headers = rows; changed(); }, { keyPlaceholder: 'Header', checkHeaders: true });
    refreshBodyHint();
    refreshTitle();
  }

  function refreshBodyHint() {
    $('body').hidden = draft.bodyMode === 'none';
    $('body-hint').textContent = draft.bodyMode !== 'none' && methodTakesNoBody(draft.method)
      ? 'A ' + draft.method + ' request carries no body: this one will not be sent.'
      : '';
    $('tab-params').textContent = 'Params' + countLabel(draft.params);
    $('tab-headers').textContent = 'Headers' + countLabel(draft.headers);
  }

  /** The line above the editor: which saved request is open, and whether the editor differs from it. */
  function refreshTitle() {
    const found = openRequestId && findRequest(collections, openRequestId);
    $('request-title').textContent = found ? requestPath(collections, openRequestId) : 'Unsaved request';
    $('request-dirty').hidden = !found || sameDraft(found.request.draft, draft);
    $('save-as').hidden = !found;
  }

  method.addEventListener('change', () => { draft.method = method.value; changed(); });
  $('url').addEventListener('input', () => { draft.url = $('url').value; changed(); });
  $('body-mode').addEventListener('change', () => { draft.bodyMode = $('body-mode').value; changed(); });
  $('body').addEventListener('input', () => { draft.body = $('body').value; changed(); });

  setUpTabs('request-tabs');
  setUpTabs('response-tabs');
  setUpTabs('sidebar-tabs');

  $('request-line').addEventListener('submit', event => {
    event.preventDefault();
    if (inFlight) inFlight.abort();
    else send();
  });
  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || $('dialog').open) return;
    if (event.key === 'Enter') { event.preventDefault(); if (!inFlight) send(); }
    if (event.key === 's' || event.key === 'S') { event.preventDefault(); save(event.shiftKey); }
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
    const sent = copyDraft(draft);
    inFlight = new AbortController();
    setSending(true);
    const started = performance.now();
    try {
      const response = await fetch(request.url, { ...request.init, signal: inFlight.signal });
      const bytes = new Uint8Array(await response.arrayBuffer());
      const elapsed = performance.now() - started;
      showResponse(response, bytes, elapsed);
      remember(sent, sentAt, { status: response.status });
    } catch (error) {
      const message = explainFetchError(error, request.url, location.protocol);
      showError(message);
      if (error.name !== 'AbortError') remember(sent, sentAt, { error: message });
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

  // The draft as it was when Send was pressed: the user may edit the editor while a slow request is in flight.
  function remember(sent, sentAt, outcome) {
    history = addToHistory(history, historyEntry(sent, outcome, sentAt));
    saveHistory(history);
    showHistory();
  }

  function showHistory() {
    renderHistory($('history'), $('history-empty'), history, entry => openDraft(entry.draft, null));
  }

  /** Loads a draft into the editor; requestId links it to a saved request, or null for a free draft. */
  function openDraft(next, requestId) {
    draft = copyDraft(next);
    openRequestId = requestId;
    saveDraft(draft);
    saveOpenRequestId(openRequestId);
    showDraft();
    showCollections();
  }

  // ---- Collections ----

  function setCollections(next) {
    collections = next;
    saveCollections(collections);
    if (openRequestId && !findRequest(collections, openRequestId)) { openRequestId = null; saveOpenRequestId(null); }
    showCollections();
    refreshTitle();
  }

  function showCollections() {
    renderCollections($('collections'), collections, openRequestId, {
      open: id => openDraft(findRequest(collections, id).request.draft, id),
      addFolder: async collectionId => {
        const name = await askText({ title: 'New folder', label: 'Folder name', confirm: 'Add' });
        if (name) setCollections(addFolder(collections, collectionId, name, makeId()));
      },
      rename: async (id, current) => {
        const name = await askText({ title: 'Rename', label: 'New name', initial: current, confirm: 'Rename' });
        if (name) setCollections(renameItem(collections, id, name));
      },
      remove: (id, label) => {
        const kept = { collections, openRequestId };
        setCollections(removeItem(collections, id));
        setNotice('Removed ' + label + '.', () => {
          openRequestId = kept.openRequestId;
          saveOpenRequestId(openRequestId);
          setCollections(kept.collections);
          setNotice('');
        });
      },
    });
  }

  /** Save: updates the open saved request, or asks where to save a new one. asNew forces the question. */
  async function save(asNew) {
    if (openRequestId && !asNew) {
      setCollections(updateRequestDraft(collections, openRequestId, draft));
      setNotice('Saved.');
      return;
    }
    const target = await askSaveTarget(collections, suggestName(draft));
    if (!target) return;
    let next = collections;
    let collectionId = target.collectionId;
    if (!collectionId) {
      collectionId = makeId();
      next = addCollection(next, target.newCollectionName, collectionId);
    }
    const id = makeId();
    next = addRequest(next, { collectionId, folderId: target.folderId, name: target.name, draft, id });
    openRequestId = id;
    saveOpenRequestId(id);
    setCollections(next);
    showSidebarTab('tab-collections');
    setNotice('Saved as ' + requestPath(collections, id) + '.');
  }

  $('save').addEventListener('click', () => save(false));
  $('save-as').addEventListener('click', () => save(true));
  $('new-request').addEventListener('click', () => openDraft(emptyDraft(), null));
  $('new-collection').addEventListener('click', async () => {
    const name = await askText({ title: 'New collection', label: 'Collection name', confirm: 'Create' });
    if (name) setCollections(addCollection(collections, name, makeId()));
  });

  // ---- Export, import, clear ----

  $('export').addEventListener('click', () => {
    const text = serializeWorkspace({ history, collections }, new Date().toISOString());
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    link.download = 'postman-alternative-' + new Date().toISOString().slice(0, 10) + '.json';
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
      const before = { history: history.length, requests: countRequests(collections) };
      history = mergeHistory(history, imported.history);
      saveHistory(history);
      showHistory();
      setCollections(mergeCollections(collections, imported.collections));
      setNotice('Imported from ' + file.name + ': ' + (countRequests(collections) - before.requests) + ' saved request(s), '
        + (history.length - before.history) + ' history entr(ies).');
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
  showCollections();
  showSidebarTab(collections.length ? 'tab-collections' : 'tab-history');
}

/** Makes the tab buttons of one tab list show their own panel and hide the others. */
function setUpTabs(groupId) {
  const group = document.getElementById(groupId);
  const tabs = [...group.querySelectorAll('[role=tab]')];
  for (const tab of tabs) tab.addEventListener('click', () => selectTab(tabs, tab));
}

/** Selects one tab of its list and shows its panel. */
function selectTab(tabs, tab) {
  for (const other of tabs) {
    const selected = other === tab;
    other.setAttribute('aria-selected', String(selected));
    document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
  }
}

/** Shows one of the sidebar's tabs by its button id. */
function showSidebarTab(tabId) {
  const tabs = [...document.querySelectorAll('#sidebar-tabs [role=tab]')];
  selectTab(tabs, document.getElementById(tabId));
}

/** A name to offer when saving: the last part of the address path, or the method alone. */
function suggestName(draft) {
  const path = (draft.url || '').replace(/^https?:\/\//i, '').split('?')[0].split('/').filter(Boolean);
  return path.length > 1 ? draft.method + ' ' + path[path.length - 1] : draft.method + ' ' + (path[0] || 'request');
}

/** How many saved requests the collections hold in all. */
function countRequests(collections) {
  return collections.reduce((n, c) => n + c.requests.length, 0);
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
