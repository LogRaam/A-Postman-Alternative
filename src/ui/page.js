/** Small page-wide helpers shared by the controllers: elements by id, tabs, keyboard shortcuts, the notice line. */

/**
 * The element of src/index.html with this id. Throws, naming the id, when the template has none: a renamed id
 * fails loudly here instead of leaving a button that silently does nothing. docs/maps/dom-ids.md lists them all.
 */
export function byId(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error('The page has no element with id "' + id + '" (see src/index.html).');
  return element;
}

/** Makes the tab buttons of one tab list (the element holding them) show their own panel and hide the others. */
export function setUpTabs(tabList) {
  const tabs = [...tabList.querySelectorAll('[role=tab]')];
  for (const tab of tabs) tab.addEventListener('click', () => selectTab(tabs, tab));
}

/** Shows one of the sidebar's tabs, given its button. */
export function showSidebarTab(tab) {
  selectTab([...document.querySelectorAll('#sidebar-tabs [role=tab]')], tab);
}

/**
 * Calls handler(event) on Ctrl (or Cmd) + key, unless a dialog is open. key is compared without case, so
 * Ctrl+Shift+S reaches the "s" handler with event.shiftKey set.
 */
export function onShortcut(key, handler) {
  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || byId('dialog').open) return;
    if (event.key.toLowerCase() !== key.toLowerCase()) return;
    event.preventDefault();
    handler(event);
  });
}

/** Shows a one-line notice under the sidebar's tools, with an Undo button when undo is given. */
export function setNotice(text, undo) {
  const notice = byId('notice');
  notice.replaceChildren(text);
  if (!undo) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'link';
  button.textContent = 'Undo';
  button.addEventListener('click', () => { undo(); setNotice(''); });
  notice.append(' ', button);
}

/** Selects one tab of its list and shows its panel. */
function selectTab(tabs, tab) {
  for (const other of tabs) {
    const selected = other === tab;
    other.setAttribute('aria-selected', String(selected));
    byId(other.getAttribute('aria-controls')).hidden = !selected;
  }
}
