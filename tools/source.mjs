// Reads the JavaScript under src/ (and tests/) as syntax trees, for the build and the map generators.
// Paths are always POSIX and relative to the repository root, so every output is the same on every machine.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, dirname, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from './vendor/acorn/acorn.mjs';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Every file under a folder of the repository with this extension, sorted, as POSIX relative paths. */
export function listFiles(folder, extension, root = ROOT) {
  const out = [];
  const walk = dir => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(extension)) out.push(relative(root, full).split('\\').join('/'));
    }
  };
  if (existsSync(join(root, folder))) walk(join(root, folder));
  return out.sort();
}

/** Line endings as LF, whatever the checkout did. */
export function readText(path, root = ROOT) {
  return readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n');
}

/**
 * One module: its text, syntax tree, comments, imports (resolved to repository paths), and top-level
 * declarations with whether they are exported and their doc comment.
 */
export function readModule(path, root = ROOT) {
  const text = readText(path, root);
  const comments = [];
  const ast = parse(text, { ecmaVersion: 'latest', sourceType: 'module', onComment: comments, locations: true });
  const imports = [];
  const declarations = [];
  for (const node of ast.body) {
    if (node.type === 'ImportDeclaration') {
      imports.push({
        node,
        from: node.source.value.startsWith('.') ? posix.normalize(posix.join(posix.dirname(path), node.source.value)) : node.source.value,
        names: node.specifiers.map(s => s.local.name),
      });
      continue;
    }
    const exported = node.type === 'ExportNamedDeclaration' && node.declaration;
    const decl = exported ? node.declaration : node;
    for (const name of declaredNames(decl)) {
      declarations.push({ name, kind: declKind(decl), exported: Boolean(exported), line: node.loc.start.line, doc: docBefore(comments, node) });
    }
  }
  return { path, text, ast, comments, imports, declarations, header: fileHeader(comments, ast) };
}

function declaredNames(node) {
  if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') return [node.id.name];
  if (node.type === 'VariableDeclaration') return node.declarations.map(d => (d.id.type === 'Identifier' ? d.id.name : '(destructured)'));
  return [];
}

function declKind(node) {
  if (node.type === 'FunctionDeclaration') return 'function';
  if (node.type === 'ClassDeclaration') return 'class';
  if (node.type === 'VariableDeclaration') return node.kind;
  return node.type;
}

/**
 * The first sentence of the /** *\/ comment that TOUCHES a node (ends on the line just above it), or ''.
 * A comment separated by a blank line is the file's header, not this declaration's doc: without that rule the
 * header of a file was reported as the doc of its first constant.
 */
function docBefore(comments, node) {
  const block = comments.find(c => c.type === 'Block' && c.value.startsWith('*') && c.end <= node.start && c.loc.end.line === node.loc.start.line - 1);
  return block ? firstSentence(cleanDoc(block.value)) : '';
}

/** The module's opening comment (a block or the // lines before any code) unless it touches the first declaration. */
function fileHeader(comments, ast) {
  const first = ast.body[0];
  const opening = comments.filter(c => !first || c.end <= first.start);
  if (!opening.length) return '';
  const touchesFirst = first && first.type !== 'ImportDeclaration' && opening.at(-1).loc.end.line === first.loc.start.line - 1;
  if (touchesFirst && opening.length === 1) return '';
  const block = opening.find(c => c.type === 'Block');
  if (block) return firstSentence(cleanDoc(block.value));
  return firstSentence(opening.filter(c => c.type === 'Line').map(c => c.value.trim()).join(' '));
}

function cleanDoc(value) {
  return value.split('\n').map(line => line.replace(/^\s*\*?\s?/, '')).join(' ').replace(/\s+/g, ' ').trim();
}

function firstSentence(text) {
  const match = text.match(/^(.+?[.!?])(\s|$)/);
  return (match ? match[1] : text).trim();
}
