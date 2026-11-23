import { afterEach, describe, expect, test } from 'vitest';
import { installStandIn } from '../src/content/components/recipes/agent-tools.stand-in';
import { syncExamples } from '../src/components/primitive-example/mount-example';
import { mountForm, trackListeners, type Form } from './mount-recipe';
import { until } from './until';

/**
 * The stand-in is undefined where the browser has its own `document.modelContext`, which these tests cannot
 * inspect, so the suite is skipped there and `standIn` is read only inside it.
 */
const installed = installStandIn();

afterEach(() => {
	document.body.innerHTML = '';
	syncExamples();
});

describe('recipes', () => {
	describe.skipIf(!installed).each<Form>(['plain', 'radiant'])('agent tools, %s form', (form) => {
		const standIn = installed!;

		test('registers the tool while the example is on the page and removes it with it', async () => {
			const root = await mountForm('agent-tools', form);
			await until(() => expect([...standIn.tools.keys()]).toEqual(['add_to_cart']));

			root.remove();
			syncExamples();
			await until(() => expect([...standIn.tools.keys()]).toEqual([]));
		});

		test('the form and the agent add to the same cart', async () => {
			const root = await mountForm('agent-tools', form);
			await until(() => expect(standIn.tools.has('add_to_cart')).toBe(true));

			root.querySelector('form')!.requestSubmit();
			const result = await standIn.tools
				.get('add_to_cart')!
				.execute({ sku: 'pear' }, { signal: new AbortController().signal });

			expect(result).toEqual({ count: 2 });
			expect([...root.querySelectorAll('li')].map((item) => item.textContent)).toEqual(['apple', 'pear']);
			expect(root.querySelector('[data-status]')!.textContent).toBe('2 in cart');
		});

		test('rejects an input that fails the schema', async () => {
			await mountForm('agent-tools', form);
			await until(() => expect(standIn.tools.has('add_to_cart')).toBe(true));

			await expect(
				standIn.tools.get('add_to_cart')!.execute({ sku: '' }, { signal: new AbortController().signal }),
			).rejects.toThrow();
		});

		test('leaves nothing on the document or window once the example leaves the page, and a fresh copy works', async () => {
			(await mountForm('agent-tools', form)).remove();
			syncExamples();
			await until(() => expect(standIn.tools.size).toBe(0));
			const tracker = trackListeners();
			try {
				const baseline = tracker.live(document, window);
				const root = await mountForm('agent-tools', form);
				const submitForm = root.querySelector('form')!;
				await until(() => expect(standIn.tools.has('add_to_cart')).toBe(true));

				root.remove();
				syncExamples();
				await until(() => expect(standIn.tools.size).toBe(0));
				expect(tracker.live(document, window)).toEqual(baseline);
				expect(tracker.live(root, submitForm)).toEqual([]);

				const fresh = await mountForm('agent-tools', form);
				await until(() => expect(standIn.tools.has('add_to_cart')).toBe(true));
				fresh.querySelector('form')!.requestSubmit();
				const result = await standIn.tools
					.get('add_to_cart')!
					.execute({ sku: 'pear' }, { signal: new AbortController().signal });

				expect(result).toEqual({ count: 2 });
				expect([...fresh.querySelectorAll('li')].map((item) => item.textContent)).toEqual(['apple', 'pear']);
			} finally {
				tracker.stop();
			}
		});
	});
});
