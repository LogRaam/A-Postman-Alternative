// A small line diff, enough to print what moved in a map. No dependency.

/** The changed lines between two texts, as "- old" / "+ new" lines, in order. */
export function lineDiff(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  const table = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { i++; j++; }
    else if (j < b.length && (i === a.length || table[i][j + 1] >= table[i + 1][j])) out.push('+ ' + b[j++]);
    else out.push('- ' + a[i++]);
  }
  return out;
}

/** "+3 -1" and, when there are at most maxLines changed lines, the lines themselves. */
export function describeDiff(before, after, maxLines = 40) {
  const lines = lineDiff(before, after);
  const added = lines.filter(l => l.startsWith('+')).length;
  const removed = lines.length - added;
  const summary = '+' + added + ' -' + removed;
  return lines.length <= maxLines ? summary + '\n' + lines.map(l => '    ' + l).join('\n') : summary + ' (too long to print: read git diff)';
}
