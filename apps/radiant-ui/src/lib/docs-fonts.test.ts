import { describe, expect, it } from 'vitest';
import { docsFontFromRow, docsFontsEqual, docsFontStack, docsFontStylesheetUrl, parseDocsFonts } from './docs-fonts';

const inter = docsFontFromRow(['inter', 'Inter', 'sans-serif', 1]);
const lilex = docsFontFromRow(['lilex', 'Lilex', 'monospace', 0]);

describe('parseDocsFonts', () => {
	it('round-trips well-formed fonts', () => {
		expect(parseDocsFonts({ sans: inter, mono: lilex })).toEqual({ sans: inter, mono: lilex });
	});

	it('lets body and headings use a monospace font but keeps proportional fonts out of the code role', () => {
		expect(parseDocsFonts({ sans: lilex, heading: lilex })).toEqual({ sans: lilex, heading: lilex });
		expect(parseDocsFonts({ mono: inter })).toEqual({});
	});

	it('rejects values that could break out of a stack or a stylesheet URL', () => {
		const hostile = (patch: Record<string, string>) => parseDocsFonts({ sans: { ...inter, ...patch } });
		expect(hostile({ family: "x'; } body { display: none" })).toEqual({});
		expect(hostile({ pkg: '@fontsource/../evil' })).toEqual({});
		expect(hostile({ pkg: 'evil/pkg' })).toEqual({});
		expect(hostile({ fallback: 'sans-serif; color: red' })).toEqual({});
		expect(hostile({ id: 'A B' })).toEqual({});
	});

	it('reads anything that is not an object as empty', () => {
		for (const value of [null, undefined, 'x', 4, []]) expect(parseDocsFonts(value)).toEqual({});
	});
});

describe('docs font helpers', () => {
	it('builds the stack and the preview stylesheet URL', () => {
		expect(docsFontStack(inter)).toBe("'Inter Variable', ui-sans-serif, system-ui, sans-serif");
		expect(docsFontStylesheetUrl(lilex)).toBe('https://cdn.jsdelivr.net/npm/@fontsource/lilex@5/index.css');
	});

	it('compares fonts by id and package per role', () => {
		expect(docsFontsEqual({ sans: inter }, { sans: { ...inter } })).toBe(true);
		expect(docsFontsEqual({ sans: inter }, {})).toBe(false);
		expect(docsFontsEqual({ sans: inter }, { heading: inter })).toBe(false);
	});
});
