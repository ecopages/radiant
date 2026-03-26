import { waitFor } from '@testing-library/dom';
import { beforeEach, describe, expect, test } from 'vitest';
import type { ContextProvider } from '../../src/context/context-provider';
import { consumeContext } from '../../src/context/decorators/consume-context';
import { contextSelector } from '../../src/context/decorators/context-selector';
import { provideContext } from '../../src/context/decorators/provide-context';
import { createContext } from '../../src/context/create-context';
import { RadiantComponent } from '../../src/core/radiant-component';
import { RadiantElement } from '../../src/core/radiant-element';

class JsxReceiverElement extends HTMLElement {
	value: unknown;
}

if (!customElements.get('jsx-receiver')) {
	customElements.define('jsx-receiver', JsxReceiverElement);
}

class MyRadiantComponentElement extends RadiantComponent {
	clicks = 0;

	private handleClick = () => {
		this.clicks += 1;
	};

	override render() {
		return (
			<div>
				<button on:click={this.handleClick}>Click</button>
				<jsx-receiver prop:value={{ greeting: 'Hello JSX' }} />
			</div>
		);
	}
}

if (!customElements.get('my-radiant-component-jsx')) {
	customElements.define('my-radiant-component-jsx', MyRadiantComponentElement);
}

class RadiantElementTodoItemTest extends RadiantElement {
	declare complete: boolean;
	connected = false;

	constructor() {
		super();
		this.createReactiveProp('complete', { type: Boolean, reflect: true, defaultValue: false });
	}

	override connectedCallback() {
		super.connectedCallback();
		this.connected = true;
	}
}

if (!customElements.get('radiant-element-todo-item-test')) {
	customElements.define('radiant-element-todo-item-test', RadiantElementTodoItemTest);
}

class RadiantElementTodoHostTest extends RadiantComponent {
	done = true;
	label = 'Ship docs';

	override render() {
		return <radiant-element-todo-item-test complete={this.done}>{this.label}</radiant-element-todo-item-test>;
	}
}

if (!customElements.get('radiant-element-todo-host-test')) {
	customElements.define('radiant-element-todo-host-test', RadiantElementTodoHostTest);
}

type JsxSharedState = {
	count: number;
	tone: 'emerald' | 'sky' | 'amber';
	note: string;
};

const jsxSharedContext = createContext<JsxSharedState>(Symbol('jsx-shared-context'));

class JsxContextControls extends RadiantComponent {
	@consumeContext(jsxSharedContext) context!: ContextProvider<typeof jsxSharedContext>;

	private count = 0;
	private tone: JsxSharedState['tone'] = 'emerald';

	@contextSelector({ context: jsxSharedContext, select: (context) => context.count })
	onCount(count: number) {
		this.count = count;
		this.update();
	}

	@contextSelector({ context: jsxSharedContext, select: (context) => context.tone })
	onTone(tone: JsxSharedState['tone']) {
		this.tone = tone;
		this.update();
	}

	private increment = () => {
		this.context.setContext({ count: this.count + 1 });
	};

	private setTone = (event: Event) => {
		const target = event.target as HTMLSelectElement;
		this.context.setContext({ tone: target.value as JsxSharedState['tone'] });
	};

	override render() {
		return (
			<div>
				<select data-testid="tone-select" prop:value={this.tone} on:change={this.setTone}>
					<option value="emerald">Emerald</option>
					<option value="sky">Sky</option>
					<option value="amber">Amber</option>
				</select>
				<button data-testid="increment" on:click={this.increment}>
					Increment
				</button>
				<span data-testid="local-count">{this.count}</span>
			</div>
		);
	}
}

if (!customElements.get('jsx-context-controls')) {
	customElements.define('jsx-context-controls', JsxContextControls);
}

class JsxContextMirror extends RadiantComponent {
	private snapshot: JsxSharedState = { count: 0, tone: 'emerald', note: 'Initial note' };

	@contextSelector({ context: jsxSharedContext })
	onState(snapshot: JsxSharedState) {
		this.snapshot = snapshot;
		this.update();
	}

	override render() {
		return (
			<div>
				<span data-testid="mirrored-count">{this.snapshot.count}</span>
				<span data-testid="mirrored-tone">{this.snapshot.tone}</span>
				<span data-testid="mirrored-note">{this.snapshot.note}</span>
			</div>
		);
	}
}

if (!customElements.get('jsx-context-mirror')) {
	customElements.define('jsx-context-mirror', JsxContextMirror);
}

class JsxContextNoteEditor extends RadiantComponent {
	@consumeContext(jsxSharedContext) context!: ContextProvider<typeof jsxSharedContext>;

	private localDraft = 'Initial note';
	private committedNote = 'Initial note';

	@contextSelector({ context: jsxSharedContext, select: (context) => context.note })
	onNote(note: string) {
		this.committedNote = note;
		this.localDraft = note;
		this.update();
	}

	private handleInput = (event: Event) => {
		const target = event.target as HTMLInputElement;
		this.localDraft = target.value;
	};

	private publish = () => {
		this.context.setContext({ note: this.localDraft });
	};

	private reset = () => {
		this.localDraft = this.committedNote;
		this.update();
	};

	override render() {
		return (
			<div>
				<input data-testid="note-input" type="text" prop:value={this.localDraft} on:input={this.handleInput} />
				<button data-testid="publish-note" on:click={this.publish}>
					Publish note
				</button>
				<button data-testid="reset-note" on:click={this.reset}>
					Reset note
				</button>
			</div>
		);
	}
}

if (!customElements.get('jsx-context-note-editor')) {
	customElements.define('jsx-context-note-editor', JsxContextNoteEditor);
}

class JsxContextProviderElement extends RadiantComponent {
	@provideContext<typeof jsxSharedContext>({
		context: jsxSharedContext,
		initialValue: { count: 0, tone: 'emerald', note: 'Initial note' },
	})
	context!: ContextProvider<typeof jsxSharedContext>;

	override render() {
		return (
			<section>
				<jsx-context-controls />
				<jsx-context-note-editor />
				<jsx-context-mirror />
			</section>
		);
	}
}

if (!customElements.get('jsx-context-provider')) {
	customElements.define('jsx-context-provider', JsxContextProviderElement);
}

describe('RadiantComponent JSX integration', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('renders JSX templates into the light DOM', () => {
		const element = document.createElement('my-radiant-component-jsx');
		document.body.appendChild(element);

		return waitFor(() => {
			const wrapper = element.querySelector('div');
			const button = element.querySelector('button');
			const receiver = element.querySelector('jsx-receiver') as JsxReceiverElement | null;

			expect(wrapper).not.toBeNull();
			expect(button?.textContent).toBe('Click');
			expect(receiver?.value).toEqual({ greeting: 'Hello JSX' });
		});
	});

	test('binds native events and direct property values', async () => {
		const element = document.createElement('my-radiant-component-jsx') as MyRadiantComponentElement;
		document.body.appendChild(element);

		const button = await waitFor(() => {
			const renderedButton = element.querySelector('button');
			expect(renderedButton).not.toBeNull();
			return renderedButton as HTMLButtonElement;
		});
		button?.click();

		expect(element.clicks).toBe(1);
	});

	test('renders RadiantElement custom elements correctly inside a RadiantComponent JSX tree', async () => {
		const host = document.createElement('radiant-element-todo-host-test') as RadiantElementTodoHostTest;
		document.body.appendChild(host);

		const firstItem = await waitFor(() => {
			const renderedItem = host.querySelector(
				'radiant-element-todo-item-test',
			) as RadiantElementTodoItemTest | null;
			expect(renderedItem).not.toBeNull();
			expect(renderedItem?.connected).toBe(true);
			expect(renderedItem?.complete).toBe(true);
			expect(renderedItem?.textContent).toBe('Ship docs');
			return renderedItem as RadiantElementTodoItemTest;
		});

		expect(firstItem.hasAttribute('complete')).toBe(true);

		host.done = false;
		host.update();

		await waitFor(() => {
			const rerenderedItem = host.querySelector(
				'radiant-element-todo-item-test',
			) as RadiantElementTodoItemTest | null;
			expect(rerenderedItem).toBe(firstItem);
			expect(rerenderedItem?.hasAttribute('complete')).toBe(false);
			expect(rerenderedItem?.textContent).toBe('Ship docs');
		});
	});

	test('keeps multiple JSX context consumers in sync and preserves controlled select state', async () => {
		const element = document.createElement('jsx-context-provider');
		document.body.appendChild(element);

		await Promise.resolve();
		await Promise.resolve();

		const select = element.querySelector('[data-testid="tone-select"]') as HTMLSelectElement | null;
		const incrementButton = element.querySelector('[data-testid="increment"]') as HTMLButtonElement | null;

		expect(select?.value).toBe('emerald');
		expect(element.querySelector('[data-testid="local-count"]')?.textContent).toBe('0');
		expect(element.querySelector('[data-testid="mirrored-count"]')?.textContent).toBe('0');
		expect(element.querySelector('[data-testid="mirrored-tone"]')?.textContent).toBe('emerald');
		expect(element.querySelector('[data-testid="mirrored-note"]')?.textContent).toBe('Initial note');

		if (!select || !incrementButton) {
			throw new Error('expected JSX context controls to render');
		}

		select.value = 'sky';
		select.dispatchEvent(new Event('change', { bubbles: true }));

		const updatedSelect = element.querySelector('[data-testid="tone-select"]') as HTMLSelectElement | null;
		expect(updatedSelect?.value).toBe('sky');
		expect(element.querySelector('[data-testid="mirrored-tone"]')?.textContent).toBe('sky');

		incrementButton.click();
		incrementButton.click();

		expect(element.querySelector('[data-testid="local-count"]')?.textContent).toBe('2');
		expect(element.querySelector('[data-testid="mirrored-count"]')?.textContent).toBe('2');

		const noteInput = element.querySelector('[data-testid="note-input"]') as HTMLInputElement | null;
		const publishButton = element.querySelector('[data-testid="publish-note"]') as HTMLButtonElement | null;
		const resetButton = element.querySelector('[data-testid="reset-note"]') as HTMLButtonElement | null;

		if (!noteInput || !publishButton || !resetButton) {
			throw new Error('expected JSX note editor to render');
		}

		noteInput.value = 'Published from JSX note editor';
		noteInput.dispatchEvent(new Event('input', { bubbles: true }));
		publishButton.click();

		expect(element.querySelector('[data-testid="mirrored-note"]')?.textContent).toBe(
			'Published from JSX note editor',
		);

		const refreshedNoteInput = element.querySelector('[data-testid="note-input"]') as HTMLInputElement | null;
		if (!refreshedNoteInput) {
			throw new Error('expected JSX note input to rerender');
		}

		refreshedNoteInput.value = 'Unsaved local edit';
		refreshedNoteInput.dispatchEvent(new Event('input', { bubbles: true }));
		resetButton.click();

		const resetInput = element.querySelector('[data-testid="note-input"]') as HTMLInputElement | null;
		expect(resetInput?.value).toBe('Published from JSX note editor');
		expect(element.querySelector('[data-testid="mirrored-note"]')?.textContent).toBe(
			'Published from JSX note editor',
		);
	});
});
