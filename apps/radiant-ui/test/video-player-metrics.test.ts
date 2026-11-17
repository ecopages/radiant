import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

const recipes = fileURLToPath(new URL('../src/content/components/recipes', import.meta.url));

function sourceOf(file: string): string {
	return readFileSync(`${recipes}/${file}`, 'utf8');
}

describe('video player store metrics', () => {
	test('the baseline component has ten @state fields; the store form has one store member', () => {
		const baseline = sourceOf('video-player.component.tsx');
		const store = sourceOf('video-player-store.component.tsx');

		expect(baseline.match(/@state\s+\w+/g)).toEqual([
			'@state stage',
			'@state playing',
			'@state muted',
			'@state ready',
			'@state captionsOn',
			'@state fullscreenAvailable',
			'@state rate',
			'@state status',
			'@state elapsed',
			'@state total',
		]);
		expect(store.match(/@state\s+\w+/g)).toEqual(['@state media']);
		expect(store).toContain('createStore');
		expect(store).toContain('this.$.media');
		expect(baseline).not.toContain('createStore');
	});
});
