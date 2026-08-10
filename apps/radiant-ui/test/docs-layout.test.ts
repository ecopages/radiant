import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('marks the sidebar host for eco persist', () => {
	const layoutPath = resolve(__dirname, '../src/layouts/docs-layout/docs-layout.tsx');
	const source = readFileSync(layoutPath, 'utf8');

	expect(source).toContain('data-eco-persist={DOCS_SIDEBAR_ID}');
	expect(source).not.toContain('scrollActiveOnMount');
	expect(source).toContain('<RuiSidebarContent aria-label="Component navigation">');
	expect(source).not.toContain('data={{ ecoPersist: DOCS_SIDEBAR_ID }}');
});
