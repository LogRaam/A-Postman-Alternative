/**
 * Environments: named sets of variables ({{baseUrl}}, {{token}}) that the request is resolved against when
 * it is sent, so one saved request works against development, test and production alike. The request keeps
 * the {{names}}; only what is sent carries the values.
 */

import { enabledRows, copyRow } from './rows.js';
import { copyDraft } from './draft.js';
import { cleanName } from './names.js';

/** {{ name }}: a variable reference. Spaces inside the braces are allowed; the name itself has none. */
const VARIABLE_REFERENCE = /\{\{\s*([^{}\s]+)\s*\}\}/g;

/** The list with a new, empty environment added at the end. */
export function addEnvironment(environments, name, id) {
  return [...environments, { id, name: cleanName(name, 'New environment'), variables: [] }];
}

/** The list with one environment renamed. A blank name keeps the old one. */
export function renameEnvironment(environments, id, name) {
  return environments.map(e => (e.id === id ? { ...e, name: cleanName(name, e.name) } : e));
}

/** The list without one environment. */
export function removeEnvironment(environments, id) {
  return environments.filter(e => e.id !== id);
}

/** The list with one environment's variable rows replaced. */
export function setVariables(environments, id, rows) {
  return environments.map(e => (e.id === id ? { ...e, variables: rows.map(copyRow) } : e));
}

/** The environments after importing some from a file: an id already here is kept as it is, new ones are added. */
export function mergeEnvironments(environments, imported) {
  return [...environments, ...(imported || []).filter(e => !environments.some(here => here.id === e.id))];
}

/** Every {{name}} a text refers to, in order of first appearance. */
export function referencedNames(text) {
  return [...new Set([...(text || '').matchAll(VARIABLE_REFERENCE)].map(m => m[1]))];
}

/**
 * The text with each {{name}} replaced by its value. A name the variables do not define is left as typed and
 * reported in missing (a Set the caller collects across fields).
 */
export function substitute(text, values, missing) {
  return (text || '').replace(VARIABLE_REFERENCE, (whole, name) => {
    if (values.has(name)) return values.get(name);
    missing.add(name);
    return whole;
  });
}

/**
 * The draft as it will be sent: every {{name}} in the address, parameters, headers and body replaced by the
 * environment's value. Returns the resolved copy and the names no variable defines. With no environment,
 * every reference is missing.
 */
export function resolveDraft(draft, environment) {
  const values = new Map(enabledRows(environment ? environment.variables : []).map(row => [row.key, row.value]));
  const missing = new Set();
  const resolved = copyDraft(draft);
  const resolveRows = rows => rows.map(row => ({ ...row, key: substitute(row.key, values, missing), value: substitute(row.value, values, missing) }));
  resolved.url = substitute(resolved.url, values, missing);
  resolved.params = resolveRows(resolved.params);
  resolved.headers = resolveRows(resolved.headers);
  if (resolved.bodyMode !== 'none') resolved.body = substitute(resolved.body, values, missing);
  return { draft: resolved, missing: [...missing] };
}

/** The sentence to show for names left unresolved, or '' when there are none. */
export function missingVariablesWarning(missing, environment) {
  if (missing.length === 0) return '';
  const names = missing.map(n => '{{' + n + '}}').join(', ');
  return environment
    ? names + (missing.length === 1 ? ' is' : ' are') + ' not defined in "' + environment.name + '"; sent as typed.'
    : names + ' used, but no environment is selected; sent as typed.';
}
