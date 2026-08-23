import type { Plugin } from 'vite';

const STORY_MODULE_PATTERN = /\.stories\.(?:[cm]?[jt]sx?)$/;
const CUSTOM_ELEMENT_DECORATOR_PATTERN = /@\s*customElement\s*\(/;

export function isCustomElementStoryModule(file: string, source: string): boolean {
	return STORY_MODULE_PATTERN.test(file) && CUSTOM_ELEMENT_DECORATOR_PATTERN.test(source);
}

/**
 * Rebuilding `@ecopages/storybook-radiant-vite` while Storybook is running updates
 * `entry-preview.js` via HMR. Storybook's preview cannot safely hot-swap
 * `renderToCanvas` — partial HMR leaves `StoryRender` unprepared and the canvas blank.
 *
 * @remarks Custom elements are permanently registered for the lifetime of a preview
 * document. A changed story-local element class therefore cannot replace the existing
 * constructor through Vite HMR; reload the preview before Storybook remounts the story.
 */
export function radiantFrameworkHmrPlugin(): Plugin {
	return {
		name: 'ecopages:radiant-framework-hmr',
		apply: 'serve',
		async handleHotUpdate({ file, read, server }) {
			if (file.includes('storybook-radiant-vite/dist/')) {
				server.ws.send({ type: 'full-reload' });
				return [];
			}

			if (isCustomElementStoryModule(file, await read())) {
				server.ws.send({ type: 'full-reload' });
				return [];
			}
		},
	};
}
