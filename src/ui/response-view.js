/** The response panel: status, time, size, body and headers of the last response, or why there is none. */

import { statusLabel, statusClass, formatBytes, formatDuration, prettyBody } from '../core/response.js';

/** Shows a response that came back: its bytes are the body as received, elapsed the time in milliseconds. */
export function showResponse(response, bytes, elapsed) {
  const $ = id => document.getElementById(id);
  $('response-empty').hidden = true;
  $('response-error').hidden = true;
  $('response-content').hidden = false;
  const status = $('status');
  status.textContent = statusLabel(response.status, response.statusText);
  status.className = 'badge ' + statusClass(response.status);
  $('time').textContent = formatDuration(elapsed);
  $('size').textContent = formatBytes(bytes.byteLength);
  const body = prettyBody(new TextDecoder().decode(bytes));
  $('response-body').textContent = body.text || '(empty body)';
  $('response-body').dataset.kind = body.kind;
  const rows = [];
  response.headers.forEach((value, name) => rows.push([name, value]));
  $('response-headers').replaceChildren(...rows.map(([name, value]) => headerRow(name, value)));
  $('tab-response-headers').textContent = 'Headers (' + rows.length + ')';
  $('headers-note').hidden = false;
}

/** Shows why there is no response: a request that could not be sent, or a send that failed. */
export function showError(message) {
  const $ = id => document.getElementById(id);
  $('response-empty').hidden = true;
  $('response-content').hidden = true;
  $('response-error').hidden = false;
  $('response-error').textContent = message;
}

/** Turns Send into Cancel while a request is in flight, and dims the last response. */
export function setSending(sending) {
  const send = document.getElementById('send');
  send.textContent = sending ? 'Cancel' : 'Send';
  send.classList.toggle('cancel', sending);
  document.getElementById('response').classList.toggle('loading', sending);
}

/** A table row: the header name in a <th>, its value in a <td>. */
function headerRow(name, value) {
  const row = document.createElement('tr');
  const key = document.createElement('th');
  key.textContent = name;
  const cell = document.createElement('td');
  cell.textContent = value;
  row.append(key, cell);
  return row;
}
