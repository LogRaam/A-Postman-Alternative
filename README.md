# Relais

**An HTTP client in one self-contained HTML file.** No install, no account, no dependency: download
[`dist/relais.html`](dist/relais.html), open it in a browser, send requests.

- Method, address, query parameters, headers, and a JSON or raw-text body.
- The response: status, time, size, headers, and the body (JSON re-indented).
- A history of what you sent; click an entry to load it again. Export it to a JSON file and import it on another
  machine or after an upgrade.
- Ctrl+Enter sends. Light and dark themes follow your system.

## What a web page cannot do

Relais runs inside the browser, so the browser's rules apply. Desktop clients do not have these limits.

- **CORS.** A server only answers a web page if it allows it (`Access-Control-Allow-Origin`). Many public APIs
  do, and you can allow it on your own development API. When a server does not, the browser hides the response
  entirely and Relais can only say so. Opened from a file, the page's origin is `null`: the server must allow `*`
  or `null`.
- **Some headers cannot be set**: `Cookie`, `Host`, `Origin`, `User-Agent`, `Content-Length` and a few more. Relais
  strikes them through as you type and tells you they were not sent.
- **Only the response headers the server exposes are visible** (`Access-Control-Expose-Headers`).
- No control over redirects, certificates or proxies.

Your history is kept in the browser's storage, which can be cleared with site data. The export file is the copy
to keep.

## Development

Requires Node.js 20 or later. There is no `npm install`: the project has no dependencies.

```
npm test               # unit tests, maps, build freshness, format guard, ratchets
npm run build          # writes dist/relais.html from src/
npm run update-maps    # regenerates docs/maps and prints what moved
```

- `src/core/`: logic with no DOM, tested under `node:test`.
- `src/ui/`: the page.
- `src/index.html`: the template; the build joins every module into one inline script.
- `tools/`: the build and the map generators. `tools/vendor/acorn` is a JavaScript parser used only by these
  tools, never shipped (see its `SOURCE.md`).

### The maps

`docs/maps/` holds views of the code generated from the source (an inventory, the dependencies, the rules the
tests promise, the export format), checked by the test suite. Read [docs/maps/README.md](docs/maps/README.md)
before changing anything. The method is the
[generated-maps skill](https://github.com/LogRaam/My-Claude-Skills/tree/main/generated-maps).

For every change: `npm test` FIRST and read what the maps say moved, then `npm run build` and
`npm run update-maps`, then commit the maps with the change.
