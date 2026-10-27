/** Small page-wide helpers shared by the controllers: tabs, keyboard shortcuts, the notice line. */

/** Makes the tab buttons of one tab list show their own panel and hide the others. */
export function setUpTabs(groupId) {
  const tabs = [...document.getElementById(groupId).querySelectorAll('[role=tab]')];
  for (const tab of tabs) tab.addEventListener('click', () => selectTab(tabs, tab));
}

/** Shows one of the sidebar's tabs by its button id. */
export function showSidebarTab(tabId) {
  selectTab([...document.querySelectorAll('#sidebar-tabs [role=tab]')], document.getElementById(tabId));
}

/**
 * Calls handler(event) on Ctrl (or Cmd) + key, unless a dialog is open. key is compared without case, so
 * Ctrl+Shift+S reaches the "s" handler with event.shiftKey set.
 */
export function onShortcut(key, handler) {
  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || document.getElementById('dialog').open) return;
    if (event.key.toLowerCase() !== key.toLowerCase()) return;
    event.preventDefault();
    handler(event);
  });
}

/** Shows a one-line notice under the sidebar's tools, with an Undo button when undo is given. */
export function setNotice(text, undo) {
  const notice = document.getElementById('notice');
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
    document.getElementById(other.getAttribute('aria-controls')).hidden = !selected;
  }
}
