## Comments

- No inline `//` for non-obvious behavior — document on the declaration with TSDoc.
- TSDoc only when it adds info beyond the name; never restate the method/class/function.
- Use `@remarks` for rationale, edge cases, and workarounds (`@remarks`-only blocks are fine).
- Skip TSDoc on trivial or self-explanatory code.

## Formatting

- Do not hand-fix style or linter formatting; format-on-save handles it.
- Prefer template literals over string concatenation.
- No emoji; use plain text (e.g. `[check]`).

## TypeScript

- Avoid `any`; prefer `unknown`. If `any` is unavoidable, explain in `@remarks`.
- Fix linter issues; do not ignore or suppress without cause.
- Avoid TypeScript hacks and anti-patterns.

## Ecopages apps (`apps/docs`, `apps/radiant-ui`)

- Their `.eco` build cache stores server modules with the `@ecopages/jsx` runtime inlined, and
  it keys on app source only. Rebuilding a workspace package therefore leaves modules from two
  runtimes in one render pass, and renderables from the older one serialize as
  `[object Object]` — the build still exits 0.
- `guard:cache` runs before `dev`/`build`/`preview` and drops `.eco` when a workspace `dist` is
  newer than the cache; `verify:html` fails the build if any page still contains an unrendered
  value. Do not bypass either — if one fires, the cache was stale, not the guard.
