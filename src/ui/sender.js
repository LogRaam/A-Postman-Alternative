/** Sending: Send and Cancel, Ctrl+Enter, the warnings above the response, and the history entry it leaves. */

import { toFetchRequest } from '../core/request.js';
import { copyDraft } from '../core/draft.js';
import { explainFetchError } from '../core/errors.js';
import { resolveDraft, missingVariablesWarning } from '../core/environments.js';
import { historyEntry, addToHistory } from '../core/history.js';
import { showResponse, showError, setSending } from './response-view.js';
import { byId, onShortcut } from './page.js';

/** Wires the Send button and Ctrl+Enter to the state's draft and active environment. */
export function startSender(state) {
  let inFlight = null;

  byId('request-line').addEventListener('submit', event => {
    event.preventDefault();
    if (inFlight) inFlight.abort();
    else send();
  });
  onShortcut('Enter', () => { if (!inFlight) send(); });

  async function send() {
    // The draft as it is when Send is pressed: the user may edit the editor while a slow request is in flight.
    const sent = copyDraft(state.get('draft'));
    // The editor keeps the {{names}}; only what is sent carries the environment's values.
    const resolved = resolveDraft(sent, state.activeEnvironment());
    let request;
    try {
      request = toFetchRequest(resolved.draft);
    } catch (error) {
      showError(error.message);
      return;
    }
    const warnings = [missingVariablesWarning(resolved.missing, state.activeEnvironment()), ...request.warnings].filter(Boolean);
    byId('warnings').replaceChildren(...warnings.map(paragraph));
    const sentAt = Date.now();
    inFlight = new AbortController();
    setSending(true);
    const started = performance.now();
    try {
      const response = await fetch(request.url, { ...request.init, signal: inFlight.signal });
      const bytes = new Uint8Array(await response.arrayBuffer());
      showResponse(response, bytes, performance.now() - started);
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

  function remember(sent, sentAt, outcome) {
    state.set({ history: addToHistory(state.get('history'), historyEntry(sent, outcome, sentAt)) });
  }
}

/** A <p> holding this text. */
function paragraph(text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}
