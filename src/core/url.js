/** Building the URL a request is sent to, from the typed address and the query-parameter rows. */

/**
 * Appends every enabled, named parameter row to the address, keeping any query the address already has.
 * Throws a plain-language error when the address is not an absolute http(s) URL.
 */
export function buildUrl(address, paramRows) {
  const trimmed = (address || '').trim();
  if (!trimmed) throw new Error('Type an address first, such as https://httpbin.org/get.');
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error('"' + trimmed + '" is not a valid address.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https addresses can be sent, not ' + url.protocol.replace(':', '') + '.');
  }
  for (const row of enabledRows(paramRows)) url.searchParams.append(row.key, row.value);
  return url.toString();
}

/** The rows a request should use: ticked, and with a non-blank name. Names are trimmed, values kept as typed. */
export function enabledRows(rows) {
  return (rows || [])
    .filter(row => row && row.enabled !== false && (row.key || '').trim() !== '')
    .map(row => ({ key: row.key.trim(), value: row.value ?? '' }));
}
