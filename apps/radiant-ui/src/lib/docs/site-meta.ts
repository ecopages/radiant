export const RADIANT_GITHUB = 'https://github.com/ecopages/radiant';
export const DEFAULT_SITE_ORIGIN = 'https://radiant-ui.ecopages.app';
export const DEFAULT_OG_IMAGE_PATH = '/assets/images/default-og.png';

function envSiteOrigin(): string | undefined {
	return import.meta.env?.ECOPAGES_BASE_URL ?? process.env.ECOPAGES_BASE_URL;
}

/**
 * Canonical origin for app configuration, LLM index links, and SEO helpers.
 */
export function configuredSiteOrigin(): string {
	return envSiteOrigin() ?? DEFAULT_SITE_ORIGIN;
}

export function normalizeSiteOrigin(origin: string): string {
	return origin.replace(/\/+$/, '');
}

function resolvedOrigin(origin?: string): string {
	return normalizeSiteOrigin(origin ?? configuredSiteOrigin());
}

/**
 * Joins a site origin with a pathname into an absolute URL.
 */
export function absoluteUrl(pathname: string, origin?: string): string {
	const base = resolvedOrigin(origin);
	if (!pathname || pathname === '/') {
		return `${base}/`;
	}

	const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
	return `${base}${path}`;
}

function isAbsoluteHttpUrl(value: string): boolean {
	try {
		const parsed = new URL(value);
		return parsed.protocol === 'http:' || parsed.protocol === 'https:';
	} catch {
		return false;
	}
}

/**
 * Resolves `metadata.image` (public path or `public/...`) to an absolute URL.
 */
export function absoluteImageUrl(image: string | undefined, origin?: string): string {
	const raw = image?.trim() || DEFAULT_OG_IMAGE_PATH;
	if (isAbsoluteHttpUrl(raw)) {
		return raw;
	}

	const withoutPublic = raw.replace(/^public\//, '/');
	const path = withoutPublic.startsWith('/') ? withoutPublic : `/${withoutPublic}`;
	return absoluteUrl(path, origin);
}

export function ogTypeForPathname(pathname: string | undefined): 'website' | 'article' {
	if (!pathname || pathname === '/') {
		return 'website';
	}

	return pathname.startsWith('/docs/') ? 'article' : 'website';
}

export type SoftwareApplicationJsonLd = {
	'@context': 'https://schema.org';
	'@type': 'SoftwareApplication';
	name: string;
	description: string;
	url: string;
	applicationCategory: string;
	operatingSystem: string;
	license: string;
	sameAs: string[];
};

/**
 * Homepage identity for agents that parse JSON-LD.
 */
export function homepageSoftwareApplicationJsonLd(description: string, origin?: string): SoftwareApplicationJsonLd {
	return {
		'@context': 'https://schema.org',
		'@type': 'SoftwareApplication',
		name: 'Radiant UI',
		description,
		url: absoluteUrl('/', origin),
		applicationCategory: 'DeveloperApplication',
		operatingSystem: 'Any',
		license: 'https://opensource.org/licenses/MIT',
		sameAs: [RADIANT_GITHUB],
	};
}
