/** The History tab of the sidebar: every request sent, newest first, each one reloadable. */

import { statusClass } from '../core/response.js';
import { historyLabel } from '../core/history.js';

/** Draws the history into the list; onOpen(entry) loads an entry into the editor. */
export function renderHistory(list, emptyNote, history, onOpen) {
  list.replaceChildren();
  emptyNote.hidden = history.length > 0;
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
    button.addEventListener('click', () => onOpen(entry));
    item.append(button);
    list.append(item);
  }
}
