// Ratchets: counts that may only go down. A baseline is what the code holds TODAY, not a standard; when a count
// drops, the check asks for the baseline to be lowered in the same commit, so the improvement is locked in.
// Regenerating maps never satisfies a ratchet. Raising a baseline is a hand edit here, with the reason in the commit.

import { importEdges, cycles, layerViolations } from './dependencies.mjs';
import { LARGE_FILE_LINES, lineCount } from './inventory.mjs';
import { listFiles, readText } from '../source.mjs';

export const RATCHETS = [
  {
    name: 'modules caught in an import cycle',
    baseline: 0,
    measure: root => cycles(importEdges(root)).flat().length,
  },
  {
    name: 'imports from src/core into another layer',
    baseline: 0,
    measure: root => layerViolations(importEdges(root)).length,
  },
  {
    // Added 26/10/2026 after app.js grew with each of three features (342, 350, 353 lines) and was split into
    // a state object and one controller per feature. See docs/maps/inventory.md, "Files of 300 lines and more".
    name: 'source files of ' + LARGE_FILE_LINES + ' lines and more',
    baseline: 0,
    measure: root => listFiles('src', '.js', root).filter(path => lineCount(readText(path, root)) >= LARGE_FILE_LINES).length,
  },
];

/** One line per ratchet that is not exactly at its baseline; empty when all hold. */
export function ratchetProblems(root) {
  const problems = [];
  for (const ratchet of RATCHETS) {
    const now = ratchet.measure(root);
    if (now > ratchet.baseline) problems.push('Ratchet broken: ' + ratchet.name + ' went from ' + ratchet.baseline + ' to ' + now + '. Change the code; see docs/maps/dependencies.md.');
    if (now < ratchet.baseline) problems.push('Ratchet improved: ' + ratchet.name + ' is now ' + now + '. Lower its baseline in tools/maps/ratchets.mjs in this commit.');
  }
  return problems;
}
