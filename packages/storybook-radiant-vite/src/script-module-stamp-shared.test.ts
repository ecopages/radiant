import { describe, expect, test } from 'vitest';
import {
	appendRadiantViewModuleStamps,
	collectDeclaredStylesheetImports,
	injectDeclaredStylesheetImports,
} from './script-module-stamp-shared';

describe('collectDeclaredStylesheetImports', () => {
	test('collects defineRadiantView stylesheets option', () => {
		const code = `
export const RuiAlert = defineRadiantView(
	RuiAlertElement,
	(props) => <rui-alert>{props.children}</rui-alert>,
	{ stylesheets: ['./alert.css'] },
);
`;
		expect(collectDeclaredStylesheetImports(code)).toEqual(['./alert.css']);
	});

	test('collects attachRadiantStylesheets paths', () => {
		const code = `
export function RuiInput() { return null; }
attachRadiantStylesheets(RuiInput, ['./input.css'], import.meta.url);
`;
		expect(collectDeclaredStylesheetImports(code)).toEqual(['./input.css']);
	});

	test('collects multiple sheets and dedupes', () => {
		const code = `
export const RuiDisclosure = defineRadiantView(El, render, {
	stylesheets: ['./disclosure.css', './extra.css'],
});
export const RuiDisclosureGroup = defineRadiantView(GroupEl, renderGroup, {
	stylesheets: ['./disclosure.css'],
});
`;
		expect(collectDeclaredStylesheetImports(code)).toEqual(['./disclosure.css', './extra.css']);
	});

	test('collects parent-relative css paths and ignores bare names', () => {
		const code = `{ stylesheets: ['alert.css', '../shared.css', './ok.css'] }`;
		expect(collectDeclaredStylesheetImports(code)).toEqual(['../shared.css', './ok.css']);
	});

	test('collects attachRadiantStylesheets with non-identifier first args', () => {
		const code = `attachRadiantStylesheets(exports.RuiInput, ['./input.css'], import.meta.url);`;
		expect(collectDeclaredStylesheetImports(code)).toEqual(['./input.css']);
	});
});

describe('injectDeclaredStylesheetImports', () => {
	test('prepends missing imports', () => {
		const code = `export const RuiAlert = defineRadiantView(El, render, { stylesheets: ['./alert.css'] });\n`;
		expect(injectDeclaredStylesheetImports(code)).toBe(
			`import './alert.css';\nexport const RuiAlert = defineRadiantView(El, render, { stylesheets: ['./alert.css'] });\n`,
		);
	});

	test('skips sheets that are already imported', () => {
		const code = `import './alert.css';\nexport const RuiAlert = defineRadiantView(El, render, { stylesheets: ['./alert.css'] });\n`;
		expect(injectDeclaredStylesheetImports(code)).toBe(code);
	});

	test('returns unchanged code when nothing is declared', () => {
		const code = `export const plain = 1;\n`;
		expect(injectDeclaredStylesheetImports(code)).toBe(code);
	});
});

describe('appendRadiantViewModuleStamps', () => {
	test('injects imports and stamps defineRadiantView exports', () => {
		const code = `export const RuiAlert = defineRadiantView(El, render, { stylesheets: ['./alert.css'] });\n`;
		const result = appendRadiantViewModuleStamps(code, '/abs/src/components/ui/alert/alert.tsx', '/abs');
		expect(result).toContain(`import './alert.css';`);
		expect(result).toContain(`RuiAlert[Symbol.for('@ecopages/storybook-radiant.viewModule')]`);
		expect(result).toContain(`/src/components/ui/alert/alert.tsx`);
	});

	test('returns null when already stamped and imports present', () => {
		const code = `import './alert.css';
export const RuiAlert = defineRadiantView(El, render, { stylesheets: ['./alert.css'] });
RuiAlert[Symbol.for('@ecopages/storybook-radiant.viewModule')] = '/src/components/ui/alert/alert.tsx';
`;
		expect(appendRadiantViewModuleStamps(code, '/abs/src/components/ui/alert/alert.tsx', '/abs')).toBeNull();
	});
});
