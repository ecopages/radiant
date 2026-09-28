import { describe, expect, test } from 'vitest';
import {
	createComponentFileMatcher,
	createComponentStyleFileMatcher,
	resolveRadiantVirtualModuleId,
} from '../src/elements/shared';

describe('radiant virtual modules', () => {
	test('resolves known virtual module ids', () => {
		expect(resolveRadiantVirtualModuleId('virtual:radiant/components')).toBe('\0virtual:radiant/components');
		expect(resolveRadiantVirtualModuleId('virtual:unknown')).toBeUndefined();
	});
});

describe('component file matchers', () => {
	const root = '/project';
	const componentDirectory = 'src/components';

	test('matches configured component scripts', () => {
		const isComponentFile = createComponentFileMatcher(root, componentDirectory, ['**/*.script.tsx']);
		expect(isComponentFile('/project/src/components/card/card.script.tsx')).toBe(true);
		expect(isComponentFile('/project/src/components/card/card.css')).toBe(false);
	});

	test('matches configured component styles', () => {
		const isStyleFile = createComponentStyleFileMatcher(root, componentDirectory, '**/*.css');
		expect(isStyleFile('/project/src/components/card/card.css')).toBe(true);
		expect(isStyleFile('/project/src/components/card/card.script.tsx')).toBe(false);
	});
});
