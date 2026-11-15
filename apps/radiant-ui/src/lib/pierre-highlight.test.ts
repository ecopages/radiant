import { describe, expect, test } from 'vitest';
import { highlightToHtml, resolveLanguage } from './pierre-highlight';

describe('resolveLanguage', () => {
	test('keeps the languages and aliases the docs use and falls back to text', () => {
		for (const name of ['ts', 'TypeScript', 'tsx', 'css', 'html', 'bash', 'sh', 'json', 'mdx']) {
			expect(resolveLanguage(name)).toBe(name);
		}
		expect(resolveLanguage('nope')).toBe('text');
		expect(resolveLanguage('')).toBe('text');
		expect(resolveLanguage(undefined)).toBe('text');
	});

	test('highlights every language the docs fence', () => {
		for (const name of ['ts', 'tsx', 'css', 'html', 'bash', 'sh']) {
			expect(() => highlightToHtml('x', name)).not.toThrow();
		}
	});
});

describe('highlightToHtml', () => {
	test('wraps each line in a .line span and escapes html characters', () => {
		const html = highlightToHtml('<a href="x">&</a>\nsecond', 'html');

		expect(html.match(/class="line"/g)).toHaveLength(2);
		expect(html).toContain('&lt;');
		expect(html).toContain('&amp;');
		expect(html).not.toContain('<a href');
		expect(html).toMatch(/^<pre style="[^"]*--shiki-light-bg:/);
	});

	test('draws no line for the final newline', () => {
		expect(highlightToHtml('a\nb\n', 'ts').match(/class="line"/g)).toHaveLength(2);
		expect(highlightToHtml('a\n', 'ts').match(/class="line"/g)).toHaveLength(1);
		expect(highlightToHtml('a\n\n', 'ts').match(/class="line"/g)).toHaveLength(2);
	});
});
