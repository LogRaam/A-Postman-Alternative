/**
 * The export file: the one format this app promises to read back, so a file exported today still imports
 * after an upgrade. It carries the whole workspace: history, collections and environments. EXPORT_FIELDS is both the
 * validator and the source of the export-format map; a field removed from it is refused once it has shipped.
 */

import { DRAFT_FIELDS, copyDraft } from './draft.js';
import { ROW_FIELDS, copyRow } from './rows.js';
import { fieldsAt } from './fields.js';

/** The value of the file's "format" field; a file without it is not one of ours. */
export const EXPORT_FORMAT = 'postman-alternative';

/** The newest version this code writes. Older versions must keep importing. */
export const EXPORT_VERSION = 1;

/**
 * Every field of the file, as [path, type]. "[]" marks the items of an array. Type is one JSON type, or
 * several joined by "|". The draft's fields come from DRAFT_FIELDS, wherever a draft is stored.
 *
 * "missing" means a file may lack the field: files written before it existed must keep importing, so a field
 * added later accepts "missing" and the importer fills its default. When an optional field is absent, the
 * fields under it are not checked. Additive only once released: see docs/maps/README.md.
 */
export const EXPORT_FIELDS = [
  ['format', 'string'],
  ['version', 'number'],
  ['exportedAt', 'string'],
  ['history', 'array'],
  ['history[].id', 'string'],
  ['history[].sentAt', 'number'],
  ['history[].draft', 'object'],
  ...fieldsAt('history[].draft', DRAFT_FIELDS),
  ['history[].status', 'number|null'],
  ['history[].error', 'string|null'],
  ['collections', 'array|missing'],
  ['collections[].id', 'string'],
  ['collections[].name', 'string'],
  ['collections[].folders', 'array'],
  ['collections[].folders[].id', 'string'],
  ['collections[].folders[].name', 'string'],
  ['collections[].requests', 'array'],
  ['collections[].requests[].id', 'string'],
  ['collections[].requests[].name', 'string'],
  ['collections[].requests[].folderId', 'string|null'],
  ['collections[].requests[].draft', 'object'],
  ...fieldsAt('collections[].requests[].draft', DRAFT_FIELDS),
  ['environments', 'array|missing'],
  ['environments[].id', 'string'],
  ['environments[].name', 'string'],
  ['environments[].variables', 'array'],
  ...fieldsAt('environments[].variables[]', ROW_FIELDS),
];

/** The text of an export file for this workspace. */
export function serializeWorkspace({ history, collections, environments }, exportedAt) {
  const file = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt,
    history: history.map(entry => ({ id: entry.id, sentAt: entry.sentAt, draft: copyDraft(entry.draft), status: entry.status, error: entry.error })),
    collections: collections.map(c => ({
      id: c.id,
      name: c.name,
      folders: c.folders.map(f => ({ id: f.id, name: f.name })),
      requests: c.requests.map(r => ({ id: r.id, name: r.name, folderId: r.folderId ?? null, draft: copyDraft(r.draft) })),
    })),
    environments: environments.map(e => ({ id: e.id, name: e.name, variables: e.variables.map(copyRow) })),
  };
  return JSON.stringify(file, null, 2) + '\n';
}

/**
 * The workspace in an export file: { history, collections, environments }, with every field a file from an
 * earlier version lacks filled with its default. Throws a plain-language error naming the first field that is
 * missing or of the wrong type, or a version newer than this code knows.
 */
export function parseExport(text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error('This file is not JSON, so it is not an export from this app.');
  }
  if (!file || file.format !== EXPORT_FORMAT) throw new Error('This JSON file is not an export from A Postman Alternative.');
  if (typeof file.version === 'number' && file.version > EXPORT_VERSION) {
    throw new Error('This file was written by a newer version of this app (format version ' + file.version + '). Update the app to import it.');
  }
  for (const [path, type] of EXPORT_FIELDS) checkField(file, path.split('.'), type, '');
  return {
    history: file.history.map(entry => ({ ...entry, draft: copyDraft(entry.draft) })),
    collections: (file.collections || []).map(c => ({ ...c, requests: c.requests.map(r => ({ ...r, draft: copyDraft(r.draft) })) })),
    environments: file.environments || [],
  };
}

/** Walks one field path into the file and throws when the value at its end is not of the expected type. */
function checkField(value, steps, type, where) {
  if (steps.length === 0) {
    if (!type.split('|').includes(jsonType(value))) {
      throw new Error('The file is damaged: "' + where + '" should be ' + type.split('|').filter(t => t !== 'missing').join(' or ') + '.');
    }
    return;
  }
  // An optional field above this one is absent: it was accepted when checked, and has nothing under it to check.
  if (value === undefined) return;
  const [step, ...rest] = steps;
  const isItems = step.endsWith('[]');
  const name = isItems ? step.slice(0, -2) : step;
  const child = value[name];
  const here = where ? where + '.' + name : name;
  if (!isItems) return checkField(child, rest, type, here);
  if (!Array.isArray(child)) return;
  child.forEach((item, index) => checkField(item, rest, type, here + '[' + index + ']'));
}

/** The JSON type of a value, with null and arrays told apart from objects, and an absent field as "missing". */
function jsonType(value) {
  if (value === undefined) return 'missing';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
