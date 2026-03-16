/** @jsxImportSource @ecopages/jsx */

import { beforeEach, describe, expect, test } from 'vitest';
import type { ContextProvider } from '../../src/context/context-provider';
import { consumeContext } from '../../src/context/decorators/consume-context';
import { contextSelector } from '../../src/context/decorators/context-selector';
import { provideContext } from '../../src/context/decorators/provide-context';
import { createContext } from '../../src/context/create-context';
import { RadiantElement } from '../../src/core/radiant-element';
import { RadiantElementJsx } from '../../src/core/radiant-element-jsx';
import { WithJsx } from '../../src/mixins/with-jsx';

class JsxReceiverElement extends HTMLElement {
	value: unknown;
}

if (!customElements.get('jsx-receiver')) {
	customElements.define('jsx-receiver', JsxReceiverElement);
}

class MyWithJsxElement extends WithJsx(RadiantElement) {
	clicks = 0;

	private handleClick = () => {
		this.clicks += 1;
	};

	override connectedCallback(): void {
		super.connectedCallback();
		this.renderTemplate({
			target: this,
			template: (
				<div>
					<button on:click={this.handleClick}>Click</button>
					<jsx-receiver prop:value={{ greeting: 'Hello JSX' }} />
				</div>
			),
		});
	}
}

if (!customElements.get('my-with-jsx-element')) {
	customElements.define('my-with-jsx-element', MyWithJsxElement);
}

class MyRadiantElementJsx extends RadiantElementJsx {
	override connectedCallback(): void {
		super.connectedCallback();
		this.render(
			<div>
				<h1>Radiant JSX</h1>
				<p>Hello World</p>
			</div>,
		);
	}
}

if (!customElements.get('my-radiant-element-jsx')) {
	customElements.define('my-radiant-element-jsx', MyRadiantElementJsx);
}

type JsxSharedState = {
	count: number;
	tone: 'emerald' | 'sky' | 'amber';
	note: string;
};

const jsxSharedContext = createContext<JsxSharedState>(Symbol('jsx-shared-context'));

class JsxContextControls extends RadiantElementJsx {
	@consumeContext(jsxSharedContext) context!: ContextProvider<typeof jsxSharedContext>;

	private count = 0;
	private tone: JsxSharedState['tone'] = 'emerald';

	override connectedCallback(): void {
		super.connectedCallback();
		this.renderView();
	}

	@contextSelector({ context: jsxSharedContext, select: (context) => context.count })
	onCount(count: number) {
		this.count = count;
		this.renderView();
	}

	@contextSelector({ context: jsxSharedContext, select: (context) => context.tone })
	onTone(tone: JsxSharedState['tone']) {
		this.tone = tone;
		this.renderView();
	}

	private increment = () => {
		this.context.setContext({ count: this.count + 1 });
	};

	private setTone = (event: Event) => {
		const target = event.target as HTMLSelectElement;
		this.context.setContext({ tone: target.value as JsxSharedState['tone'] });
	};

	private renderView() {
		this.render(
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
			</div>,
		);
	}
}

if (!customElements.get('jsx-context-controls')) {
	customElements.define('jsx-context-controls', JsxContextControls);
}

class JsxContextMirror extends RadiantElementJsx {
	private snapshot: JsxSharedState = { count: 0, tone: 'emerald', note: 'Initial note' };

	override connectedCallback(): void {
		super.connectedCallback();
		this.renderView();
	}

	@contextSelector({ context: jsxSharedContext })
	onState(snapshot: JsxSharedState) {
		this.snapshot = snapshot;
		this.renderView();
	}

	private renderView() {
		this.render(
			<div>
				<span data-testid="mirrored-count">{this.snapshot.count}</span>
				<span data-testid="mirrored-tone">{this.snapshot.tone}</span>
				<span data-testid="mirrored-note">{this.snapshot.note}</span>
			</div>,
		);
	}
}

if (!customElements.get('jsx-context-mirror')) {
	customElements.define('jsx-context-mirror', JsxContextMirror);
}

class JsxContextNoteEditor extends RadiantElementJsx {
	@consumeContext(jsxSharedContext) context!: ContextProvider<typeof jsxSharedContext>;

	private localDraft = 'Initial note';
	private committedNote = 'Initial note';

	override connectedCallback(): void {
		super.connectedCallback();
		this.renderView();
	}

	@contextSelector({ context: jsxSharedContext, select: (context) => context.note })
	onNote(note: string) {
		this.committedNote = note;
		this.localDraft = note;
		this.renderView();
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
		this.renderView();
	};

	private renderView() {
		this.render(
			<div>
				<input data-testid="note-input" type="text" prop:value={this.localDraft} on:input={this.handleInput} />
				<button data-testid="publish-note" on:click={this.publish}>
					Publish note
				</button>
				<button data-testid="reset-note" on:click={this.reset}>
					Reset note
				</button>
			</div>,
		);
	}
}

if (!customElements.get('jsx-context-note-editor')) {
	customElements.define('jsx-context-note-editor', JsxContextNoteEditor);
}

class JsxContextProviderElement extends RadiantElementJsx {
	@provideContext<typeof jsxSharedContext>({
		context: jsxSharedContext,
		initialValue: { count: 0, tone: 'emerald', note: 'Initial note' },
	})
	context!: ContextProvider<typeof jsxSharedContext>;

	override connectedCallback(): void {
		super.connectedCallback();
		this.render(
			<section>
				<jsx-context-controls />
				<jsx-context-note-editor />
				<jsx-context-mirror />
			</section>,
		);
	}
}

if (!customElements.get('jsx-context-provider')) {
	customElements.define('jsx-context-provider', JsxContextProviderElement);
}

describe('WithJsx', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('it renders JSX templates into the light DOM', () => {
		const element = document.createElement('my-radiant-element-jsx');
		document.body.appendChild(element);

		const wrapper = element.querySelector('div');
		const heading = element.querySelector('h1');
		const paragraph = element.querySelector('p');

		expect(wrapper).not.toBeNull();
		expect(heading?.textContent).toBe('Radiant JSX');
		expect(paragraph?.textContent).toBe('Hello World');
	});

	test('it binds native events and direct property values', () => {
		const element = document.createElement('my-with-jsx-element') as MyWithJsxElement;
		document.body.appendChild(element);

		const button = element.querySelector('button');
		const receiver = element.querySelector('jsx-receiver') as JsxReceiverElement | null;

		expect(button).not.toBeNull();
		expect(receiver).not.toBeNull();
		expect(receiver?.value).toEqual({ greeting: 'Hello JSX' });

		button?.click();
		expect(element.clicks).toBe(1);
	});

	test('it rejects non-replace insertion for JSX templates', () => {
		const element = document.createElement('my-with-jsx-element') as MyWithJsxElement;
		expect(() =>
			element.renderTemplate({
				target: element,
				template: <div>Invalid</div>,
				insert: 'beforeend',
			}),
		).toThrow(
			'Radiant JSX templates only support insert: "replace". Use string templates for other insertion modes.',
		);
	});

	test('it keeps multiple JSX context consumers in sync and preserves controlled select state', async () => {
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
