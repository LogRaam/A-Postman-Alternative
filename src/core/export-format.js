/**
 * The history export file: the one format this app promises to read back, so a file exported today still
 * imports after an upgrade. EXPORT_FIELDS is both the validator and the source of the export-format map;
 * a field removed from it is refused by the format guard once it has shipped.
 */

/** The value of the file's "format" field; a file without it is not one of ours. */
export const EXPORT_FORMAT = 'postman-alternative';

/** The newest version this code writes. Older versions must keep importing. */
export const EXPORT_VERSION = 1;

/**
 * Every field of the file, as [path, type]. "[]" marks the items of an array. Type is one JSON type, or
 * several joined by "|". Additive only once released: see docs/maps/README.md.
 */
export const EXPORT_FIELDS = [
  ['format', 'string'],
  ['version', 'number'],
  ['exportedAt', 'string'],
  ['history', 'array'],
  ['history[].id', 'string'],
  ['history[].sentAt', 'number'],
  ['history[].draft', 'object'],
  ['history[].draft.method', 'string'],
  ['history[].draft.url', 'string'],
  ['history[].draft.params', 'array'],
  ['history[].draft.params[].enabled', 'boolean'],
  ['history[].draft.params[].key', 'string'],
  ['history[].draft.params[].value', 'string'],
  ['history[].draft.headers', 'array'],
  ['history[].draft.headers[].enabled', 'boolean'],
  ['history[].draft.headers[].key', 'string'],
  ['history[].draft.headers[].value', 'string'],
  ['history[].draft.bodyMode', 'string'],
  ['history[].draft.body', 'string'],
  ['history[].status', 'number|null'],
  ['history[].error', 'string|null'],
];

/** The text of an export file for these history entries. */
export function serializeHistory(history, exportedAt) {
  const file = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt,
    history: history.map(entry => ({
      id: entry.id,
      sentAt: entry.sentAt,
      draft: {
        method: entry.draft.method,
        url: entry.draft.url,
        params: entry.draft.params.map(exportRow),
        headers: entry.draft.headers.map(exportRow),
        bodyMode: entry.draft.bodyMode,
        body: entry.draft.body,
      },
      status: entry.status,
      error: entry.error,
    })),
  };
  return JSON.stringify(file, null, 2) + '\n';
}

/**
 * The history entries in an export file. Throws a plain-language error naming the first field that is
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
  return file.history;
}

/** A parameter or header row as written to the file: every field present, never undefined. */
function exportRow(row) {
  return { enabled: row.enabled !== false, key: row.key ?? '', value: row.value ?? '' };
}

/** Walks one field path into the file and throws when the value at its end is not of the expected type. */
function checkField(value, steps, type, where) {
  if (steps.length === 0) {
    if (!type.split('|').includes(jsonType(value))) {
      throw new Error('The file is damaged: "' + where + '" should be ' + type.replace('|', ' or ') + '.');
    }
    return;
  }
  const [step, ...rest] = steps;
  const isItems = step.endsWith('[]');
  const name = isItems ? step.slice(0, -2) : step;
  const child = value[name];
  const here = where ? where + '.' + name : name;
  if (!isItems) return checkField(child, rest, type, here);
  if (!Array.isArray(child)) return;
  child.forEach((item, index) => checkField(item, rest, type, here + '[' + index + ']'));
}

/** The JSON type of a value, with null and arrays told apart from objects. */
function jsonType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}
