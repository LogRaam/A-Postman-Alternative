/** Small modal questions built on the page's one <dialog>: a name to type, or where to save a request. */

/**
 * Asks for one line of text. Resolves with the trimmed text, or null when cancelled or left blank.
 */
export function askText({ title, label, initial = '', confirm = 'OK' }) {
  return openFormDialog(title, confirm, form => {
    const input = field(form, label, 'text');
    input.value = initial;
    return { focus: input, read: () => input.value.trim() || null };
  });
}

/**
 * Asks where to save the editor's request: its name, the collection (an existing one, or a new one named
 * here) and optionally a folder of it. Resolves with { name, collectionId, newCollectionName, folderId } or null.
 */
export function askSaveTarget(collections, suggestedName) {
  return openFormDialog('Save request', 'Save', form => {
    const name = field(form, 'Name', 'text');
    name.value = suggestedName;

    const collection = field(form, 'Collection', 'select');
    for (const c of collections) collection.append(new Option(c.name, c.id));
    collection.append(new Option('New collection…', ''));

    const newName = field(form, 'New collection name', 'text');
    newName.value = 'My requests';
    const folder = field(form, 'Folder', 'select');

    const refresh = () => {
      const chosen = collections.find(c => c.id === collection.value);
      newName.closest('label').hidden = Boolean(chosen);
      folder.replaceChildren(new Option('(none)', ''));
      for (const f of chosen ? chosen.folders : []) folder.append(new Option(f.name, f.id));
      folder.closest('label').hidden = !chosen || chosen.folders.length === 0;
    };
    collection.addEventListener('change', refresh);
    refresh();

    return {
      focus: name,
      read: () => (name.value.trim()
        ? { name: name.value.trim(), collectionId: collection.value || null, newCollectionName: newName.value.trim(), folderId: folder.value || null }
        : null),
    };
  });
}

/**
 * Opens the page's dialog on a form built by build(form), which returns { focus, read }. Resolves with read()
 * on confirm, null on cancel or Escape.
 */
export function openFormDialog(title, confirmLabel, build) {
  const dialog = document.getElementById('dialog');
  const form = document.createElement('form');
  form.method = 'dialog';
  const heading = document.createElement('h2');
  heading.textContent = title;
  form.append(heading);
  const { focus, read } = build(form);

  const actions = document.createElement('div');
  actions.className = 'dialog-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'small';
  cancel.textContent = 'Cancel';
  const confirm = document.createElement('button');
  confirm.type = 'submit';
  confirm.className = 'primary';
  confirm.textContent = confirmLabel;
  actions.append(cancel, confirm);
  form.append(actions);
  dialog.replaceChildren(form);

  return new Promise(resolve => {
    // Settled by the action itself, not by the dialog's "close" event, which some browsers deliver late.
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      if (dialog.open) dialog.close();
      resolve(value);
    };
    form.addEventListener('submit', event => { event.preventDefault(); finish(read()); });
    cancel.addEventListener('click', () => finish(null));
    dialog.addEventListener('cancel', () => finish(null), { once: true });
    dialog.addEventListener('close', () => finish(null), { once: true });
    dialog.showModal();
    focus.focus();
    if (focus.select) focus.select();
  });
}

/** A labelled input or select appended to the form; returns the control. */
function field(form, labelText, kind) {
  const label = document.createElement('label');
  const caption = document.createElement('span');
  caption.textContent = labelText;
  const control = document.createElement(kind === 'select' ? 'select' : 'input');
  if (kind !== 'select') { control.type = kind; control.spellcheck = false; }
  label.append(caption, control);
  form.append(label);
  return control;
}
