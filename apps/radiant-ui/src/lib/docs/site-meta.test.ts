import { expect, test } from 'vitest';
import {
	DEFAULT_OG_IMAGE_PATH,
	RADIANT_GITHUB,
	absoluteImageUrl,
	absoluteUrl,
	homepageSoftwareApplicationJsonLd,
	ogTypeForPathname,
} from './site-meta';

const origin = 'https://radiant-ui.ecopages.app';

test('absoluteUrl normalizes origin and pathname', () => {
	expect(absoluteUrl('/', origin)).toBe('https://radiant-ui.ecopages.app/');
	expect(absoluteUrl('/docs/getting-started/introduction', origin)).toBe(
		'https://radiant-ui.ecopages.app/docs/getting-started/introduction',
	);
	expect(absoluteUrl('docs/getting-started/introduction', `${origin}/`)).toBe(
		'https://radiant-ui.ecopages.app/docs/getting-started/introduction',
	);
	expect(absoluteUrl('/docs/getting-started/introduction')).toMatch(/\/docs\/getting-started\/introduction$/);
});

test('absoluteImageUrl strips public/ and falls back to the default OG path', () => {
	expect(absoluteImageUrl(undefined, origin)).toBe(`https://radiant-ui.ecopages.app${DEFAULT_OG_IMAGE_PATH}`);
	expect(absoluteImageUrl('public/assets/images/default-og.png', origin)).toBe(
		`https://radiant-ui.ecopages.app${DEFAULT_OG_IMAGE_PATH}`,
	);
	expect(absoluteImageUrl('/assets/images/default-og.png', origin)).toBe(
		`https://radiant-ui.ecopages.app${DEFAULT_OG_IMAGE_PATH}`,
	);
	expect(absoluteImageUrl('https://cdn.example.com/og.png', origin)).toBe('https://cdn.example.com/og.png');
});

test('ogTypeForPathname uses website on home and article on docs', () => {
	expect(ogTypeForPathname(undefined)).toBe('website');
	expect(ogTypeForPathname('/')).toBe('website');
	expect(ogTypeForPathname('/docs/getting-started/introduction')).toBe('article');
});

test('homepageSoftwareApplicationJsonLd names GitHub as sameAs', () => {
	const jsonLd = homepageSoftwareApplicationJsonLd('Accessible UI components for the web.', origin);
	expect(jsonLd['@type']).toBe('SoftwareApplication');
	expect(jsonLd.name).toBe('Radiant UI');
	expect(jsonLd.url).toBe('https://radiant-ui.ecopages.app/');
	expect(jsonLd.sameAs).toEqual([RADIANT_GITHUB]);
});
