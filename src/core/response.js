/** Describing a response for the reader: status wording, size, duration, and a readable body. */

/** "200 OK"-style label; the browser gives an empty statusText over HTTP/2, so common reasons are filled in. */
export function statusLabel(status, statusText) {
  const reason = statusText || REASONS[status] || '';
  return reason ? status + ' ' + reason : String(status);
}

/** Which colour family a status belongs to: success, redirect, client error, server error. */
export function statusClass(status) {
  if (status >= 200 && status < 300) return 'ok';
  if (status >= 300 && status < 400) return 'redirect';
  if (status >= 400 && status < 500) return 'client-error';
  return 'server-error';
}

/** Bytes as the reader says them: 512 B, 1.4 KB, 3.2 MB. */
export function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/** Milliseconds as the reader says them: 85 ms, 1.24 s. */
export function formatDuration(ms) {
  if (ms < 1000) return Math.round(ms) + ' ms';
  return (ms / 1000).toFixed(2) + ' s';
}

/**
 * The body as it should be shown: JSON re-indented when it parses (whatever the content type claims),
 * otherwise the text as received. Reports which of the two it did.
 */
export function prettyBody(text) {
  const trimmed = (text || '').trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return { text: JSON.stringify(JSON.parse(trimmed), null, 2), kind: 'json' };
    } catch {
      // Not JSON after all: shown as received.
    }
  }
  return { text: text || '', kind: 'text' };
}

/** Reason phrases for the statuses most often seen, used when the browser gives none. */
const REASONS = {
  200: 'OK', 201: 'Created', 202: 'Accepted', 204: 'No Content', 301: 'Moved Permanently', 302: 'Found',
  304: 'Not Modified', 307: 'Temporary Redirect', 308: 'Permanent Redirect', 400: 'Bad Request',
  401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 405: 'Method Not Allowed', 409: 'Conflict',
  415: 'Unsupported Media Type', 422: 'Unprocessable Content', 429: 'Too Many Requests',
  500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable', 504: 'Gateway Timeout',
};
