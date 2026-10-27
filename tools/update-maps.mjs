// Regenerates every map in docs/maps and PRINTS what moved: counts per map, and the full diff of any change
// short enough to read. Run the tests in plain mode FIRST ("npm test"), read the failures, and only then this.
//
//   npm run update-maps                                  regenerate the informing maps
//   npm run update-maps -- --record-released             also record the export format as released (release cut only)
//   ALLOW_FORMAT_FIELD_REMOVAL=1 npm run update-maps     regenerate although a released export field is gone
//
// It refuses, and writes nothing, when a released export field disappeared. It reports a broken ratchet and
// leaves it red: there is no copy to bring up to date.

import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readText } from './source.mjs';
import { MAPS, treeIsComplete } from './maps/index.mjs';
import { describeDiff } from './maps/diff.mjs';
import { brokenReleasedFields, releasedSnapshot, RELEASED_FILE } from './maps/export-format.mjs';
import { ratchetProblems } from './maps/ratchets.mjs';

if (!treeIsComplete(ROOT)) {
  console.error('The source tree is incomplete; refusing to regenerate maps from it.');
  process.exit(1);
}

const broken = await brokenReleasedFields(ROOT);
if (broken.length && process.env.ALLOW_FORMAT_FIELD_REMOVAL !== '1') {
  console.error('REFUSED: these export fields shipped and are gone or narrower: ' + broken.map(([p, t]) => p + ' (' + t + ')').join(', '));
  console.error('Users\' exported files would stop importing. Nothing was written.');
  process.exit(1);
}

let moved = 0;
for (const map of MAPS) {
  const generated = await map.generate(ROOT);
  const committed = existsSync(join(ROOT, map.file)) ? readText(map.file) : '';
  if (committed === generated) {
    console.log('unchanged  ' + map.file);
    continue;
  }
  moved++;
  console.log('MOVED      ' + map.file + '  ' + describeDiff(committed, generated));
  writeFileSync(join(ROOT, map.file), generated);
}

if (process.argv.includes('--record-released')) {
  const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
  writeFileSync(join(ROOT, RELEASED_FILE), await releasedSnapshot(ROOT, version));
  console.log('RECORDED   ' + RELEASED_FILE + ' as released in ' + version);
}

const ratchets = ratchetProblems(ROOT);
for (const line of ratchets) console.log(line);
console.log(moved ? '\n' + moved + ' map(s) moved: read the lines above, then commit the maps WITH the change.' : '\nNo map moved.');
if (ratchets.length) process.exit(1);
