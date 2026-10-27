// Builds dist/postman-alternative.html: every module under src/ joined into one inline script, in import order.
//
// The modules are plain ES modules so node:test can import them. Joining them works by deleting the import
// lines and the "export " keywords, so all top-level names end up in ONE scope. The build therefore refuses,
// loudly, anything that joining would silently break: two modules declaring the same top-level name, an
// aliased or default import, export default / export * / export { }, a cycle, a module nothing imports.

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, listFiles, readText, readModule } from './source.mjs';

export const ENTRY_FILE = 'src/ui/app.js';
export const ENTRY_CALL = 'startApp();';
export const OUTPUT_FILE = 'dist/postman-alternative.html';

/** The text of dist/postman-alternative.html, built from the sources. Throws with every problem found. */
export function buildHtml(root = ROOT) {
  const paths = listFiles('src', '.js', root);
  const modules = new Map(paths.map(path => [path, readModule(path, root)]));
  const problems = [];

  for (const module of modules.values()) {
    for (const node of module.ast.body) {
      if (node.type === 'ExportDefaultDeclaration') problems.push(module.path + ': "export default" cannot be joined; export a named declaration.');
      if (node.type === 'ExportAllDeclaration') problems.push(module.path + ': "export *" cannot be joined.');
      if (node.type === 'ExportNamedDeclaration' && !node.declaration) problems.push(module.path + ': "export { ... }" cannot be joined; put "export" on the declaration.');
    }
    for (const imp of module.imports) {
      if (!modules.has(imp.from)) problems.push(module.path + ': imports "' + imp.node.source.value + '", which is not a module under src/.');
      for (const s of imp.node.specifiers) {
        if (s.type !== 'ImportSpecifier') problems.push(module.path + ': only "import { a, b } from" can be joined.');
        else if (s.imported.name !== s.local.name) problems.push(module.path + ': "' + s.imported.name + ' as ' + s.local.name + '" cannot be joined; use the name as exported.');
      }
    }
    if (/\bimport\s*\(/.test(module.text)) problems.push(module.path + ': dynamic import() cannot be joined.');
  }

  const owners = new Map();
  for (const module of modules.values()) {
    for (const decl of module.declarations) {
      if (decl.name === '(destructured)') problems.push(module.path + ':' + decl.line + ': a destructured top-level declaration cannot be checked for collisions.');
      else owners.set(decl.name, [...(owners.get(decl.name) || []), module.path]);
    }
  }
  for (const [name, where] of owners) {
    if (where.length > 1) problems.push('"' + name + '" is declared at the top level of ' + where.join(' and ') + '; joined into one script they would collide. Rename one.');
  }

  const order = [];
  const state = new Map();
  const visit = (path, chain) => {
    if (state.get(path) === 'done' || !modules.has(path)) return;
    if (state.get(path) === 'visiting') { problems.push('Import cycle: ' + [...chain, path].join(' -> ')); return; }
    state.set(path, 'visiting');
    for (const imp of modules.get(path).imports) visit(imp.from, [...chain, path]);
    state.set(path, 'done');
    order.push(path);
  };
  if (!modules.has(ENTRY_FILE)) problems.push('The entry module ' + ENTRY_FILE + ' is missing.');
  else visit(ENTRY_FILE, []);
  for (const path of paths) if (!state.has(path)) problems.push(path + ' is not imported by anything reachable from ' + ENTRY_FILE + '.');

  if (problems.length) throw new Error('The build refused the sources:\n- ' + problems.join('\n- '));

  const parts = order.map(path => '// ---- ' + path + ' ----\n' + stripModuleSyntax(modules.get(path)).trim() + '\n');
  let bundle = '(() => {\n\'use strict\';\n\n' + parts.join('\n') + '\n' + ENTRY_CALL + '\n})();';
  bundle = bundle.replace(/<\/script/gi, '<\\/script');
  const template = readText('src/index.html', root);
  if (!template.includes('/*@bundle@*/')) throw new Error('src/index.html has lost its /*@bundle@*/ marker.');
  return template.replace('/*@bundle@*/', () => bundle);
}

function stripModuleSyntax(module) {
  const cuts = [];
  for (const node of module.ast.body) {
    if (node.type === 'ImportDeclaration') cuts.push([node.start, lineEnd(module.text, node.end)]);
    if (node.type === 'ExportNamedDeclaration') cuts.push([node.start, node.declaration.start]);
  }
  let text = module.text;
  for (const [start, end] of cuts.sort((a, b) => b[0] - a[0])) text = text.slice(0, start) + text.slice(end);
  return text;
}

function lineEnd(text, index) {
  return text[index] === '\n' ? index + 1 : index;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const html = buildHtml();
    mkdirSync(join(ROOT, 'dist'), { recursive: true });
    writeFileSync(join(ROOT, OUTPUT_FILE), html);
    console.log('Wrote ' + OUTPUT_FILE + ' (' + Buffer.byteLength(html) + ' bytes).');
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
