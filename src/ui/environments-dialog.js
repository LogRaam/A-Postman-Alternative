/** The environment manager: create, rename and delete environments, and edit their variables. */

import { addEnvironment, renameEnvironment, removeEnvironment, setVariables } from '../core/environments.js';
import { makeId } from '../core/ids.js';
import { openFormDialog } from './dialogs.js';
import { renderRows } from './rows-editor.js';

/**
 * Opens the manager on one environment (or the first). Every edit is applied at once through
 * onChange(environments). Resolves with the environment selected when Done is pressed, or null.
 */
export function manageEnvironments(environments, selectedId, onChange) {
  let list = environments;
  let selected = list.some(e => e.id === selectedId) ? selectedId : (list[0] ? list[0].id : null);

  return openFormDialog('Environments', 'Done', form => {
    form.classList.add('wide');
    const bar = document.createElement('div');
    bar.className = 'env-bar';
    const picker = document.createElement('select');
    picker.setAttribute('aria-label', 'Environment');
    const add = smallButton('New', 'Add an environment');
    const remove = smallButton('Delete', 'Delete this environment');
    bar.append(picker, add, remove);

    const nameLabel = document.createElement('label');
    const nameCaption = document.createElement('span');
    nameCaption.textContent = 'Name';
    const name = document.createElement('input');
    name.type = 'text';
    nameLabel.append(nameCaption, name);

    const rows = document.createElement('div');
    rows.className = 'env-rows';
    const hint = document.createElement('p');
    hint.className = 'note';
    hint.textContent = 'Use a variable as {{name}} in the address, parameters, headers or body. Values are kept in plain text in this browser and in exports.';
    form.append(bar, nameLabel, rows, hint);

    const update = next => { list = next; onChange(list); };
    const render = () => {
      picker.replaceChildren(...list.map(e => new Option(e.name, e.id)));
      const environment = list.find(e => e.id === selected);
      picker.hidden = remove.hidden = nameLabel.hidden = !environment;
      if (!environment) {
        rows.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: 'No environment yet. Press New to add one.' }));
        return;
      }
      picker.value = selected;
      name.value = environment.name;
      renderRows(rows, environment.variables, next => update(setVariables(list, selected, next)), { keyPlaceholder: 'Variable' });
    };

    picker.addEventListener('change', () => { selected = picker.value; render(); });
    name.addEventListener('change', () => { update(renameEnvironment(list, selected, name.value)); render(); });
    add.addEventListener('click', () => {
      selected = makeId();
      update(addEnvironment(list, 'Environment ' + (list.length + 1), selected));
      render();
      name.focus();
      name.select();
    });
    remove.addEventListener('click', () => {
      const index = list.findIndex(e => e.id === selected);
      update(removeEnvironment(list, selected));
      selected = list[Math.min(index, list.length - 1)] ? list[Math.min(index, list.length - 1)].id : null;
      render();
    });
    render();
    return { focus: list.length ? picker : add, read: () => selected };
  });
}

/** A small button that does not submit the dialog's form. */
function smallButton(text, title) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'small';
  button.textContent = text;
  button.title = title;
  return button;
}
