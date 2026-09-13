import { afterEach, describe, expect, it } from 'vitest';
import { createRoot } from '@ecopages/jsx';
import { ContextSubscriptionRequestEvent } from '@ecopages/radiant/context';
import { RuiForm } from './form';
import { RuiForm as RuiFormElement } from './form.script';
import { formContext, type FormContextValue } from './form-context';
import { RuiField } from '../field';
import { RuiInput } from '../input';
import '../field/field.script';
import './form.script';

async function flushRender(): Promise<void> {
	await new Promise<void>((resolve) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => resolve());
		});
	});
}

function readContext(host: HTMLElement): FormContextValue | undefined {
	let value: FormContextValue | undefined;
	host.dispatchEvent(
		new ContextSubscriptionRequestEvent(formContext, (context) => {
			value = context;
		}),
	);
	return value;
}

const cleanup: Array<() => void> = [];

afterEach(() => {
	for (const dispose of cleanup.splice(0)) {
		dispose();
	}
});

async function mount(defaultValue: string) {
	const host = document.createElement('div');
	document.body.append(host);
	const root = createRoot(host);
	root.render(
		<RuiForm defaultValues={{ title: defaultValue }}>
			<RuiField name="title">
				<RuiInput name="title" />
			</RuiField>
			<output data-ref="consumer" />
		</RuiForm>,
	);
	cleanup.push(() => {
		root.unmount();
		host.remove();
	});
	await customElements.whenDefined('rui-form');
	await customElements.whenDefined('rui-field');
	await flushRender();
	const form = host.querySelector('rui-form');
	const consumer = host.querySelector<HTMLElement>('[data-ref="consumer"]');
	const input = host.querySelector('input');
	if (!(form instanceof RuiFormElement) || !consumer || !input) {
		throw new Error('Expected mounted form');
	}
	return { form, consumer, input, host };
}

describe('public form store context', () => {
	it('exposes the live store through context and updates registered controls and presentation', async () => {
		const { consumer, input } = await mount('Initial');
		const context = readContext(consumer);
		const store = context?.store;
		expect(context?.ready).toBe(true);
		if (!store) {
			throw new Error('Expected context store');
		}
		store.setValue('title', 'Changed');
		expect(input.value).toBe('Changed');
		expect(readContext(consumer)?.store).toBe(store);
		expect(readContext(consumer)?.revision).toBeGreaterThan(context.revision);
	});

	it('resolves the nearest provider and respects subscription cleanup', async () => {
		const host = document.createElement('div');
		document.body.append(host);
		const root = createRoot(host);
		root.render(
			<RuiForm defaultValues={{ title: 'First' }}>
				<RuiField name="title">
					<RuiInput name="title" />
				</RuiField>
				<output data-ref="outer-consumer" />
				<RuiForm defaultValues={{ title: 'Second' }}>
					<RuiField name="title">
						<RuiInput name="title" />
					</RuiField>
					<output data-ref="inner-consumer" />
				</RuiForm>
			</RuiForm>,
		);
		cleanup.push(() => {
			root.unmount();
			host.remove();
		});
		await customElements.whenDefined('rui-form');
		await customElements.whenDefined('rui-field');
		await flushRender();

		const outerConsumer = host.querySelector<HTMLElement>('[data-ref="outer-consumer"]');
		const innerConsumer = host.querySelector<HTMLElement>('[data-ref="inner-consumer"]');
		if (!outerConsumer || !innerConsumer) {
			throw new Error('Expected nested form consumers');
		}

		const values: string[] = [];
		let unsubscribe = () => {};
		innerConsumer.dispatchEvent(
			new ContextSubscriptionRequestEvent(
				formContext,
				(context) => {
					values.push(String(context.store?.getValues().title));
				},
				undefined,
				true,
				(stop) => {
					unsubscribe = stop;
				},
			),
		);
		readContext(outerConsumer)?.store?.setValue('title', 'Unrelated');
		expect(values).toEqual(['Second']);
		readContext(innerConsumer)?.store?.setValue('title', 'Related');
		expect(values).toEqual(['Second', 'Related']);
		unsubscribe();
		readContext(innerConsumer)?.store?.setValue('title', 'After cleanup');
		expect(values).toEqual(['Second', 'Related']);
	});

	it('keeps the store out of hydration payloads', async () => {
		const { form } = await mount('private-test-value');
		const markup = form.formProvider.renderHydrationScriptTag();
		expect(markup).toContain('"ready":false');
		expect(markup).not.toContain('"store"');
		expect(markup).not.toContain('"actions"');
		expect(markup).not.toContain('private-test-value');
	});

	it('continues publishing store changes after the same form reconnects', async () => {
		const { form, consumer, host, input } = await mount('Initial');
		const store = readContext(consumer)?.store;
		if (!store) {
			throw new Error('Expected context store');
		}
		form.remove();
		host.append(form);
		await flushRender();
		const revision = readContext(consumer)?.revision ?? 0;
		store.setValue('title', 'Reconnected');
		expect(input.value).toBe('Reconnected');
		expect(readContext(consumer)?.store).toBe(store);
		expect(readContext(consumer)?.revision).toBeGreaterThan(revision);
	});
});
