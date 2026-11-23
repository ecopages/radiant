import { afterEach, describe, test } from 'vitest';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { expectInspectorCallsTheCart } from './agent-tools-inspector-flow';

afterEach(() => {
	document.body.innerHTML = '';
	syncExamples();
});

describe('agent tools inspector on the stand-in', () => {
	test('lists the registered tool and calling it changes the cart', async () => {
		await import('../src/content/components/recipes/agent-tools.inspector');

		await expectInspectorCallsTheCart();
	});
});
