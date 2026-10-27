/** The key/value table used for both query parameters and headers: tick, name, value, remove. */

import { isForbiddenHeader } from '../core/request.js';

/**
 * Draws the rows of one table into its container and calls onChange with the new rows after every edit.
 * With checkHeaders, a header name the browser will drop is marked as it is typed.
 */
export function renderRows(container, rows, onChange, { keyPlaceholder, checkHeaders = false }) {
  container.replaceChildren();
  const current = rows.map(row => ({ ...row }));
  const commit = () => onChange(current.map(row => ({ ...row })));

  current.forEach((row, index) => {
    const line = document.createElement('div');
    line.className = 'row';

    const enabled = document.createElement('input');
    enabled.type = 'checkbox';
    enabled.checked = row.enabled !== false;
    enabled.title = 'Send this row';
    enabled.addEventListener('change', () => { row.enabled = enabled.checked; commit(); });

    const key = document.createElement('input');
    key.type = 'text';
    key.placeholder = keyPlaceholder;
    key.value = row.key;
    key.spellcheck = false;
    const markForbidden = () => {
      const forbidden = checkHeaders && isForbiddenHeader(key.value);
      key.classList.toggle('forbidden', forbidden);
      key.title = forbidden ? 'The browser does not let a page set this header; it will not be sent.' : '';
    };
    markForbidden();
    key.addEventListener('input', () => { row.key = key.value; markForbidden(); commit(); });

    const value = document.createElement('input');
    value.type = 'text';
    value.placeholder = 'Value';
    value.value = row.value;
    value.spellcheck = false;
    value.addEventListener('input', () => { row.value = value.value; commit(); });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'icon';
    remove.title = 'Remove this row';
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      current.splice(index, 1);
      commit();
      renderRows(container, current, onChange, { keyPlaceholder, checkHeaders });
    });

    line.append(enabled, key, value, remove);
    container.append(line);
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'link';
  add.textContent = '+ Add a row';
  add.addEventListener('click', () => {
    current.push({ enabled: true, key: '', value: '' });
    commit();
    renderRows(container, current, onChange, { keyPlaceholder, checkHeaders });
    container.querySelectorAll('.row input[type=text]')[(current.length - 1) * 2]?.focus();
  });
  container.append(add);
}
