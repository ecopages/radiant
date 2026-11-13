/**
 * Maps a docs page pathname to the static markdown URL under `/docs-llm/*`.
 *
 * @remarks
 * The generator exports each page as `docs-llm/<first-segment>/<last-segment>.md`,
 * so the slug is the final pathname segment, matching nested paths of any depth.
 * A section URL (`/docs/decorators`) is that section's `index.mdx` page, exported as `docs-llm/<section>/index.md`.
 */
export function getDocsLlmUrlFromPathname(pathname: string): string | null {
	const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean);

	if (segments[0] !== 'docs' || segments.length < 2) {
		return null;
	}

	if (segments.length === 2) {
		return getDocsLlmUrl(segments[1]!, 'index');
	}

	return getDocsLlmUrl(segments[1]!, segments[segments.length - 1]!);
}

/**
 * Maps a docs page to the generated static markdown URL used by the LLM copy action.
 */
export function getDocsLlmUrl(section: string, slug: string): string {
	return `/docs-llm/${section}/${slug}.md`;
}
