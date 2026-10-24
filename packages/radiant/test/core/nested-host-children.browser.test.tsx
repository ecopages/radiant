import { waitFor } from '@testing-library/dom';
import type { JsxRenderable } from '@ecopages/jsx';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { RadiantElement } from '../../src/core/radiant-element';
import { customElement } from '../../src/decorators/custom-element';
import { state } from '../../src/decorators/state';

/**
 * Waits two macrotask turns so slot-projection observers and the child update cycles they request have run.
 *
 * @remarks Radiant updates and slot re-projection run as microtasks, so a macrotask turn drains them. Used before
 * asserting that something did not happen, where `waitFor` would pass immediately, and to separate state steps.
 */
async function settle(): Promise<void> {
	for (let turn = 0; turn < 2; turn += 1) {
		await new Promise((resolve) => setTimeout(resolve));
	}
}

function mount<T extends HTMLElement>(tagName: string): T {
	const element = document.createElement(tagName) as T;
	document.body.append(element);
	return element;
}

@customElement('nested-slot-frame-test')
class NestedSlotFrame extends RadiantElement {
	@state tone = 'plain';

	override render() {
		return (
			<div class="frame" data-tone={this.tone}>
				<slot />
			</div>
		);
	}
}

@customElement('nested-slot-parent-test')
class NestedSlotParent extends RadiantElement<{ label: string }> {
	@state label = 'one';
	@state showBadge = false;

	override render() {
		return (
			<section>
				<nested-slot-frame-test>
					<span class="label">{this.$.label}</span>
					{this.showBadge ? <b class="badge">new</b> : null}
				</nested-slot-frame-test>
			</section>
		);
	}
}

@customElement('nested-slot-list-test')
class NestedSlotList extends RadiantElement {
	@state items = ['x', 'y', 'z'];

	override render() {
		return (
			<ul>
				{this.items.map((item) => (
					<nested-slot-frame-test key={item}>
						<i class="item">{item}</i>
					</nested-slot-frame-test>
				))}
			</ul>
		);
	}
}

@customElement('nested-slot-swap-parent-test')
class NestedSlotSwapParent extends RadiantElement {
	@state mode: 'single' | 'pair' = 'single';

	override render() {
		return this.mode === 'single' ? (
			<nested-slot-frame-test>
				<span class="item">A</span>
			</nested-slot-frame-test>
		) : (
			<nested-slot-frame-test>
				<span class="item">B</span>
				<span class="item">B2</span>
			</nested-slot-frame-test>
		);
	}
}

@customElement('nested-slot-list-frame-test')
class NestedSlotListFrame extends RadiantElement {
	override render() {
		return (
			<ul>
				<slot />
			</ul>
		);
	}
}

@customElement('nested-slot-todo-parent-test')
class NestedSlotTodoParent extends RadiantElement {
	@state todos = ['One'];

	override render() {
		return (
			<nested-slot-list-frame-test>
				{this.todos.map((todo) => (
					<li class="item">{todo}</li>
				))}
			</nested-slot-list-frame-test>
		);
	}
}

@customElement('nested-named-slot-frame-test')
class NestedNamedSlotFrame extends RadiantElement {
	override render() {
		return (
			<div>
				<header>
					<slot name="header" />
				</header>
				<main>
					<slot />
				</main>
			</div>
		);
	}
}

@customElement('nested-named-slot-parent-test')
class NestedNamedSlotParent extends RadiantElement {
	@state showTitle = false;

	override render() {
		return (
			<nested-named-slot-frame-test>
				{this.showTitle ? <h2 slot="header">Title</h2> : null}
				<p>Body</p>
			</nested-named-slot-frame-test>
		);
	}
}

@customElement('nested-toggle-slot-frame-test')
class NestedToggleSlotFrame extends RadiantElement {
	@state open = true;

	override render() {
		return <div class="frame">{this.open ? <slot /> : <em>closed</em>}</div>;
	}
}

@customElement('nested-toggle-slot-parent-test')
class NestedToggleSlotParent extends RadiantElement<{ label: string }> {
	@state label = 'one';
	@state showBadge = false;

	override render() {
		return (
			<nested-toggle-slot-frame-test>
				<span class="label">{this.$.label}</span>
				{this.showBadge ? <b class="badge">new</b> : null}
			</nested-toggle-slot-frame-test>
		);
	}
}

@customElement('nested-region-card-test')
class NestedRegionCard extends RadiantElement {
	@state open = true;
	@state header: JsxRenderable = null;
	@state body: JsxRenderable = null;

	override render() {
		return (
			<div>
				<header>{this.header}</header>
				{this.open ? <main>{this.body}</main> : <em>closed</em>}
			</div>
		);
	}
}

@customElement('nested-region-parent-test')
class NestedRegionParent extends RadiantElement<{ label: string }> {
	@state label = 'one';
	@state showExtras = false;
	clicks = 0;

	private readonly countClick = () => {
		this.clicks += 1;
	};

	override render() {
		return (
			<nested-region-card-test
				prop:header={this.showExtras ? <h2>Title</h2> : null}
				prop:body={
					<>
						<button type="button" class="label" on:click={this.countClick}>
							{this.$.label}
						</button>
						{this.showExtras ? <b class="badge">new</b> : null}
					</>
				}
			/>
		);
	}
}

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
	document.body.innerHTML = '';
	warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = '';
});

describe('a render-owning host projecting JSX children of a parent view through <slot>', () => {
	test('projects the parent children into the slot', async () => {
		const parent = mount<NestedSlotParent>('nested-slot-parent-test');

		await waitFor(() => expect(parent.querySelector('.frame > .label')?.textContent).toBe('one'));
	});

	test('patches a parent binding inside the projected children', async () => {
		const parent = mount<NestedSlotParent>('nested-slot-parent-test');
		await waitFor(() => expect(parent.querySelector('.frame > .label')).not.toBeNull());

		parent.label = 'two';

		await waitFor(() => expect(parent.querySelector('.frame > .label')?.textContent).toBe('two'));
	});

	test('adds and removes an unnamed parent child inside the slot', async () => {
		const parent = mount<NestedSlotParent>('nested-slot-parent-test');
		await waitFor(() => expect(parent.querySelector('.frame > .label')).not.toBeNull());

		parent.showBadge = true;
		await waitFor(() => expect(parent.querySelectorAll('.frame > .badge')).toHaveLength(1));

		parent.showBadge = false;
		await settle();

		expect(parent.querySelector('.badge')).toBeNull();
		expect(warn).not.toHaveBeenCalled();
	});

	test('keeps the projection when the child rerenders before the parent updates', async () => {
		const parent = mount<NestedSlotParent>('nested-slot-parent-test');
		await waitFor(() => expect(parent.querySelector('.frame > .label')).not.toBeNull());
		const frame = parent.querySelector('nested-slot-frame-test') as NestedSlotFrame;

		frame.tone = 'loud';
		await settle();
		parent.label = 'three';
		parent.showBadge = true;
		await settle();

		expect(parent.querySelectorAll('.frame')).toHaveLength(1);
		expect(parent.querySelector('.frame')?.getAttribute('data-tone')).toBe('loud');
		expect(parent.querySelector('.frame > .label')?.textContent).toBe('three');
		expect(parent.querySelectorAll('.frame > .badge')).toHaveLength(1);
	});

	test('reorders keyed render-owning children together with their projected content', async () => {
		const list = mount<NestedSlotList>('nested-slot-list-test');
		await waitFor(() => expect(list.querySelectorAll('.frame > .item')).toHaveLength(3));
		const [frameX, frameY, frameZ] = Array.from(list.querySelectorAll('nested-slot-frame-test'));

		list.items = ['z', 'x', 'y'];
		await settle();

		expect(Array.from(list.querySelectorAll('nested-slot-frame-test'))).toEqual([frameZ, frameX, frameY]);
		expect(Array.from(list.querySelectorAll('.frame > .item'), (item) => item.textContent)).toEqual([
			'z',
			'x',
			'y',
		]);
		expect(list.querySelectorAll('.frame')).toHaveLength(3);
	});

	test('grows a keyed list of render-owning children after a removal', async () => {
		const list = mount<NestedSlotList>('nested-slot-list-test');
		await waitFor(() => expect(list.querySelectorAll('.frame > .item')).toHaveLength(3));

		list.items = ['x', 'y'];
		await settle();
		expect(list.querySelectorAll('.frame > .item')).toHaveLength(2);
		list.items = ['x', 'y', 'w'];
		await settle();

		expect(Array.from(list.querySelectorAll('.frame > .item'), (item) => item.textContent)).toEqual([
			'x',
			'y',
			'w',
		]);
		expect(list.querySelectorAll('.frame')).toHaveLength(3);
	});

	test('projects new children when the parent swaps the children template', async () => {
		const parent = mount<NestedSlotSwapParent>('nested-slot-swap-parent-test');
		await waitFor(() => expect(parent.querySelector('.frame > .item')?.textContent).toBe('A'));

		parent.mode = 'pair';
		await settle();

		expect(Array.from(parent.querySelectorAll('.frame > .item'), (item) => item.textContent)).toEqual(['B', 'B2']);
	});

	test.fails('places named-slot content that a parent view adds after mount in its named slot', async () => {
		const parent = mount<NestedNamedSlotParent>('nested-named-slot-parent-test');
		await waitFor(() => expect(parent.querySelector('main > p')).not.toBeNull());
		expect(parent.firstElementChild).toBeInstanceOf(NestedNamedSlotFrame);

		parent.showTitle = true;
		await settle();

		expect(parent.querySelector('header > h2')?.textContent).toBe('Title');
		expect(parent.querySelector('main > h2')).toBeNull();
	});

	test.fails('removes named-slot content that a parent view drops', async () => {
		const parent = document.createElement('nested-named-slot-parent-test') as NestedNamedSlotParent;
		parent.showTitle = true;
		document.body.append(parent);
		await waitFor(() => expect(parent.querySelector('header > h2')).not.toBeNull());

		parent.showTitle = false;
		await settle();

		expect(parent.querySelector('h2')).toBeNull();
	});

	test.fails('shows parent edits made while the child slot was not rendered once the slot returns', async () => {
		const parent = mount<NestedToggleSlotParent>('nested-toggle-slot-parent-test');
		await waitFor(() => expect(parent.querySelector('.frame > .label')).not.toBeNull());
		const frame = parent.querySelector('nested-toggle-slot-frame-test') as NestedToggleSlotFrame;

		frame.open = false;
		await settle();
		parent.label = 'two';
		parent.showBadge = true;
		await settle();
		frame.open = true;
		await settle();

		expect(parent.querySelector('.frame > .label')?.textContent).toBe('two');
		expect(parent.querySelectorAll('.frame > .badge')).toHaveLength(1);
		expect(warn).not.toHaveBeenCalled();
	});

	test('removes every projected child when the parent view empties its list', async () => {
		const parent = mount<NestedSlotTodoParent>('nested-slot-todo-parent-test');
		await waitFor(() => expect(parent.querySelectorAll('ul > .item')).toHaveLength(1));
		expect(parent.firstElementChild).toBeInstanceOf(NestedSlotListFrame);

		parent.todos = ['One', 'Two'];
		await settle();
		expect(parent.querySelectorAll('ul > .item')).toHaveLength(2);
		parent.todos = ['Two'];
		await settle();
		expect(Array.from(parent.querySelectorAll('ul > .item'), (item) => item.textContent)).toEqual(['Two']);
		parent.todos = [];
		await settle();

		expect(parent.querySelectorAll('.item')).toHaveLength(0);
	});
});

describe('a render-owning host rendering JSX a parent view passes through a property', () => {
	test('adds and removes a named region and patches parent bindings inside it', async () => {
		const parent = mount<NestedRegionParent>('nested-region-parent-test');
		await waitFor(() => expect(parent.querySelector('main > .label')?.textContent).toBe('one'));

		parent.showExtras = true;
		await waitFor(() => expect(parent.querySelector('header > h2')).not.toBeNull());
		expect(parent.querySelector('main > .badge')).not.toBeNull();

		parent.label = 'two';
		await waitFor(() => expect(parent.querySelector('main > .label')?.textContent).toBe('two'));

		parent.showExtras = false;
		await settle();

		expect(parent.querySelector('h2')).toBeNull();
		expect(parent.querySelector('.badge')).toBeNull();
		expect(warn).not.toHaveBeenCalled();
	});

	test('shows parent edits made while the region was not rendered once it returns', async () => {
		const parent = mount<NestedRegionParent>('nested-region-parent-test');
		await waitFor(() => expect(parent.querySelector('main > .label')).not.toBeNull());
		const card = parent.querySelector('nested-region-card-test') as NestedRegionCard;

		card.open = false;
		await settle();
		expect(parent.querySelector('main')).toBeNull();
		parent.label = 'three';
		parent.showExtras = true;
		await settle();
		card.open = true;
		await settle();

		expect(parent.querySelector('main > .label')?.textContent).toBe('three');
		expect(parent.querySelectorAll('main > .badge')).toHaveLength(1);
		expect(warn).not.toHaveBeenCalled();
	});

	test('runs a delegated parent handler inside the region', async () => {
		const parent = mount<NestedRegionParent>('nested-region-parent-test');
		await waitFor(() => expect(parent.querySelector('main > .label')).not.toBeNull());

		(parent.querySelector('.label') as HTMLButtonElement).click();
		parent.showExtras = true;
		await settle();
		(parent.querySelector('.label') as HTMLButtonElement).click();

		expect(parent.clicks).toBe(2);
	});

	test('keeps the parent button node in the region when a sibling appears', async () => {
		const parent = mount<NestedRegionParent>('nested-region-parent-test');
		await waitFor(() => expect(parent.querySelector('main > .label')).not.toBeNull());
		const button = parent.querySelector('.label');

		parent.showExtras = true;
		await settle();

		expect(parent.querySelector('main > .badge')).not.toBeNull();
		expect(parent.querySelector('.label')).toBe(button);
	});
});
