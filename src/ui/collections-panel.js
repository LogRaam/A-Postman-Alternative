/** The Collections tab of the sidebar: collections, their folders and saved requests, with rename and remove. */

import { requestsIn } from '../core/collections.js';

/**
 * Draws the collections into the container. actions holds the callbacks: open(requestId),
 * addFolder(collectionId), rename(id, currentName), remove(id, label).
 */
export function renderCollections(container, collections, openRequestId, actions) {
  container.replaceChildren();
  if (collections.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty';
    empty.textContent = 'No collection yet. Save a request (Ctrl+S) to start one.';
    container.append(empty);
    return;
  }
  for (const collection of collections) {
    const group = document.createElement('div');
    group.className = 'collection';
    group.append(itemLine('collection-name', collection.name, [
      tool('+', 'Add a folder', () => actions.addFolder(collection.id)),
      tool('✎', 'Rename', () => actions.rename(collection.id, collection.name)),
      tool('×', 'Remove the collection and everything in it', () => actions.remove(collection.id, 'collection "' + collection.name + '"')),
    ]));
    for (const folder of collection.folders) {
      group.append(itemLine('folder-name', folder.name, [
        tool('✎', 'Rename', () => actions.rename(folder.id, folder.name)),
        tool('×', 'Remove the folder and its requests', () => actions.remove(folder.id, 'folder "' + folder.name + '"')),
      ]));
      for (const request of requestsIn(collection, folder.id)) group.append(requestLine(request, openRequestId, actions, true));
    }
    for (const request of requestsIn(collection, null)) group.append(requestLine(request, openRequestId, actions, false));
    container.append(group);
  }
}

/** One saved request: method and name, opening it on click, with rename and remove. */
function requestLine(request, openRequestId, actions, inFolder) {
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'open';
  const method = document.createElement('span');
  method.className = 'method';
  method.textContent = request.draft.method;
  const name = document.createElement('span');
  name.className = 'label';
  name.textContent = request.name;
  open.append(method, name);
  open.title = request.draft.url || '(no address)';
  open.addEventListener('click', () => actions.open(request.id));
  const line = itemLine('request' + (inFolder ? ' in-folder' : ''), null, [
    tool('✎', 'Rename', () => actions.rename(request.id, request.name)),
    tool('×', 'Remove this request', () => actions.remove(request.id, 'request "' + request.name + '"')),
  ]);
  line.prepend(open);
  line.classList.toggle('current', request.id === openRequestId);
  return line;
}

/** A row of the tree: a text (or nothing, when the caller prepends its own) and small tool buttons. */
function itemLine(className, text, tools) {
  const line = document.createElement('div');
  line.className = 'item ' + className;
  if (text !== null) {
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = text;
    line.append(label);
  }
  const box = document.createElement('span');
  box.className = 'tools';
  box.append(...tools);
  line.append(box);
  return line;
}

/** A small icon button with a tooltip. */
function tool(symbol, title, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon';
  button.textContent = symbol;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.addEventListener('click', onClick);
  return button;
}
