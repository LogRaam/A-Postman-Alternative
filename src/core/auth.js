/**
 * Authentication from the Auth tab: a Bearer token or a Basic user name and password, turned into the
 * Authorization header. Values are kept in plain text in the browser and in exports, like everything else.
 */

/** The kinds offered in the Auth tab, in menu order. */
export const AUTH_TYPES = ['none', 'bearer', 'basic'];

/** Every field of the auth settings, as [path, type], for the export file's validator and map. */
export const AUTH_FIELDS = [
  ['type', 'string'],
  ['token', 'string'],
  ['username', 'string'],
  ['password', 'string'],
];

/** No authentication: what a new draft, and a draft from before the Auth tab existed, carries. */
export function noAuth() {
  return { type: 'none', token: '', username: '', password: '' };
}

/** The auth settings with every field present; missing ones (older data) get the no-auth defaults. */
export function copyAuth(auth) {
  return { ...noAuth(), ...(auth || {}) };
}

/** The Authorization header for these settings as [name, value], or null for none. */
export function authHeader(auth) {
  if (!auth) return null;
  if (auth.type === 'bearer') return auth.token !== '' ? ['Authorization', 'Bearer ' + auth.token] : null;
  if (auth.type === 'basic') return ['Authorization', 'Basic ' + base64Utf8(auth.username + ':' + auth.password)];
  return null;
}

/** What the user should know before trusting the result: an empty token, or a header typed by hand that wins. */
export function authWarnings(auth, headerTypedByHand) {
  if (!auth || auth.type === 'none') return [];
  if (headerTypedByHand) return ['An Authorization header is set in the Headers tab; it was sent instead of the Auth tab.'];
  if (auth.type === 'bearer' && auth.token === '') return ['The Bearer token is empty; no Authorization header was sent.'];
  return [];
}

/** Base64 of the UTF-8 bytes of a text, as Basic authentication requires (btoa alone fails beyond Latin-1). */
function base64Utf8(text) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
