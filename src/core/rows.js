/**
 * Key/value rows: query parameters, headers and environment variables all share this shape and these rules,
 * so they are written once here.
 */

/** Every field of a row, as [path, type], for the export file's validator and map. */
export const ROW_FIELDS = [
  ['enabled', 'boolean'],
  ['key', 'string'],
  ['value', 'string'],
];

/** The rows that count: ticked, and with a non-blank name. Names are trimmed, values kept as typed. */
export function enabledRows(rows) {
  return (rows || [])
    .filter(row => row && row.enabled !== false && (row.key || '').trim() !== '')
    .map(row => ({ key: row.key.trim(), value: row.value ?? '' }));
}

/** A row with all three fields present: ticked unless explicitly unticked, empty strings rather than undefined. */
export function copyRow(row) {
  return { enabled: row.enabled !== false, key: row.key ?? '', value: row.value ?? '' };
}
