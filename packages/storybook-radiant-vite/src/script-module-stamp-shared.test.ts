import { describe, expect, test } from 'vitest';
import {
	appendMetaViewStamps,
	appendRadiantScriptModuleStamps,
	collectDeclaredCssImports,
	injectDeclaredCssImports,
	transformRadiantStoryModule,
} from './script-module-stamp-shared';

describe('collectDeclaredCssImports', () => {
	test('collects parameters.radiant.cssImports', () => {
		const code = `
const meta = {
	component: RuiChip,
	parameters: { radiant: { element: RuiChipElement, cssImports: ['./chip.css'] } },
} satisfies Meta<typeof RuiChip>;
`;
		expect(collectDeclaredCssImports(code)).toEqual(['./chip.css']);
	});

	test('collects multiple sheets and dedupes', () => {
		const code = `cssImports: ['./disclosure.css', './extra.css', './disclosure.css'],`;
		expect(collectDeclaredCssImports(code)).toEqual(['./disclosure.css', './extra.css']);
	});

	test('collects parent-relative css paths and ignores bare names', () => {
		const code = `{ cssImports: ['alert.css', '../shared.css', './ok.css'] }`;
		expect(collectDeclaredCssImports(code)).toEqual(['../shared.css', './ok.css']);
	});

	test('ignores parameters.stylesheets, which is injected at render time', () => {
		const code = `parameters: { ...withStylesheets(['./skin.css']), stylesheets: ['./other.css'] }`;
		expect(collectDeclaredCssImports(code)).toEqual([]);
	});
});

describe('injectDeclaredCssImports', () => {
	test('prepends missing imports declared on the meta', () => {
		const code = `const meta = { parameters: { radiant: { cssImports: ['./alert.css'] } } } satisfies Meta<typeof RuiAlert>;\nexport default meta;\n`;
		expect(injectDeclaredCssImports(code)).toBe(`import './alert.css';\n${code}`);
	});

	test('skips sheets that are already imported', () => {
		const code = `import './alert.css';\nconst meta = { parameters: { radiant: { cssImports: ['./alert.css'] } } };\n`;
		expect(injectDeclaredCssImports(code)).toBe(code);
	});

	test('returns unchanged code when nothing is declared', () => {
		const code = `export const plain = 1;\n`;
		expect(injectDeclaredCssImports(code)).toBe(code);
	});
});

describe('appendMetaViewStamps', () => {
	test('stamps the meta component with a view module path', () => {
		const code = `import type { Meta } from '@ecopages/storybook-radiant-vite';
import { RuiChip } from './chip';
const meta = {
	title: 'Chip',
	component: RuiChip,
	parameters: { radiant: { cssImports: ['./chip.css'] } },
} satisfies Meta<typeof RuiChip>;
export default meta;
`;
		const result = appendMetaViewStamps(
			code,
			'/abs/packages/radiant-ui/src/components/ui/chip/chip.stories.tsx',
			'/abs',
		);
		expect(result).toContain(`RuiChip[Symbol.for('@ecopages/storybook-radiant.viewModule')]`);
		expect(result).toContain(`/packages/radiant-ui/src/components/ui/chip/chip.tsx`);
	});

	test('finds the component through a nested parameters object', () => {
		const code = `import { RuiChip } from './chip';
const meta = {
	parameters: { layout: 'centered', radiant: { element: RuiChipElement } },
	component: RuiChip,
} satisfies Meta<typeof RuiChip>;
export default meta;
`;
		expect(
			appendMetaViewStamps(code, '/abs/packages/radiant-ui/src/components/ui/chip/chip.stories.tsx', '/abs'),
		).toContain(`RuiChip[Symbol.for('@ecopages/storybook-radiant.viewModule')]`);
	});

	test('returns null when already stamped', () => {
		const code = `import { RuiChip } from './chip';
const meta = { component: RuiChip } satisfies Meta<typeof RuiChip>;
export default meta;
RuiChip[Symbol.for('@ecopages/storybook-radiant.viewModule')] = '/packages/radiant-ui/src/components/ui/chip/chip.tsx';
`;
		expect(
			appendMetaViewStamps(code, '/abs/packages/radiant-ui/src/components/ui/chip/chip.stories.tsx', '/abs'),
		).toBeNull();
	});
});

describe('transformRadiantStoryModule', () => {
	test('injects css imports, view stamp, and story module stamp', () => {
		const code = `import type { Meta } from '@ecopages/storybook-radiant-vite';
import { RuiChip } from './chip';
const meta = {
	title: 'Chip',
	component: RuiChip,
	parameters: { radiant: { cssImports: ['./chip.css'] } },
} satisfies Meta<typeof RuiChip>;
export default meta;
`;
		const result = transformRadiantStoryModule(
			code,
			'/abs/packages/radiant-ui/src/components/ui/chip/chip.stories.tsx',
			'/abs',
		);
		expect(result).toContain(`import './chip.css';`);
		expect(result).toContain(`RuiChip[Symbol.for('@ecopages/storybook-radiant.viewModule')]`);
		expect(result).toContain(`storyModule: '/packages/radiant-ui/src/components/ui/chip/chip.stories.tsx'`);
	});

	test('is idempotent when storyModule stamp already present', () => {
		const code = `import './chip.css';
import { RuiChip } from './chip';
const meta = {
	component: RuiChip,
	parameters: { radiant: { cssImports: ['./chip.css'] } },
} satisfies Meta<typeof RuiChip>;
export default meta;
RuiChip[Symbol.for('@ecopages/storybook-radiant.viewModule')] = '/packages/radiant-ui/src/components/ui/chip/chip.tsx';
if (!meta.parameters) meta.parameters = {};
meta.parameters.radiant = { ...(meta.parameters.radiant ?? {}), storyModule: '/packages/radiant-ui/src/components/ui/chip/chip.stories.tsx' };
`;
		expect(
			transformRadiantStoryModule(
				code,
				'/abs/packages/radiant-ui/src/components/ui/chip/chip.stories.tsx',
				'/abs',
			),
		).toBeNull();
	});

	test('stamps a plain meta with no satisfies clause', () => {
		const code = `const meta = { title: 'X', component: Foo };
export default meta;
`;
		const result = transformRadiantStoryModule(code, '/abs/src/foo.stories.tsx', '/abs');
		expect(result).toContain(`storyModule: '/src/foo.stories.tsx'`);
	});

	test('ignores modules that do not default-export meta', () => {
		const code = `const meta = { component: Foo } satisfies Meta<typeof Foo>;\nexport { meta };\n`;
		expect(transformRadiantStoryModule(code, '/abs/src/foo.stories.tsx', '/abs')).toBeNull();
	});
});

describe('appendRadiantScriptModuleStamps', () => {
	test('stamps custom element exports', () => {
		const code = `export class RuiAlert extends HTMLElement {}\n`;
		const result = appendRadiantScriptModuleStamps(
			code,
			'/abs/packages/radiant-ui/src/components/ui/alert/alert.script.tsx',
			'/abs',
		);
		expect(result).toContain(`RuiAlert[Symbol.for('@ecopages/storybook-radiant.scriptModule')]`);
		expect(result).toContain(`/packages/radiant-ui/src/components/ui/alert/alert.script.tsx`);
	});

	test('is idempotent when already stamped outside /src/', () => {
		const code = `export class RuiAlert extends HTMLElement {}
RuiAlert[Symbol.for('@ecopages/storybook-radiant.scriptModule')] = '/packages/radiant-ui/src/components/ui/alert/alert.script.tsx';
RuiAlert[Symbol.for('@ecopages/storybook-radiant.scriptExport')] = 'RuiAlert';
`;
		expect(
			appendRadiantScriptModuleStamps(
				code,
				'/abs/packages/radiant-ui/src/components/ui/alert/alert.script.tsx',
				'/abs',
			),
		).toBeNull();
	});
});
