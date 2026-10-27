/** Turning the editor's draft into what fetch() is called with, and saying what the browser will refuse. */

import { buildUrl, enabledRows } from './url.js';

/** The methods offered in the editor, in menu order. */
export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/** Body modes: none, JSON (validated and sent as application/json), or raw text sent as typed. */
export const BODY_MODES = ['none', 'json', 'text'];

/**
 * Header names a page may not set: the browser drops them silently. Listed so the editor can say so
 * instead of letting the user believe they were sent. From the Fetch standard's forbidden request-headers.
 */
const FORBIDDEN_HEADERS = [
  'accept-charset', 'accept-encoding', 'access-control-request-headers', 'access-control-request-method',
  'connection', 'content-length', 'cookie', 'cookie2', 'date', 'dnt', 'expect', 'host', 'keep-alive',
  'origin', 'referer', 'set-cookie', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'user-agent', 'via',
];

/** True when the browser will drop this header name rather than send it. */
export function isForbiddenHeader(name) {
  const lower = (name || '').trim().toLowerCase();
  return FORBIDDEN_HEADERS.includes(lower) || lower.startsWith('proxy-') || lower.startsWith('sec-');
}

/** True when the method carries no body: fetch() throws if one is given. */
export function methodTakesNoBody(method) {
  return method === 'GET' || method === 'HEAD';
}

/**
 * The URL and fetch() options for a draft, plus warnings the user should see before reading the response
 * (headers the browser drops, a body ignored by GET). Throws a plain-language error for a draft that cannot
 * be sent at all (bad address, invalid JSON).
 */
export function toFetchRequest(draft) {
  const url = buildUrl(draft.url, draft.params);
  const warnings = [];
  const headers = [];
  for (const row of enabledRows(draft.headers)) {
    if (isForbiddenHeader(row.key)) warnings.push('The browser does not let a page set "' + row.key + '"; it was not sent.');
    else headers.push([row.key, row.value]);
  }

  let body;
  if (draft.bodyMode !== 'none' && (draft.body || '') !== '') {
    if (methodTakesNoBody(draft.method)) {
      warnings.push('A ' + draft.method + ' request carries no body; the body was not sent.');
    } else if (draft.bodyMode === 'json') {
      try {
        JSON.parse(draft.body);
      } catch (error) {
        throw new Error('The JSON body is not valid: ' + error.message);
      }
      body = draft.body;
      if (!hasHeader(headers, 'content-type')) headers.push(['Content-Type', 'application/json']);
    } else {
      body = draft.body;
    }
  }

  const init = { method: draft.method, headers };
  if (body !== undefined) init.body = body;
  return { url, init, warnings };
}

/** True when a header of this name (already lower-cased) is in the list, in any case. */
function hasHeader(headers, lowerName) {
  return headers.some(([name]) => name.toLowerCase() === lowerName);
}
