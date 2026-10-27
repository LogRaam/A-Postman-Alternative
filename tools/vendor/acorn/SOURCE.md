# acorn 8.14.0 (vendored, development only)

- Source: https://registry.npmjs.org/acorn/-/acorn-8.14.0.tgz, file `package/dist/acorn.mjs`
- Integrity (npm `dist.integrity`, checked against the downloaded tarball on 2026-10-26):
  `sha512-cl669nCJTZBsL97OF4kUQm5g5hC2uihk0NxY3WENAC0TYdILVkAyHymAntgxGkl7K+t0cXIrH5siy5S4XkFycA==`
- License: MIT, see `LICENSE` beside this file.

Used by `tools/build.mjs` and the map generators to read the JavaScript source as a syntax tree.
It is never bundled into `dist/relais.html`: the product has no dependency at all.
