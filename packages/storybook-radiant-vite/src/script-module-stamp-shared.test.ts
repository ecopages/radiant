import { describe, expect, test } from 'vitest';
import {
	appendRadiantMetaViewStamps,
	appendRadiantScriptModuleStamps,
	collectDeclaredStylesheetImports,
	injectDeclaredStylesheetImports,
	transformRadiantStoryModule,
} from './script-module-stamp-shared';

describe('collectDeclaredStylesheetImports', () => {
	test('collects radiantMeta stylesheets option', () => {
		const code = `
const meta = { component: RuiChip };
radiantMeta(meta, { stylesheets: ['./chip.css'] });
`;
		expect(collectDeclaredStylesheetImports(code)).toEqual(['./chip.css']);
	});

	test('collects multiple sheets and dedupes', () => {
		const code = `
radiantMeta(meta, { stylesheets: ['./disclosure.css', './extra.css', './disclosure.css'] });
`;
		expect(collectDeclaredStylesheetImports(code)).toEqual(['./disclosure.css', './extra.css']);
	});

	test('collects parent-relative css paths and ignores bare names', () => {
		const code = `{ stylesheets: ['alert.css', '../shared.css', './ok.css'] }`;
		expect(collectDeclaredStylesheetImports(code)).toEqual(['../shared.css', './ok.css']);
	});
});

describe('injectDeclaredStylesheetImports', () => {
	test('prepends missing imports from radiantMeta', () => {
		const code = `const meta = { title: 'Alert' };\nradiantMeta(meta, { stylesheets: ['./alert.css'] });\nexport default meta;\n`;
		expect(injectDeclaredStylesheetImports(code)).toBe(
			`import './alert.css';\nconst meta = { title: 'Alert' };\nradiantMeta(meta, { stylesheets: ['./alert.css'] });\nexport default meta;\n`,
		);
	});

	test('skips sheets that are already imported', () => {
		const code = `import './alert.css';\nconst meta = {};\nradiantMeta(meta, { stylesheets: ['./alert.css'] });\n`;
		expect(injectDeclaredStylesheetImports(code)).toBe(code);
	});

	test('returns unchanged code when nothing is declared', () => {
		const code = `export const plain = 1;\n`;
		expect(injectDeclaredStylesheetImports(code)).toBe(code);
	});
});

describe('appendRadiantMetaViewStamps', () => {
	test('stamps radiantMeta component with view module path', () => {
		const code = `import { radiantMeta } from '@ecopages/storybook-radiant-vite';
import { RuiChip } from './chip';
const meta = { title: 'Chip', component: RuiChip };
radiantMeta(meta, { stylesheets: ['./chip.css'] });
export default meta;
`;
		const result = appendRadiantMetaViewStamps(
			code,
			'/abs/packages/radiant-ui/src/components/ui/chip/chip.stories.tsx',
			'/abs',
		);
		expect(result).toContain(`RuiChip[Symbol.for('@ecopages/storybook-radiant.viewModule')]`);
		expect(result).toContain(`/packages/radiant-ui/src/components/ui/chip/chip.tsx`);
	});

	test('returns null when already stamped', () => {
		const code = `import { RuiChip } from './chip';
const meta = { component: RuiChip };
radiantMeta(meta);
export default meta;
RuiChip[Symbol.for('@ecopages/storybook-radiant.viewModule')] = '/packages/radiant-ui/src/components/ui/chip/chip.tsx';
`;
		expect(
			appendRadiantMetaViewStamps(
				code,
				'/abs/packages/radiant-ui/src/components/ui/chip/chip.stories.tsx',
				'/abs',
			),
		).toBeNull();
	});
});

describe('transformRadiantStoryModule', () => {
	test('injects css imports, view stamp, and story module stamp for radiantMeta', () => {
		const code = `import { radiantMeta } from '@ecopages/storybook-radiant-vite';
import { RuiChip } from './chip';
const meta = { title: 'Chip', component: RuiChip };
radiantMeta(meta, { stylesheets: ['./chip.css'] });
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
const meta = { component: RuiChip };
radiantMeta(meta, { stylesheets: ['./chip.css'] });
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

	test('stamps legacy meta without radiantMeta', () => {
		const code = `const meta = { title: 'X', component: Foo };
export default meta;
`;
		const result = transformRadiantStoryModule(code, '/abs/src/foo.stories.tsx', '/abs');
		expect(result).toContain(`storyModule: '/src/foo.stories.tsx'`);
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
