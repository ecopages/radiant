import type { Plugin } from 'vite';
import {
	appendRadiantScriptModuleStamps,
	appendRadiantStoryModuleStamp,
	appendRadiantViewModuleStamps,
} from '../script-module-stamp-shared';

function isScriptModule(id: string): boolean {
	const file = id.split('?')[0] ?? id;
	return /\.script\.(?:tsx?|jsx?)$/.test(file) && !file.includes('node_modules');
}

function isViewModule(id: string): boolean {
	const file = id.split('?')[0] ?? id;
	return (
		/\.(?:tsx|jsx)$/.test(file) &&
		!/\.script\.(?:tsx|jsx)$/.test(file) &&
		!/\.stories\.(?:tsx|jsx)$/.test(file) &&
		!file.includes('node_modules')
	);
}

function isStoryModule(id: string): boolean {
	const file = id.split('?')[0] ?? id;
	return /\.stories\.(?:tsx?|jsx?)$/.test(file) && !file.includes('node_modules');
}

/**
 * Stamps Radiant script modules, view modules, and CSF story files with stable `/src/...` paths.
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
				next = appendRadiantStoryModuleStamp(code, id, root);
			} else if (isViewModule(id) && code.includes('defineRadiantView(')) {
				next = appendRadiantViewModuleStamps(code, id, root);
			}

			if (!next || next === code) {
				return null;
			}

			return { code: next, map: null };
		},
	};
}
