## Quick orientation

This is a small client-side demo SPA (no backend) that simulates a B2B2C investment product. Key entry points:

- `index.html` — static page, loads the app with `<script type="module" src="./src/app.js"></script>`.
- `src/app.js` — app bootstrap: initializes state, registers routes and mounts the router root (`#app`).
- `src/router.js` — tiny client-side router. Route handlers must return a DOM Node (Element or DocumentFragment) that the router appends to `#app`.
- `src/state.js` — demo application state stored in `localStorage` and `sessionStorage` (keys: `avuntia-demo-state`, `avuntia-demo-session`, `avuntia-demo-employee-session`). Use exported helpers like `getState()`, `updateEmployeePortal()` and `resetDemoState()`.

## Architecture & flow (short)

- On load `src/app.js` calls `initState()`, sets the router root with `setRoot(...)` and then `registerAllRoutes()` (see `src/views/register.js`).
- Views are grouped under `src/views/*`. Each `get*Routes()` returns an object mapping path -> handler. Example: `src/views/empleado.js` exports `getEmpleadoRoutes()` and handlers such as `/empleado/kid/:isin` (router supports `:param` segments).
- Handlers build a DOM fragment using `src/utils/dom.js` helpers (`createEl`, `html`) and return it. The router focuses the root afterwards and dispatches an `avuntia:navigate` event.
- State is read/updated via `src/state.js` functions. For local debugging the state is exposed on `window.__avuntiaState` with `get()` and `reset()`.

## Important conventions (project-specific)

- Route handlers return DOM nodes — do NOT attempt to call `rootElement.innerHTML = '...'` directly inside the handler; return an Element or DocumentFragment (see `render()` in `src/router.js`).
- Use `html` template helper from `src/utils/dom.js` to build fragments safely and `createEl()` for element construction/config.
- Use `navigate(path)` from `src/router.js` (or `a[data-link]` links) to change routes without reload. `app.js` wires global click delegation for `a[data-link]`.
- All user-visible strings and demo data live in `src/data/seed.js` and views; the demo uses Spanish strings by default.
- Files under `src/utils/` provide small helpers (formatting, csv parsing, PDF generation, toasts). Reuse them instead of reimplementing (e.g., `openSimplePdf()` in `src/utils/pdf.js`).

## Debugging & developer workflows

- Do NOT open `index.html` with `file://` in modern browsers because ES modules require an HTTP origin. Serve the folder locally. Example quick options:

  - Python: `python3 -m http.server 8000` (then open http://localhost:8000)
  - VS Code: use Live Server or the built-in static server extension.

- Browser DevTools tips:
  - Inspect the router: check `window.location.pathname` and listen for `avuntia:navigate` events.
  - Inspect app state: run `window.__avuntiaState.get()` to see the current demo state, or `window.__avuntiaState.reset()` to wipe demo data.
  - Check `localStorage` / `sessionStorage` keys: `avuntia-demo-state`, `avuntia-demo-session`, `avuntia-demo-employee-session`.

## Examples (copy-paste patterns)

- Registering routes (done centrally): `src/views/register.js`
  - It merges `getPublicRoutes()`, `getEmpresaRoutes()` and `getEmpleadoRoutes()` then calls `registerRoutes({...})` and `registerNotFound(...)`.

- Route handler signature and return (see `src/views/empleado.js`):
  - `function renderKidViewer({ params }) { /* ... */ return wrapper; }` — router passes `{ params, pathname }` and expects an Element back.

- Accessing and mutating demo state (examples from `src/views/empleado.js`):
  - `const state = getState()` — read a deep-cloned snapshot.
  - `updateEmployeePortal({ contributions: {...}, paused: true })` — update only parts and persist to localStorage.

## Notes & gotchas

- Because this is a static ES module SPA, imports use relative paths (e.g. `./src/app.js`). Any tooling that rewrites paths must preserve these module imports.
- Router supports simple path params via `:name` segments (see `compilePath` in `src/router.js`); handlers receive decoded params.
- Focus management: the router focuses the root element after render — tests or scripts that rely on focus should account for this.
- `structuredClone` is used in `src/utils/object.js` when available; fallback to `JSON` deep clone is used on older environments.

## Where to look next (key files)

- `index.html`, `src/app.js` — bootstrap and global interactions
- `src/router.js` — routing & param matching
- `src/state.js` — demo state surface and persistence
- `src/views/*.js` — real UI and route handlers (start with `public.js` and `empleado.js`)
- `src/utils/*.js` — small reusable helpers (format, csv, pdf, toast)

If any area is unclear or you want more examples (tests, suggested linters, or a local dev task runner), tell me which part to expand and I'll iterate the file. 
