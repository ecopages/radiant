import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('theme lab stories', () => {
	it('lists the Default story of every story module', () => {
		const dir = fileURLToPath(new URL('../../content/stories', import.meta.url));
		const modules = readdirSync(dir)
			.filter((file) => file.endsWith('.tsx') && !file.endsWith('.script.tsx'))
			.map((file) => file.replace(/\.tsx$/, ''))
			.sort();
		const source = readFileSync(fileURLToPath(new URL('./theme-lab-stories.ts', import.meta.url)), 'utf8');
		const listed = [...source.matchAll(/slug: '([^']+)'/g)].map((match) => match[1]).sort();

		expect(listed).toEqual(modules);
	});
});
