import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const componentDirectory = dirname(fileURLToPath(import.meta.url));
const stylesDirectory = join(componentDirectory, '..', '..', 'styles');
const componentImportPattern = /import\s+(?!type\s)\{([^}]*)\}\s+from\s+'(\.\.\/[^']+)'/g;
const primitiveStylePattern = /rui-(?:control-toggle|popover|floating|icon)|<RuiIcon[A-Z]/;
const classStyleDependencies = [{ pattern: /rui-button/, component: 'button' }];

type StyleDependencyManifest = {
	components: Record<string, { direct: string[]; styles: string[] }>;
};

function renderedComponentName(bindings: string, viewSource: string): string | undefined {
	const componentNames = bindings.match(/\bRui[A-Z]\w*/g) ?? [];
	return componentNames.find((componentName) => new RegExp(`<${componentName}(?:\\s|/|>)`).test(viewSource));
}

function componentNameFromImport(importPath: string): string {
	return importPath.slice(3).split('/')[0];
}

describe('component stylesheet dependencies', () => {
	it('declares default-composition dependencies without inlining their styles', () => {
		const manifest = JSON.parse(
			readFileSync(join(stylesDirectory, 'style-dependencies.json'), 'utf8'),
		) as StyleDependencyManifest;
		const componentFolders = readdirSync(componentDirectory, { withFileTypes: true }).filter(
			(entry) => entry.isDirectory() && entry.name !== 'shared',
		);
		const componentNames = new Set(componentFolders.map((folder) => folder.name));

		for (const folder of componentFolders) {
			const viewPath = join(componentDirectory, folder.name, `${folder.name}.tsx`);
			const stylesheetPath = join(componentDirectory, folder.name, `${folder.name}.css`);
			let viewSource: string;
			let stylesheetSource: string;

			try {
				viewSource = readFileSync(viewPath, 'utf8');
				stylesheetSource = readFileSync(stylesheetPath, 'utf8');
			} catch {
				continue;
			}

			const expected = new Set<string>();
			for (const match of viewSource.matchAll(componentImportPattern)) {
				const [, bindings, importPath] = match;
				const dependency = componentNameFromImport(importPath);
				if (
					dependency !== folder.name &&
					componentNames.has(dependency) &&
					renderedComponentName(bindings, viewSource)
				) {
					expected.add(dependency);
				}
			}

			if (primitiveStylePattern.test(viewSource)) {
				expected.add('primitives');
			}
			for (const dependency of classStyleDependencies) {
				if (dependency.component !== folder.name && dependency.pattern.test(viewSource)) {
					expected.add(dependency.component);
				}
			}

			expect(manifest.components[folder.name]?.direct, `${folder.name} style dependencies`).toEqual(
				[...expected].sort(),
			);
			expect(stylesheetSource, `${folder.name} stylesheet must stay atomic`).not.toMatch(/^@import /m);
		}
	});
});
