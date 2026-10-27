/** The History tab's behaviour: open an entry in the editor, clear the list with undo. */

import { copyDraft } from '../core/draft.js';
import { renderHistory } from './history-panel.js';
import { byId, setNotice } from './page.js';

/** Draws the history whenever it changes and wires its Clear button. */
export function startHistory(state) {
  const show = () => renderHistory(byId('history'), byId('history-empty'), state.get('history'),
    entry => state.set({ draft: copyDraft(entry.draft), openRequestId: null }));

  byId('clear').addEventListener('click', () => {
    const kept = state.get('history');
    if (kept.length === 0) return;
    state.set({ history: [] });
    setNotice('History cleared.', () => state.set({ history: kept }));
  });

  state.onChange(changed => { if (changed.has('history')) show(); });
  show();
}
