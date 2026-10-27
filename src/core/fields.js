/** Field lists ([path, type] pairs) that describe stored data, for the export file's validator and map. */

/** A field list placed under a prefix: fieldsAt('params[]', [['key', 'string']]) gives [['params[].key', 'string']]. */
export function fieldsAt(prefix, fields) {
  return fields.map(([path, type]) => [prefix + '.' + path, type]);
}
