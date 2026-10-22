/**
 * Type-level check that the decorated fields shown in the docs compile with
 * standard decorators and full strict mode.
 *
 * @remarks
 * Checked by `tsc --noEmit -p test/types/tsconfig.json`, which turns
 * `strictPropertyInitialization` back on, not by the vitest run. The classes are
 * the `@prop`, `@attr` and `@signal` examples from `apps/docs`, with package
 * imports replaced by source paths. A `declare` field fails here with TS1206, a
 * bare field with TS2564. The "Typing Decorated Fields" section of
 * `decorators/index.mdx` follows its own marker, each `@ts-expect-error` row being
 * a field the page says does not compile. Legacy decorators are not
 * checked here: they never see the field type, so those rows would not fail.
 */
import { State, type WritableSignal } from '@ecopages/signals';
import type { ContextProvider } from '../../src/context/context-provider';
import { createContext } from '../../src/context/create-context';
import { consumeContext } from '../../src/context/decorators/consume-context';
import { contextSelector } from '../../src/context/decorators/context-selector';
import { provideContext } from '../../src/context/decorators/provide-context';
import type { AttrConverter } from '../../src/decorators/attr';
import type { PropTransform } from '../../src/core/reactive-prop-core';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { attr } from '../../src/decorators/attr';
import { bindTo } from '../../src/decorators/bind-to';
import { controller } from '../../src/decorators/controller';
import { customElement } from '../../src/decorators/custom-element';
import { event } from '../../src/decorators/event';
import { prop } from '../../src/decorators/prop';
import { query } from '../../src/decorators/query';
import { querySlot } from '../../src/decorators/query-slot';
import { signal } from '../../src/decorators/signal';
import { state } from '../../src/decorators/state';
import type { EventEmitter } from '../../src/tools/event-emitter';

@customElement('user-card')
export class UserCard extends RadiantElement {
	@prop({ type: String }) name!: string;
	@prop({ type: Number, defaultValue: 0 }) visits!: number;
	@prop({ type: Boolean, reflect: true, defaultValue: false }) active!: boolean;
}

@customElement('status-pill')
export class StatusPill extends RadiantElement {
	@attr({ source: 'data-status' }) status?: string;
	@attr({ source: 'aria-label' }) label?: string;

	override render() {
		return <span>{this.status ?? 'unknown'}</span>;
	}
}

@customElement('signal-counter')
export class SignalCounter extends RadiantElement {
	@signal({ initial: 0 }) count!: WritableSignal<number>;

	private readonly increment = () => {
		this.count.update((value) => value + 1);
	};

	override render() {
		return (
			<section>
				<p>Count: {this.count}</p>
				<button type="button" on:click={this.increment}>
					Increment
				</button>
			</section>
		);
	}
}

const sharedCount = new State(0);

@customElement('shared-counter')
export class SharedCounter extends RadiantElement {
	@signal({ source: sharedCount }) count!: WritableSignal<number>;
	@signal({ initial: 'idle' }) status!: WritableSignal<string>;
}

type ResultsListProps = {
	items: Array<{ id: string; label: string }>;
};

@controller('results-list')
export class ResultsListController extends RadiantController {
	@prop({ type: Array, defaultValue: [] }) items!: ResultsListProps['items'];

	override render() {
		return (
			<ul>
				{this.items.map((item) => (
					<li key={item.id}>{item.label}</li>
				))}
			</ul>
		);
	}
}

/** The classes below follow the sections of "Typing Decorated Fields", in order. */

type Size = 'sm' | 'md' | 'lg';

@customElement('size-picker')
export class SizePicker extends RadiantElement {
	@prop({ type: Number, defaultValue: 0 }) count = 0;
	@prop({ type: String, defaultValue: 'md' }) size: Size = 'md';
	@prop({ type: Boolean }) open?: boolean;
	@signal({ initial: 0 }) clicks!: WritableSignal<number>;
	@query({ ref: 'input' }) input!: HTMLInputElement | null;
}

export class RejectedFields extends RadiantElement {
	// @ts-expect-error defaultValue is a number and the field a string
	@prop({ type: Number, defaultValue: 0 }) count: string = '';
	// @ts-expect-error Number parses to a number
	@prop({ type: Number }) step?: string;
	// @ts-expect-error without type the attribute is a string
	@attr({ source: 'data-total' }) total = 0;
	// @ts-expect-error initial is a string and the signal holds a number
	@signal({ initial: 'x' }) label!: WritableSignal<number>;
	// @ts-expect-error a query returns null when nothing matches
	@query({ ref: 'input' }) input!: HTMLInputElement;
}

const csv = {
	fromAttribute: (value: string | null) => (value ? value.split(',') : []),
} satisfies PropTransform<string[]>;
const annotatedCsv: PropTransform<string[]> = csv;
const annotatedConverter: AttrConverter<string[]> = { fromAttribute: (v) => (v ? v.split(',') : []) };

export class TypeConstantFields extends RadiantElement {
	@prop({ type: Array }) tags: readonly string[] = [];
	@prop({ type: Object }) options?: { dense: boolean };
	// @ts-expect-error Object rejects an array field
	@prop({ type: Object }) list: string[] = [];
	// @ts-expect-error a field of two parsed types fits no constant
	@prop({ type: Number }) width: string | number = 0;
	@prop({ type: String, transform: { fromAttribute: (v) => Number(v) } }) rank = 0;
	@attr({ converter: { fromAttribute: (v) => (v ? v.split(',') : []) } }) labels: string[] = [];
	@prop({ type: String, transform: csv }) tokens: string[] = [];
	// @ts-expect-error an annotated transform leaves fromAttribute optional, so type is checked again
	@prop({ type: String, transform: annotatedCsv }) words: string[] = [];
	// @ts-expect-error an annotated converter leaves fromAttribute optional, so type is checked again
	@attr({ type: Number, converter: annotatedConverter }) parts: string[] = [];
}

export class Select<V extends string> extends RadiantElement {
	// @ts-expect-error the field type is a type parameter of the host
	@prop({ type: String }) value!: V;
	@prop({ type: String, transform: { fromAttribute: (v) => (v ?? '') as V } }) selected!: V;
	@attr({ source: 'data-mode' }) mode?: V;
	// @ts-expect-error the field type is a type parameter of the host
	@attr({ type: String }) kind?: V;
}

export class AttrFields extends RadiantElement {
	@attr({ source: 'data-status' }) status?: string;
	@attr({ defaultValue: 'idle' }) phase: 'idle' | 'busy' = 'idle';
	@attr({ source: 'data-count', type: Number }) count = 0;
	@attr({ source: 'data-open', type: Boolean }) open = false;
	// @ts-expect-error a number needs type: Number
	@attr({ source: 'data-total' }) total = 0;
	// @ts-expect-error a boolean needs type: Boolean
	@attr() enabled?: boolean;
}

export class DefaultFields extends RadiantElement {
	@prop({ type: Number, defaultValue: null }) limit: number | null = null;
	@prop({ type: String, defaultValue: 0, transform: { fromAttribute: (v) => Number(v) } }) rank = 0;
	// @ts-expect-error a null default needs a field that allows null
	@prop({ type: Number, defaultValue: null }) cap = 0;
}

const ctx = createContext<{ count: number }>('count');

export class InstallerFields extends RadiantElement {
	@query({ ref: 'item' }) first!: HTMLLIElement | null;
	@query({ ref: 'item', all: true }) items!: HTMLLIElement[];
	@querySlot({ name: 'heading' }) heading!: HTMLHeadingElement | null;
	@querySlot({ all: true }) actions!: HTMLButtonElement[];
	// @ts-expect-error a single-element query can be null
	@query({ ref: 'item' }) bad1!: HTMLLIElement;
	// @ts-expect-error an array needs all: true
	@query({ ref: 'item' }) bad2!: HTMLLIElement[];
	// @ts-expect-error a single-element slot query can be null
	@querySlot() bad3!: HTMLParagraphElement;

	@consumeContext(ctx) consumed?: ContextProvider<typeof ctx>;
	@provideContext({ context: ctx, initialValue: { count: 0 } }) provided!: ContextProvider<typeof ctx>;
	// @ts-expect-error a provider is always installed, so the field cannot be optional
	@provideContext({ context: ctx }) bad4?: ContextProvider<typeof ctx>;
	@event({ name: 'picked' }) picked!: EventEmitter<{ id: string }>;
	// @ts-expect-error an emitter is always installed, so the field cannot be optional
	@event({ name: 'closed' }) bad5?: EventEmitter;
	@contextSelector({ context: ctx, select: (c) => c.count }) total?: number;
	@contextSelector({ context: ctx }) whole!: { count: number };
	// @ts-expect-error the field must be able to hold any number the selection returns
	@contextSelector({ context: ctx, select: (c) => c.count }) bad6?: 1;
}

export class BindFields extends RadiantElement {
	@bindTo({ attr: 'data-n', map: (v) => v.toFixed() }) @state n = 0;
	// @ts-expect-error map receives the field type, a string
	@bindTo({ attr: 'data-n', map: (v) => v.toFixed() }) @state label = '';
	@bindTo<number>({ attr: 'data-n', map: (v) => v.toFixed() }) @state m = 0;
	@bindTo<number | undefined>({ attr: 'data-n', map: (v) => v?.toFixed() }) @state opt?: number;
	// @ts-expect-error a type argument must be the whole field type, undefined included
	@bindTo<number>({ attr: 'data-n', map: (v) => v.toFixed() }) @state maybe?: number;
	// @ts-expect-error a type argument is checked against the field
	@bindTo<number>({ attr: 'data-n', map: (v) => v.toFixed() }) @state text = '';
}
