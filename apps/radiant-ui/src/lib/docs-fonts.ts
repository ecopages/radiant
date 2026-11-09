export type DocsFontRole = 'sans' | 'heading' | 'mono';

/**
 * Browser-router attribute that keeps a head element across navigations.
 *
 * @remarks The router removes every head element the incoming page lacks. A stylesheet link added by script, such as
 * a font or the theme, would be removed on each client navigation and re-added a tick later, which reloads it and
 * flashes the default look.
 */
export const DOCS_HEAD_PERSIST_ATTR = 'data-eco-persist';

export const DOCS_FONT_ROLES: readonly DocsFontRole[] = ['sans', 'heading', 'mono'];

export const DOCS_FONT_VARIABLES: Record<DocsFontRole, string> = {
	sans: '--font-sans',
	heading: '--font-heading',
	mono: '--font-mono',
};

/** One row of `font-catalog.json`: Fontsource id, family, category, and 1 when a variable package exists. */
export type DocsFontCatalogRow = readonly [id: string, family: string, category: string, variable: 0 | 1];

export type DocsFont = {
	/** Fontsource id, for example `ibm-plex-sans`. */
	id: string;
	label: string;
	kind: 'sans' | 'mono';
	/** CSS `font-family` name the Fontsource stylesheet declares. */
	family: string;
	/** npm package that ships the font files and `@font-face` rules. */
	pkg: string;
	/** Generic fallbacks appended after the family in the generated stack. */
	fallback: string;
};

/** Selected fonts per role. A missing role keeps the theme's own stack. */
export type DocsFonts = Partial<Record<DocsFontRole, DocsFont>>;

/**
 * Shapes a stored font must match before it reaches a stylesheet URL or a `font-family` declaration.
 *
 * @remarks
 * Stored fonts are read back from `localStorage`, so they are untrusted. The blocking boot script embeds these
 * sources, so keep them free of `/` delimiters.
 */
export const DOCS_FONT_PATTERNS = {
	id: '^[a-z0-9][a-z0-9-]*$',
	family: '^[A-Za-z0-9][A-Za-z0-9 .+&-]*$',
	pkg: '^@fontsource(-variable)?/[a-z0-9][a-z0-9-]*$',
	fallback: '^[A-Za-z0-9 ,-]+$',
} as const;

const FALLBACKS: Record<string, string> = {
	'sans-serif': 'ui-sans-serif, system-ui, sans-serif',
	serif: 'ui-serif, Georgia, serif',
	monospace: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
	handwriting: 'cursive',
	display: 'ui-sans-serif, system-ui, sans-serif',
	other: 'ui-sans-serif, system-ui, sans-serif',
};

/**
 * Turns a catalog row into a font.
 *
 * @remarks
 * Fontsource names variable packages `@fontsource-variable/<id>` and declares their family as `<family> Variable`;
 * static packages are `@fontsource/<id>` with the plain family. Checked against a sample of the published packages.
 */
export function docsFontFromRow([id, family, category, variable]: DocsFontCatalogRow): DocsFont {
	return {
		id,
		label: family,
		kind: category === 'monospace' ? 'mono' : 'sans',
		family: variable ? `${family} Variable` : family,
		pkg: `${variable ? '@fontsource-variable' : '@fontsource'}/${id}`,
		fallback: FALLBACKS[category] ?? FALLBACKS.other,
	};
}

/** The `font-family` value for a font: quoted family, then its fallbacks. */
export function docsFontStack(font: DocsFont): string {
	return `'${font.family}', ${font.fallback}`;
}

/** Cacheable stylesheet that declares `font`'s `@font-face` rules, for the live preview only. */
export function docsFontStylesheetUrl(font: DocsFont): string {
	return `https://cdn.jsdelivr.net/npm/${font.pkg}@5/index.css`;
}

/**
 * Whether a font of `kind` can fill `role`. Body and headings take any font, a monospace one included; the code role
 * takes only monospace fonts, since proportional text breaks code alignment.
 */
export function docsFontFitsRole(kind: DocsFont['kind'], role: DocsFontRole): boolean {
	return role !== 'mono' || kind === 'mono';
}

function isDocsFont(value: unknown, role: DocsFontRole): value is DocsFont {
	if (value == null || typeof value !== 'object') return false;
	const font = value as Record<string, unknown>;
	const matches = (key: keyof typeof DOCS_FONT_PATTERNS) =>
		typeof font[key] === 'string' && new RegExp(DOCS_FONT_PATTERNS[key]).test(font[key]);
	return (
		matches('id') &&
		matches('family') &&
		matches('pkg') &&
		matches('fallback') &&
		typeof font.label === 'string' &&
		(font.kind === 'sans' || font.kind === 'mono') &&
		docsFontFitsRole(font.kind, role)
	);
}

/** Keeps only the well-formed fonts of an unknown value, so storage can never inject a stack or a URL. */
export function parseDocsFonts(value: unknown): DocsFonts {
	if (value == null || typeof value !== 'object') return {};
	const record = value as Record<string, unknown>;
	const fonts: DocsFonts = {};
	for (const role of DOCS_FONT_ROLES) {
		const font = record[role];
		if (isDocsFont(font, role)) {
			fonts[role] = {
				id: font.id,
				label: font.label,
				kind: font.kind,
				family: font.family,
				pkg: font.pkg,
				fallback: font.fallback,
			};
		}
	}
	return fonts;
}

export function docsFontsEqual(a: DocsFonts, b: DocsFonts): boolean {
	return DOCS_FONT_ROLES.every((role) => a[role]?.id === b[role]?.id && a[role]?.pkg === b[role]?.pkg);
}

export function hasDocsFonts(fonts: DocsFonts): boolean {
	return DOCS_FONT_ROLES.some((role) => fonts[role] !== undefined);
}

/** Applies the fonts as inline custom properties on `root` and loads their stylesheets once. */
export function applyDocsFonts(root: HTMLElement, fonts: DocsFonts): void {
	for (const role of DOCS_FONT_ROLES) {
		const font = fonts[role];
		if (!font) {
			root.style.removeProperty(DOCS_FONT_VARIABLES[role]);
			continue;
		}
		const linkId = `rui-docs-font-${font.id}`;
		if (!document.getElementById(linkId)) {
			const link = document.createElement('link');
			link.id = linkId;
			link.rel = 'stylesheet';
			link.href = docsFontStylesheetUrl(font);
			link.setAttribute(DOCS_HEAD_PERSIST_ATTR, '');
			document.head.append(link);
		}
		root.style.setProperty(DOCS_FONT_VARIABLES[role], docsFontStack(font));
	}
}
