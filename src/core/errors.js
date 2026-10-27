/** Turning what fetch() throws into a sentence the user can act on. */

/**
 * A plain explanation of a failed send. fetch() reports CORS refusals, DNS failures and refused
 * connections all as the same TypeError, and the browser hides which one it was on purpose, so the
 * message says so rather than guessing.
 */
export function explainFetchError(error, url, pageProtocol) {
  if (error && error.name === 'AbortError') return 'Cancelled.';
  if (pageProtocol === 'https:' && (url || '').startsWith('http:')) {
    return 'This page is served over https, and the browser blocks requests to plain http addresses from it.';
  }
  if (error && error.name === 'TypeError') {
    return 'The request did not get a response the browser will show. Either the server does not allow '
      + 'requests from a web page (CORS: it must answer with an Access-Control-Allow-Origin header), or it '
      + 'could not be reached (wrong address, server down, no network). The browser does not say which. '
      + 'The developer console (F12) usually names the reason.';
  }
  return (error && error.message) || 'The request failed for an unknown reason.';
}
