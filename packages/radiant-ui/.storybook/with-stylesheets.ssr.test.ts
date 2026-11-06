import '@ecopages/radiant/server/install-ssr-runtime';
import type { Decorator } from '@ecopages/storybook-radiant-vite';
import { describe, expect, it } from 'vitest';
import { withStylesheets } from './with-stylesheets';

describe('withStylesheets on the server', () => {
	it('renders the story without touching the document head', () => {
		const decorator = withStylesheets(['/skin.css', { inline: '.skin {}' }]);

		expect(decorator(() => 'story', {} as Parameters<Decorator>[1])).toBe('story');
	});
});
