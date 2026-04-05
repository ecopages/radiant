import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import { RadiantComponent } from '../../src/core/radiant-component';
import { customElement } from '../../src/decorators/custom-element';
import { onEvent } from '../../src/decorators/on-event';
import { prop } from '../../src/decorators/prop';
import { state } from '../../src/decorators/state';
import { createEventListener } from '../../src/helpers/create-event-listener';

function defineElement(tag: string, constructor: CustomElementConstructor): void {
	if (!customElements.get(tag)) {
		customElements.define(tag, constructor);
	}
}

type CounterSnapshot = {
	count: number;
	draft: string;
	attribute: string | null;
	rendered: string | null;
};

type CounterComponentContract = RadiantComponent & {
	count: number;
	draft: string;
};

function readCounterSnapshot(element: CounterComponentContract): CounterSnapshot {
	return {
		count: element.count,
		draft: element.draft,
		attribute: element.getAttribute('count'),
		rendered: element.querySelector('[data-ref="output"]')?.textContent ?? null,
	};
}

@customElement('parity-decorator-counter-component')
class DecoratorCounterParityComponent extends RadiantComponent {
	@prop({ type: Number, reflect: true, defaultValue: 1 }) count = 1;
	@state draft = 'ready';

	@onEvent({ ref: 'action', type: 'click' })
	handleAction(): void {
		this.count += 1;
		this.draft = `draft-${this.count}`;
	}

	override render() {
		return (
			<div>
				<button type="button" data-ref="action">
					Increment
				</button>
				<span data-ref="output">
					Count: {this.count} / Draft: {this.draft}
				</span>
			</div>
		);
	}
}

class PlainCounterParityComponent extends RadiantComponent {
	declare count: number;
	declare draft: string;

	constructor() {
		super();
		this.createReactiveProp('count', { type: Number, reflect: true, defaultValue: 1 });
		this.createReactiveField('draft', 'ready');
		createEventListener(this, { ref: 'action', type: 'click' }, () => {
			this.count += 1;
			this.draft = `draft-${this.count}`;
		});
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.registerUpdateCallback('count', () => this.update());
		this.registerUpdateCallback('draft', () => this.update());
	}

	override render() {
		return (
			<div>
				<button type="button" data-ref="action">
					Increment
				</button>
				<span data-ref="output">
					Count: {this.count} / Draft: {this.draft}
				</span>
			</div>
		);
	}
}

defineElement('parity-plain-counter-component', PlainCounterParityComponent);

const counterVariants = [
	{
		label: 'decorators',
		create: () => document.createElement('parity-decorator-counter-component') as CounterComponentContract,
	},
	{
		label: 'plain-js',
		create: () => document.createElement('parity-plain-counter-component') as CounterComponentContract,
	},
] as const;

type ToggleSnapshot = {
	active: boolean;
	rendered: string | null;
};

type ToggleComponentContract = RadiantComponent & {
	active: boolean;
};

function readToggleSnapshot(element: ToggleComponentContract): ToggleSnapshot {
	return {
		active: element.active,
		rendered: element.querySelector('[data-ref="status"]')?.textContent ?? null,
	};
}

@customElement('parity-decorator-toggle-component')
class DecoratorToggleParityComponent extends RadiantComponent {
	@state active = false;

	@onEvent({ ref: 'toggle', type: 'click' })
	handleToggle(): void {
		this.active = !this.active;
	}

	override render() {
		return (
			<div>
				<button type="button" data-ref="toggle">
					Toggle
				</button>
				<span data-ref="status">{this.active ? 'ON' : 'OFF'}</span>
			</div>
		);
	}
}

class PlainToggleParityComponent extends RadiantComponent {
	declare active: boolean;

	constructor() {
		super();
		this.createReactiveField('active', false);
		createEventListener(this, { ref: 'toggle', type: 'click' }, () => {
			this.active = !this.active;
		});
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.registerUpdateCallback('active', () => this.update());
	}

	override render() {
		return (
			<div>
				<button type="button" data-ref="toggle">
					Toggle
				</button>
				<span data-ref="status">{this.active ? 'ON' : 'OFF'}</span>
			</div>
		);
	}
}

defineElement('parity-plain-toggle-component', PlainToggleParityComponent);

const toggleVariants = [
	{
		label: 'decorators',
		create: () => document.createElement('parity-decorator-toggle-component') as ToggleComponentContract,
	},
	{
		label: 'plain-js',
		create: () => document.createElement('parity-plain-toggle-component') as ToggleComponentContract,
	},
] as const;

type ListSnapshot = {
	items: string[];
	label: string;
	rendered: string | null;
};

type ListComponentContract = RadiantComponent & {
	label: string;
	items: string[];
};

function readListSnapshot(element: ListComponentContract): ListSnapshot {
	return {
		items: element.items,
		label: element.label,
		rendered: element.querySelector('[data-ref="list"]')?.textContent ?? null,
	};
}

@customElement('parity-decorator-list-component')
class DecoratorListParityComponent extends RadiantComponent {
	@prop({ type: String, defaultValue: 'Items' }) label = 'Items';
	@state items: string[] = [];

	override render() {
		return (
			<div>
				<h3>{this.label}</h3>
				<span data-ref="list">{this.items.length > 0 ? this.items.join(', ') : 'empty'}</span>
			</div>
		);
	}
}

class PlainListParityComponent extends RadiantComponent {
	declare label: string;
	declare items: string[];

	constructor() {
		super();
		this.createReactiveProp('label', { type: String, defaultValue: 'Items' });
		this.createReactiveField('items', [] as string[]);
	}

	override connectedCallback(): void {
		super.connectedCallback();
		this.registerUpdateCallback('label', () => this.update());
		this.registerUpdateCallback('items', () => this.update());
	}

	override render() {
		return (
			<div>
				<h3>{this.label}</h3>
				<span data-ref="list">{this.items.length > 0 ? this.items.join(', ') : 'empty'}</span>
			</div>
		);
	}
}

defineElement('parity-plain-list-component', PlainListParityComponent);

const listVariants = [
	{
		label: 'decorators',
		create: () => document.createElement('parity-decorator-list-component') as ListComponentContract,
	},
	{
		label: 'plain-js',
		create: () => document.createElement('parity-plain-list-component') as ListComponentContract,
	},
] as const;

beforeEach(() => {
	document.body.innerHTML = '';
});

describe('RadiantComponent decorators vs plain JS parity', () => {
	describe('counter component', () => {
		test.each(counterVariants)('$label renders the same initial JSX output', async ({ create }) => {
			const element = create();
			document.body.appendChild(element);

			await waitFor(() => {
				expect(readCounterSnapshot(element)).toEqual({
					count: 1,
					draft: 'ready',
					attribute: '1',
					rendered: 'Count: 1 / Draft: ready',
				});
			});
		});

		test.each(counterVariants)('$label rerenders after click interaction', async ({ create }) => {
			const element = create();
			document.body.appendChild(element);

			await waitFor(() => {
				expect(element.querySelector('[data-ref="output"]')).not.toBeNull();
			});

			element.querySelector<HTMLButtonElement>('[data-ref="action"]')!.click();

			await waitFor(() => {
				expect(readCounterSnapshot(element)).toEqual({
					count: 2,
					draft: 'draft-2',
					attribute: '2',
					rendered: 'Count: 2 / Draft: draft-2',
				});
			});
		});

		test.each(counterVariants)('$label rerenders after programmatic property set', async ({ create }) => {
			const element = create();
			document.body.appendChild(element);

			await waitFor(() => {
				expect(element.querySelector('[data-ref="output"]')).not.toBeNull();
			});

			element.count = 10;
			element.draft = 'manual';

			await waitFor(() => {
				expect(readCounterSnapshot(element)).toEqual({
					count: 10,
					draft: 'manual',
					attribute: '10',
					rendered: 'Count: 10 / Draft: manual',
				});
			});
		});
	});

	describe('toggle component', () => {
		test.each(toggleVariants)('$label renders the same initial JSX output', async ({ create }) => {
			const element = create();
			document.body.appendChild(element);

			await waitFor(() => {
				expect(readToggleSnapshot(element)).toEqual({
					active: false,
					rendered: 'OFF',
				});
			});
		});

		test.each(toggleVariants)('$label rerenders after toggle click', async ({ create }) => {
			const element = create();
			document.body.appendChild(element);

			await waitFor(() => {
				expect(element.querySelector('[data-ref="status"]')).not.toBeNull();
			});

			element.querySelector<HTMLButtonElement>('[data-ref="toggle"]')!.click();

			await waitFor(() => {
				expect(readToggleSnapshot(element)).toEqual({
					active: true,
					rendered: 'ON',
				});
			});

			element.querySelector<HTMLButtonElement>('[data-ref="toggle"]')!.click();

			await waitFor(() => {
				expect(readToggleSnapshot(element)).toEqual({
					active: false,
					rendered: 'OFF',
				});
			});
		});
	});

	describe('list component', () => {
		test.each(listVariants)('$label renders the same initial JSX output', async ({ create }) => {
			const element = create();
			document.body.appendChild(element);

			await waitFor(() => {
				expect(readListSnapshot(element)).toEqual({
					items: [],
					label: 'Items',
					rendered: 'empty',
				});
			});
		});

		test.each(listVariants)('$label rerenders after item and label changes', async ({ create }) => {
			const element = create();
			document.body.appendChild(element);

			await waitFor(() => {
				expect(element.querySelector('[data-ref="list"]')).not.toBeNull();
			});

			element.items = ['alpha', 'beta'];

			await waitFor(() => {
				expect(readListSnapshot(element)).toEqual({
					items: ['alpha', 'beta'],
					label: 'Items',
					rendered: 'alpha, beta',
				});
			});

			element.label = 'Tags';

			await waitFor(() => {
				expect(readListSnapshot(element)).toEqual({
					items: ['alpha', 'beta'],
					label: 'Tags',
					rendered: 'alpha, beta',
				});
			});
		});
	});
});
