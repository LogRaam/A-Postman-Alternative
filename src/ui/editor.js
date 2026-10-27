/** The request editor: method, address, parameters, headers, auth, body, and the lines that describe them. */

import { METHODS, methodTakesNoBody } from '../core/request.js';
import { sameDraft } from '../core/draft.js';
import { enabledRows } from '../core/rows.js';
import { findRequest, requestPath } from '../core/collections.js';
import { resolveDraft, referencedNames, missingVariablesWarning } from '../core/environments.js';
import { renderRows } from './rows-editor.js';
import { renderAuth } from './auth-editor.js';
import { byId } from './page.js';

/** Wires the editor to the state: what the user types updates the draft; a draft loaded from elsewhere is shown. */
export function startEditor(state) {
  const method = byId('method');
  for (const name of METHODS) method.append(new Option(name, name));

  // Typing changes the draft with origin "editor", so the fields being typed in are not redrawn under the cursor.
  const edit = changes => state.set({ draft: { ...state.get('draft'), ...changes } }, 'editor');

  method.addEventListener('change', () => edit({ method: method.value }));
  byId('url').addEventListener('input', () => edit({ url: byId('url').value }));
  byId('body-mode').addEventListener('change', () => edit({ bodyMode: byId('body-mode').value }));
  byId('body').addEventListener('input', () => edit({ body: byId('body').value }));

  function showDraft() {
    const draft = state.get('draft');
    method.value = draft.method;
    byId('url').value = draft.url;
    byId('body-mode').value = draft.bodyMode;
    byId('body').value = draft.body;
    renderRows(byId('params'), draft.params, rows => edit({ params: rows }), { keyPlaceholder: 'Parameter' });
    renderRows(byId('headers'), draft.headers, rows => edit({ headers: rows }), { keyPlaceholder: 'Header', checkHeaders: true });
    renderAuth(byId('auth'), draft.auth, auth => edit({ auth }));
    refresh();
  }

  /** Everything around the fields that depends on the draft, the open request or the environment. */
  function refresh() {
    const draft = state.get('draft');
    byId('body').hidden = draft.bodyMode === 'none';
    byId('body-hint').textContent = draft.bodyMode !== 'none' && methodTakesNoBody(draft.method)
      ? 'A ' + draft.method + ' request carries no body: this one will not be sent.'
      : '';
    byId('tab-params').textContent = 'Params' + countLabel(draft.params);
    byId('tab-headers').textContent = 'Headers' + countLabel(draft.headers);
    byId('tab-auth').textContent = draft.auth.type === 'none' ? 'Auth' : 'Auth (' + draft.auth.type + ')';

    // The line above the editor: which saved request is open, and whether the editor differs from it.
    const collections = state.get('collections');
    const found = state.get('openRequestId') && findRequest(collections, state.get('openRequestId'));
    byId('request-title').textContent = found ? requestPath(collections, found.request.id) : 'Unsaved request';
    byId('request-dirty').hidden = !found || sameDraft(found.request.draft, draft);
    byId('save-as').hidden = !found;

    // Under the address: where the request will really go, when the address uses {{variables}}.
    const preview = byId('resolved-url');
    if (referencedNames(draft.url).length === 0) { preview.hidden = true; return; }
    const { draft: resolved, missing } = resolveDraft(draft, state.activeEnvironment());
    preview.hidden = false;
    preview.textContent = 'Sends to ' + resolved.url + (missing.length ? '   (' + missingVariablesWarning(missing, state.activeEnvironment()) + ')' : '');
    preview.classList.toggle('missing', missing.length > 0);
  }

  state.onChange((changed, origin) => {
    if (changed.has('draft') && origin !== 'editor') showDraft();
    else refresh();
  });
  showDraft();
}

/** " (3)" for three rows that will be sent, or "" when none will. */
function countLabel(rows) {
  const count = enabledRows(rows).length;
  return count ? ' (' + count + ')' : '';
}
