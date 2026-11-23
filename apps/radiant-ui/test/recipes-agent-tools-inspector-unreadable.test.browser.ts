import { afterEach, describe, expect, test } from 'vitest';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { until } from './until';

afterEach(() => {
	document.body.innerHTML = '';
	syncExamples();
});

describe('agent tools inspector on a native modelContext without a testing surface', () => {
	test('says the tools cannot be read back instead of showing an empty list', async () => {
		Object.defineProperty(document, 'modelContext', {
			configurable: true,
			value: { registerTool: () => Promise.resolve(undefined) },
		});
		await import('../src/content/components/recipes/agent-tools.inspector');
		document.body.innerHTML =
			'<tool-inspector><ul aria-label="Registered tools"></ul><textarea></textarea><p data-result></p></tool-inspector>';

		await until(() =>
			expect(document.querySelector('tool-inspector li')!.textContent).toContain(
				'does not let a page read its tools back',
			),
		);
		expect(document.querySelector('tool-inspector button')).toBeNull();
	});
});
