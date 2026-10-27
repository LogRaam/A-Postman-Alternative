# The maps: views of A Postman Alternative generated from its own source

Nothing in this folder is written by hand except this file. Each map is regenerated from the source by
`tests/maps.test.mjs`, and `npm test` FAILS when a committed map no longer matches the code. The method, and why
it exists, is explained in the [generated-maps skill](https://github.com/LogRaam/My-Claude-Skills/tree/main/generated-maps).

## What to read, and when

| Map | Read it to answer |
|---|---|
| [`inventory.md`](inventory.md) | Does this function or constant already exist, and where? Every module by layer, every top-level declaration with its one-line doc. |
| [`dependencies.md`](dependencies.md) | Who imports whom? Cycles first, then the layer rule (core never imports ui), then counts, then every edge. |
| [`rules.md`](rules.md) | What does the app promise to do? Every test name, by file and `describe` block. |
| [`export-format.md`](export-format.md) | **Contract.** What does an export file hold? Every field, with its type. |
| [`dom-ids.md`](dom-ids.md) | Which ids do `src/index.html` and the code share? Every id, where the template declares it, and every place that looks it up, each labelled with how it was found. |

## Which checks INFORM, and which BLOCK

**Informing:** the five maps above, and `dist/postman-alternative.html` being built from the current sources. They fail, you
read the diff, you regenerate, you commit. Whatever the code says becomes the new truth.

**Blocking:** regenerating does not make these green.

- **Export format.** A user's exported file must keep importing after an upgrade. A field that SHIPPED may not
  disappear or narrow its type. The guard compares with [`export-format-released.md`](export-format-released.md),
  the format as last released, not with the committed map. Override: `ALLOW_FORMAT_FIELD_REMOVAL=1`, with the
  reason in the commit.
- **Export format, the other direction.** A field ADDED since the release must accept `missing` (or sit under a
  new optional field): a required new field makes every file the released version wrote fail to import, which
  is just as breaking as a removal. `tests/fixtures/export-v0.1-0dfa0d9.json`, written by the real v0.1 code,
  must keep importing; never regenerate it.
- **Ratchets** (`tools/maps/ratchets.mjs`): modules in an import cycle, imports from `src/core` into another
  layer, source files of 300 lines and more, ids the code looks up that the template does not declare, and ids
  declared twice. All at baseline 0; none may grow.
- **UI tests** (`tests/ui.test.mjs`) drive the real page in headless Chrome or Edge with a fake server. Without a
  browser they are skipped and say why; `SKIP_UI_TESTS=1` skips them for a fast run.

The build (`tools/build.mjs`) blocks too, on its own: it joins every module into one script, so it refuses two
modules declaring the same top-level name, aliased imports, `export default`, and modules nothing imports.

## The loop, for every change

1. Before writing: read the map that answers your question.
2. Make the change.
3. `npm test` in plain mode FIRST. Read every map failure: it names the map and prints the diff.
4. Only then `npm run build` (when `src/` changed) and `npm run update-maps`, which prints what moved.
5. `npm test` again, then commit the maps WITH the change, saying in the message what they showed.

## At a release

After bumping `version` in `package.json`: `npm run update-maps -- --record-released`. It writes
`export-format-released.md`, which is what the format guard then protects. A plain regeneration never touches it.

## What the maps cannot see

- A behaviour that changed with no test changing: that is a missing test.
- An id built at run time (`dom-ids.md`, "Computed lookups"). Pass `byId('literal')` where you can, so the map
  can check it.
- A module reaching another through a global rather than an import: the build joins everything into one scope,
  so only review catches it.
- Whether `src/core` stays free of the DOM: no map checks for `document` or `window` there yet. Add a lens if it
  goes wrong twice.

## Adding a map

A generator in `tools/maps`, one line in `tools/maps/index.mjs`, one row in the table above. Add one when a family
of bug has shown itself twice, not before.
