import { expect, test } from 'vitest';
import { getDocsLlmUrlFromPathname } from '@/lib/docs/docs-llm-url';

test('getDocsLlmUrlFromPathname maps docs paths to text exports', () => {
	expect(getDocsLlmUrlFromPathname('/docs/getting-started/introduction')).toBe(
		'/llms-content/getting-started/introduction.txt',
	);
	expect(getDocsLlmUrlFromPathname('/docs/getting-started/introduction/')).toBe(
		'/llms-content/getting-started/introduction.txt',
	);
	expect(getDocsLlmUrlFromPathname('/docs/button')).toBe('/llms-content/button.txt');
});

test('getDocsLlmUrlFromPathname returns null for non-docs paths', () => {
	expect(getDocsLlmUrlFromPathname('/')).toBeNull();
	expect(getDocsLlmUrlFromPathname('/llms.txt')).toBeNull();
	expect(getDocsLlmUrlFromPathname('/docs')).toBeNull();
});
