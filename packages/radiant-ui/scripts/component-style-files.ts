import { readdirSync } from 'node:fs';
import path from 'node:path';

/** Optional skins such as `sidebar.docs.css` — not bundled in `styles.css`. */
export function isOptionalComponentSkin(componentName: string, filename: string): boolean {
	return filename !== `${componentName}.css` && filename.startsWith(`${componentName}.`) && filename.endsWith('.css');
}

export function listComponentCssFiles(componentDir: string): string[] {
	return readdirSync(componentDir)
		.filter((entry) => entry.endsWith('.css'))
		.sort((left, right) => {
			const primary = path.basename(componentDir);
			if (left === `${primary}.css`) return -1;
			if (right === `${primary}.css`) return 1;
			return left.localeCompare(right);
		});
}

export function componentCssDistPath(componentName: string, filename: string): string {
	return `./dist/components/ui/${componentName}/${filename}`;
}

/** Package export key for a component stylesheet. */
export function componentCssExportKey(componentName: string, filename: string): string {
	if (filename === `${componentName}.css`) {
		return `./${componentName}/styles.css`;
	}

	if (isOptionalComponentSkin(componentName, filename)) {
		const variant = filename.slice(componentName.length + 1, -'.css'.length);
		return `./${componentName}/${variant}.css`;
	}

	return `./${componentName}/${filename}`;
}
