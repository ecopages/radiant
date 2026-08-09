import type { Plugin } from 'vite';
import { appendRadiantScriptModuleStamps, transformRadiantStoryModule } from '../script-module-stamp-shared';

function isScriptModule(id: string): boolean {
	const file = id.split('?')[0] ?? id;
	return /\.script\.(?:tsx?|jsx?)$/.test(file) && !file.includes('node_modules');
}

function isStoryModule(id: string): boolean {
	const file = id.split('?')[0] ?? id;
	return /\.stories\.(?:tsx?|jsx?)$/.test(file) && !file.includes('node_modules');
}

/**
 * Stamps Radiant script modules and CSF story files with stable Vite SSR paths.
 *
 * @remarks
 * Component CSS and view-module linking are declared on `radiantMeta` in story
 * files — view modules stay free of Storybook stamps.
 */
export function radiantScriptModuleStampPlugin(): Plugin {
	let root = process.cwd();

	return {
		name: 'ecopages:radiant-script-module-stamp',
		enforce: 'post',
		configResolved(config) {
			root = config.root;
		},
		transform(code, id) {
			let next: string | null = null;

			if (isScriptModule(id)) {
				next = appendRadiantScriptModuleStamps(code, id, root);
			} else if (isStoryModule(id)) {
				next = transformRadiantStoryModule(code, id, root);
			}

			if (!next || next === code) {
				return null;
			}

			return { code: next, map: null };
		},
	};
}
