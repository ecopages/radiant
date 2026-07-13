import path, { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineContentSource, isContentSourceConfigured } from '@/content-source';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = moduleDir.includes(`${path.sep}.eco${path.sep}`)
	? path.resolve(moduleDir, '../..')
	: path.resolve(moduleDir, '..');

/**
 * Idempotently configures the docs content source. Calling this from any module
 * that reads content guarantees `defineContentSource` runs even when bundlers
 * would otherwise tree-shake the side-effect-only import.
 */
export function ensureContentSource(): void {
	if (isContentSourceConfigured()) return;

	defineContentSource({
		rootDir: '/docs',
		contentRoot: join(appRoot, 'src/content/docs'),
		groupOrder: ['Getting Started', 'Components', 'Decorators', 'JSX', 'Signals', 'Context', 'Helpers', 'Examples'],
		orderBy: 'order',
	});
}

ensureContentSource();
