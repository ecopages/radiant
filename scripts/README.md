# Build guards

`ecopages-invalidate-stale-cache.mts` removes a docs app's `.eco` cache when an app source file or workspace package build is newer than its oldest cached server module. This prevents a changed client script from producing a new bundle while cached page HTML still loads the old bundle. It also prevents cached modules built against an older `@ecopages/jsx` runtime from mixing with newer ones.

Generated `src/public/llms.txt` and `src/public/llms-content/` exports are excluded from the source check because both docs apps regenerate them on every build. `apps/docs/test/cache-guard.e2e.test.mjs` covers source invalidation and that exclusion.
