import type { Plugin } from 'vite';

/**
 * Rebuilding `@ecopages/storybook-radiant-vite` while Storybook is running updates
 * `entry-preview.js` via HMR. Storybook's preview cannot safely hot-swap
 * `renderToCanvas` — partial HMR leaves `StoryRender` unprepared and the canvas blank.
 *
 * Force a full reload when framework dist output changes during dev.
 */
export function radiantFrameworkHmrPlugin(): Plugin {
	return {
		name: 'ecopages:radiant-framework-hmr',
		apply: 'serve',
		handleHotUpdate({ file, server }) {
			if (file.includes('storybook-radiant-vite/dist/')) {
				server.ws.send({ type: 'full-reload' });
				return [];
			}
		},
	};
}
