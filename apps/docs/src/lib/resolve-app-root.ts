import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolves the docs app root from a module URL. Works for modules under
 * `src/` or `src/lib/`, and when ecopages bundles modules under `.eco/`.
 */
export function resolveAppRoot(moduleUrl: string): string {
	const moduleDir = path.dirname(fileURLToPath(moduleUrl));

	if (moduleDir.includes(`${path.sep}.eco${path.sep}`)) {
		return path.resolve(moduleDir, '../..');
	}

	const parentDir = path.dirname(moduleDir);
	if (path.basename(parentDir) === 'src') {
		return path.resolve(moduleDir, '../..');
	}

	return path.resolve(moduleDir, '..');
}
