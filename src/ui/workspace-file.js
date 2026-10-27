/** Export and Import: the whole workspace (history, collections, environments) to and from a JSON file. */

import { serializeWorkspace, parseExport } from '../core/export-format.js';
import { mergeHistory } from '../core/history.js';
import { mergeCollections } from '../core/collections.js';
import { mergeEnvironments } from '../core/environments.js';
import { setNotice } from './page.js';

/** Wires the Export and Import buttons to the state. */
export function startWorkspaceFile(state) {
  const $ = id => document.getElementById(id);

  $('export').addEventListener('click', () => {
    const workspace = { history: state.get('history'), collections: state.get('collections'), environments: state.get('environments') };
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([serializeWorkspace(workspace, new Date().toISOString())], { type: 'application/json' }));
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
      const before = counts(state);
      state.set({
        history: mergeHistory(state.get('history'), imported.history),
        collections: mergeCollections(state.get('collections'), imported.collections),
        environments: mergeEnvironments(state.get('environments'), imported.environments),
      });
      const after = counts(state);
      setNotice('Imported from ' + file.name + ': ' + (after.requests - before.requests) + ' saved request(s), '
        + (after.environments - before.environments) + ' environment(s), ' + (after.history - before.history) + ' history entr(ies).');
    } catch (error) {
      setNotice(error.message);
    }
  });
}

/** How many saved requests, environments and history entries the state holds. */
function counts(state) {
  return {
    requests: state.get('collections').reduce((n, c) => n + c.requests.length, 0),
    environments: state.get('environments').length,
    history: state.get('history').length,
  };
}
