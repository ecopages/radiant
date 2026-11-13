/**
 * Docs page paths that changed, as old path to new path: pages that moved into section folders, and section
 * landing pages that moved from `/docs/<section>/index` to `/docs/<section>`.
 *
 * @remarks
 * `scripts/generate-redirects.ts` turns this map into the Cloudflare Pages `_redirects` file, and the legacy
 * `/llms-content/<slug>.txt` exports keep the old slugs through it. Add an entry whenever a page under
 * `src/content/docs` moves; never remove one, so links published before the move keep resolving.
 */
export const MOVED_DOCS_PATHS: Readonly<Record<string, string>> = {
	'/docs/context/index': '/docs/context',
	'/docs/decorators/index': '/docs/decorators',
	'/docs/packages/signals-effects': '/docs/signals/signals-effects',
	'/docs/packages/signals-overview': '/docs/signals/signals-overview',
	'/docs/packages/signals-resources': '/docs/signals/signals-resources',
	'/docs/packages/signals-state-computed': '/docs/signals/signals-state-computed',
	'/docs/packages/signals-stores': '/docs/signals/signals-stores',
};
