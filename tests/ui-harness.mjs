// Runs the real page in headless Chrome (or Edge) and drives it like a user. No dependency: the browser already
// on the machine is used, found by CHROME_PATH or the usual install paths. fetch() is replaced by a fake answering
// from a plan, so no test touches the network and every run gives the same result.

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from '../tools/source.mjs';
import { buildHtml } from '../tools/build.mjs';

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
];

/** The browser to drive, or null when none is installed where we look. */
export const BROWSER = CANDIDATES.find(path => path && existsSync(path)) || null;

/** Why the UI tests are skipped, or false when they can run. SKIP_UI_TESTS=1 skips them for a fast run. */
export const SKIP_UI = process.env.SKIP_UI_TESTS === '1' ? 'SKIP_UI_TESTS=1: UI tests skipped for a fast run'
  : BROWSER ? false : 'no Chrome or Edge found: set CHROME_PATH to run the UI tests';

/** The page as built from the current sources, once per test run. */
let page = null;

/**
 * Opens the page, runs scenario(tools) in it and returns what the scenario returned. responses(url, init) is the
 * fake server: it returns { status, body, delay } or { fail: true } for a network error. Rejects with the page's
 * own error when the app throws (at start or during the scenario).
 */
export async function runInPage(scenario, responses = () => ({ status: 200, body: '{}' })) {
  page ??= buildHtml(ROOT);
  const dir = mkdtempSync(join(tmpdir(), 'pa-ui-'));
  const file = join(dir, 'page.html');
  const harness = '<script>(' + HARNESS + ')(' + responses.toString() + ', ' + scenario.toString() + ');</script>';
  // The harness goes right after <body> so it sees errors thrown while the app starts.
  writeFileSync(file, page.replace('<body>', '<body>' + harness));
  try {
    const dom = await dumpDom(pathToFileURL(file).href, join(dir, 'profile'));
    const match = dom.match(/data-ui-result="([^"]*)"/);
    if (!match) throw new Error('The page wrote no result. Its DOM began with: ' + dom.slice(0, 300));
    const result = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
    if (result.error) throw new Error('In the page: ' + result.error);
    return result.value;
  } finally {
    try { rmSync(dir, { recursive: true, force: true }); } catch { /* the browser may still hold its profile on Windows */ }
  }
}

/** The serialized DOM of a page once its scripts have settled (virtual time: timers run without real waiting). */
function dumpDom(url, profile) {
  return new Promise((resolve, reject) => {
    const args = ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--user-data-dir=' + profile,
      '--virtual-time-budget=30000', '--dump-dom', url];
    const child = spawn(BROWSER, args, { stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('The browser did not finish within 60 s.')); }, 60000);
    child.stdout.on('data', chunk => { out += chunk; });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', () => { clearTimeout(timer); resolve(out); });
  });
}

/**
 * Runs in the page. Installs the fake fetch, waits for the app, runs the scenario with small tools, and writes
 * { value } or { error } into <html data-ui-result> as base64 JSON (attribute-safe).
 */
function HARNESS(responses, scenario) {
  const errors = [];
  window.addEventListener('error', event => errors.push(event.message));
  const calls = [];
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  window.fetch = async (url, init = {}) => {
    const headers = Object.fromEntries(new Headers(init.headers || []).entries());
    calls.push({ url: String(url), method: init.method || 'GET', headers, body: init.body ?? null });
    const plan = responses(String(url), init) || {};
    if (plan.delay) await sleep(plan.delay);
    if (init.signal && init.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (plan.fail) throw new TypeError('Failed to fetch');
    return new Response(plan.body ?? '', { status: plan.status ?? 200, headers: { 'content-type': 'application/json', ...(plan.headers || {}) } });
  };
  const $ = id => document.getElementById(id);
  const tools = {
    $, calls, sleep,
    type(element, value) {
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    },
    key(key, options = {}) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key, ctrlKey: true, bubbles: true, ...options }));
    },
    async until(condition, what) {
      for (let i = 0; i < 200; i++) { if (condition()) return; await sleep(50); }
      throw new Error('Timed out waiting for ' + what);
    },
    text: id => $(id).textContent.trim(),
    button: (root, label) => [...root.querySelectorAll('button')].find(b => b.textContent.trim() === label),
  };
  const write = result => {
    const json = JSON.stringify(result);
    document.documentElement.setAttribute('data-ui-result', btoa(unescape(encodeURIComponent(json))));
  };
  window.addEventListener('load', async () => {
    try {
      await sleep(50);
      if (errors.length) throw new Error('The app failed to start: ' + errors.join(' | '));
      const value = await scenario(tools);
      if (errors.length) throw new Error(errors.join(' | '));
      write({ value });
    } catch (error) {
      write({ error: error.message });
    }
  });
}
