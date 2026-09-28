/**
 * Maps a docs page pathname to the static text export under `/llms-content/*`.
 */
export function getDocsLlmUrlFromPathname(pathname: string): string | null {
	const segments = pathname.replace(/\/$/, '').split('/').filter(Boolean);

	if (segments[0] !== 'docs' || segments.length < 2) {
		return null;
	}

	return getDocsLlmUrl(segments.slice(1).join('/'));
}

export function getDocsLlmUrl(slug: string): string {
	return `/llms-content/${slug}.txt`;
}
