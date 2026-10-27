// The list of maps: one entry per file in docs/maps, with the generator that writes it.
// Adding a map = a generator in this folder, one line here, one row in docs/maps/README.md.

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { generateInventory } from './inventory.mjs';
import { generateDependencies } from './dependencies.mjs';
import { generateRules } from './rules.mjs';
import { generateExportFormat } from './export-format.mjs';
import { generateDomIds } from './dom-ids.mjs';

export const MAPS = [
  { file: 'docs/maps/inventory.md', generate: generateInventory },
  { file: 'docs/maps/dependencies.md', generate: generateDependencies },
  { file: 'docs/maps/rules.md', generate: generateRules },
  { file: 'docs/maps/export-format.md', generate: generateExportFormat },
  { file: 'docs/maps/dom-ids.md', generate: generateDomIds },
];

/**
 * Whether the tree is whole enough to compare maps against. A runner working from a partial copy would
 * regenerate maps that miss a layer and fail for no reason, so the comparison is skipped instead. The check is
 * for an anchor per layer, never for the name of a runner.
 */
export function treeIsComplete(root) {
  return ['src/core', 'src/ui', 'tests', 'docs/maps', 'tools/vendor/acorn/acorn.mjs'].every(p => existsSync(join(root, p)));
}
