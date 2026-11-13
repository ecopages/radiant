import { DOCS_ROOT } from '@/content/docs';

/** File name of a section's landing page, served at the section URL. */
export const SECTION_INDEX_SEGMENT = 'index';

/**
 * Route segments for a content entry: `decorators/index` is served as `decorators`.
 *
 * @remarks
 * Cloudflare Pages answers `/docs/<section>/index` with a 308 to `/docs/<section>/`, so a section landing page must
 * live at `/docs/<section>` for its URL to resolve.
 */
export function docsRouteSegments(entrySegments: readonly string[]): string[] {
	return entrySegments.length > 1 && entrySegments[entrySegments.length - 1] === SECTION_INDEX_SEGMENT
		? entrySegments.slice(0, -1)
		: [...entrySegments];
}

/** Content entry segments for route segments: `decorators` maps back to `decorators/index`. */
export function docsEntrySegments(routeSegments: readonly string[]): string[] {
	return routeSegments.length === 1 ? [...routeSegments, SECTION_INDEX_SEGMENT] : [...routeSegments];
}

/** Public URL of a content entry. */
export function docsPathForEntry(entrySegments: readonly string[]): string {
	return `${DOCS_ROOT}/${docsRouteSegments(entrySegments).join('/')}`;
}
