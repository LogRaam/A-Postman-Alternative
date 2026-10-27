// The maps in docs/maps are current, the export format keeps every released field, and the ratchets hold.
// A failure here is never a bug in the code under test: the code moved and the map did not.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readText } from '../tools/source.mjs';
import { MAPS, treeIsComplete } from '../tools/maps/index.mjs';
import { describeDiff } from '../tools/maps/diff.mjs';
import { brokenReleasedFields } from '../tools/maps/export-format.mjs';
import { ratchetProblems } from '../tools/maps/ratchets.mjs';
import { buildHtml, OUTPUT_FILE } from '../tools/build.mjs';

const skip = treeIsComplete(ROOT) ? false : 'partial copy of the sources: nothing to compare with';

describe('Informing maps (regenerate, read, commit)', () => {
  for (const map of MAPS) {
    test(map.file + ' matches the code', { skip }, async () => {
      const generated = await map.generate(ROOT);
      const committed = existsSync(join(ROOT, map.file)) ? readText(map.file) : '';
      if (committed !== generated) {
        assert.fail(map.file + ' drifted: ' + describeDiff(committed, generated)
          + '\nRead it, then run "npm run update-maps" and commit the map WITH the change.');
      }
    });
  }
  test(OUTPUT_FILE + ' is built from the current sources', { skip }, () => {
    const committed = existsSync(join(ROOT, OUTPUT_FILE)) ? readText(OUTPUT_FILE) : '';
    assert.ok(committed === buildHtml(ROOT), OUTPUT_FILE + ' is stale: run "npm run build" and commit it with the change.');
  });
});

describe('Blocking checks (regenerating never fixes these)', () => {
  test('every released export field is still read, with no narrower type', { skip }, async () => {
    const broken = await brokenReleasedFields(ROOT);
    if (broken.length && process.env.ALLOW_FORMAT_FIELD_REMOVAL !== '1') {
      assert.fail('These export fields shipped and are gone or narrower: ' + broken.map(([p, t]) => p + ' (' + t + ')').join(', ')
        + '. Users\' exported files would stop importing. Put them back, or set ALLOW_FORMAT_FIELD_REMOVAL=1 and explain why in the commit.');
    }
  });
  test('the ratchets hold at their baselines', { skip }, () => {
    assert.deepEqual(ratchetProblems(ROOT), []);
  });
});
