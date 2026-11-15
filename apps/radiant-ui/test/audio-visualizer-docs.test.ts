import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('the audio visualizer docs', () => {
	test('show the dots preset that the live example runs, character for character', () => {
		const source = read('../src/content/components/controllers/audio-visualizer-dots.ts').trim();
		const page = read('../src/content/components/controllers/audio-visualizer.mdx');

		expect(page).toContain(source);
	});
});
