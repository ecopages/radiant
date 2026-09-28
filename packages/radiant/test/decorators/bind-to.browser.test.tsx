import { waitFor } from '@testing-library/dom';
import { afterEach, describe, expect, expectTypeOf, test } from 'vitest';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { bindTo } from '../../src/decorators/bind-to';
import { customElement } from '../../src/decorators/custom-element';
import { onEvent } from '../../src/decorators/on-event';
import { prop } from '../../src/decorators/prop';
import { state } from '../../src/decorators/state';

afterEach(() => {
	document.body.innerHTML = '';
});

async function connected<T extends HTMLElement>(element: T): Promise<T> {
	document.body.appendChild(element);
	await Promise.resolve();
	return element;
}

describe('@bindTo', () => {
	test('paints an inverted boolean attribute on the host from @prop', async () => {
		@customElement('bind-to-host-hidden')
		class BindToHostHidden extends RadiantElement {
			@prop({ type: Boolean, reflect: true, defaultValue: false })
			@bindTo({ bool: 'hidden', invert: true })
			open = false;
		}

		const element = await connected(document.createElement('bind-to-host-hidden') as BindToHostHidden);

		expect(element.hasAttribute('hidden')).toBe(true);

		element.open = true;
		expect(element.hasAttribute('hidden')).toBe(false);

		element.open = false;
		expect(element.hasAttribute('hidden')).toBe(true);
	});

	test('fans one field out to a host attribute and a child attribute', async () => {
		@customElement('bind-to-array-targets')
		class BindToArrayTargets extends RadiantElement {
			@prop({ type: Boolean, defaultValue: false })
			@bindTo([
				{ bool: 'hidden', invert: true },
				{ ref: 'trigger', attr: 'aria-expanded' },
			])
			open = false;
		}

		const element = document.createElement('bind-to-array-targets') as BindToArrayTargets;
		const trigger = document.createElement('button');
		trigger.setAttribute('data-ref', 'trigger');
		element.append(trigger);

		await connected(element);

		expect(element.hasAttribute('hidden')).toBe(true);
		expect(trigger.getAttribute('aria-expanded')).toBe('false');

		element.open = true;
		expect(element.hasAttribute('hidden')).toBe(false);
		expect(trigger.getAttribute('aria-expanded')).toBe('true');
	});

	test('writes mapped text onto a selector target', async () => {
		@customElement('bind-to-mapped-text')
		class BindToMappedText extends RadiantElement {
			@state
			@bindTo({
				selector: '[data-panel]',
				attr: 'data-state',
				map: (open) => {
					expectTypeOf(open).toEqualTypeOf<boolean>();
					return open ? 'open' : 'closed';
				},
			})
			open = false;
		}

		const element = document.createElement('bind-to-mapped-text') as BindToMappedText;
		const panel = document.createElement('div');
		panel.setAttribute('data-panel', '');
		element.append(panel);

		await connected(element);

		expect(panel.getAttribute('data-state')).toBe('closed');

		element.open = true;
		expect(panel.getAttribute('data-state')).toBe('open');
	});

	test('skips a missing child and paints after reconnect once the node exists', async () => {
		@customElement('bind-to-missing-ref')
		class BindToMissingRef extends RadiantElement {
			@prop({ type: String, defaultValue: 'idle' })
			@bindTo({ ref: 'label', text: true })
			label = 'idle';
		}

		const element = document.createElement('bind-to-missing-ref') as BindToMissingRef;

		await connected(element);

		expect(element.querySelector('[data-ref="label"]')).toBeNull();

		element.label = 'ready';
		expect(element.textContent).toBe('');

		element.remove();
		const label = document.createElement('span');
		label.setAttribute('data-ref', 'label');
		element.append(label);
		await connected(element);

		await waitFor(() => expect(label.textContent).toBe('ready'));
	});

	test('paints the attached element from a RadiantController', async () => {
		class BindToPanelController extends RadiantController {
			@prop({ type: Boolean, defaultValue: false })
			@bindTo({ bool: 'hidden', invert: true })
			open!: boolean;
		}

		const host = document.createElement('section');
		document.body.append(host);
		const controller = new BindToPanelController(host);
		controller.connect();

		expect(host.hasAttribute('hidden')).toBe(true);

		controller.open = true;
		expect(host.hasAttribute('hidden')).toBe(false);
	});

	test('does not treat a click as a bindTo write', async () => {
		@customElement('bind-to-no-click')
		class BindToNoClick extends RadiantElement {
			clicks = 0;

			@prop({ type: Boolean, defaultValue: false })
			@bindTo({ bool: 'hidden', invert: true })
			open = false;

			@onEvent({ ref: 'toggle', type: 'click' })
			onToggleClick() {
				this.clicks += 1;
			}
		}

		const element = document.createElement('bind-to-no-click') as BindToNoClick;
		const toggle = document.createElement('button');
		toggle.setAttribute('data-ref', 'toggle');
		element.append(toggle);

		await connected(element);

		expect(element.hasAttribute('hidden')).toBe(true);

		toggle.click();
		expect(element.clicks).toBe(1);
		expect(element.open).toBe(false);
		expect(element.hasAttribute('hidden')).toBe(true);
	});

	test('writes a DOM property onto a queried node', async () => {
		@customElement('bind-to-input-value')
		class BindToInputValue extends RadiantElement {
			@prop({ type: String, defaultValue: '' })
			@bindTo({ ref: 'input', prop: 'value' })
			value = '';
		}

		const element = document.createElement('bind-to-input-value') as BindToInputValue;
		const input = document.createElement('input');
		input.setAttribute('data-ref', 'input');
		element.append(input);

		await connected(element);

		element.value = 'aloe';
		expect(input.value).toBe('aloe');
	});

	test('skips a plain field rather than clobbering seeded DOM', async () => {
		@customElement('bind-to-plain-field')
		class BindToPlainField extends RadiantElement {
			@bindTo({ ref: 'out', text: true })
			label = 'from-field';
		}

		const element = document.createElement('bind-to-plain-field') as BindToPlainField;
		const out = document.createElement('span');
		out.setAttribute('data-ref', 'out');
		out.textContent = 'seeded';
		element.append(out);

		await connected(element);

		expect(out.textContent).toBe('seeded');
	});

	test('throws when a target lists more than one write kind', () => {
		expect(() =>
			bindTo({
				ref: 'x',
				attr: 'a',
				bool: 'b',
			}),
		).toThrow(/exactly one of `attr`, `bool`, `prop`, or `text`/);
	});

	test('throws when a target sets both ref and selector', () => {
		expect(() =>
			bindTo({
				ref: 'x',
				selector: '.y',
				attr: 'a',
			}),
		).toThrow(/cannot set both `ref` and `selector`/);
	});

	test('throws when a target lists no write kind', () => {
		expect(() =>
			// @ts-expect-error -- zero write kinds; the union catches this one
			bindTo({ ref: 'x' }),
		).toThrow(/exactly one of `attr`, `bool`, `prop`, or `text`/);
	});
});
