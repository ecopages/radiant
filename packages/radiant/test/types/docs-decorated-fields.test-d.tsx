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
import { ContextProvider } from '../../src/context/context-provider';
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
import { onContextUpdate } from '../../src/context/decorators/on-context-update';
import { onEvent } from '../../src/decorators/on-event';
import { onUpdated } from '../../src/decorators/on-updated';
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

/** Rows for the reference pages, in the order of their sections: the class named by each row is the page example. */

export class DeclareAndAccessorFields extends RadiantElement {
	// @ts-expect-error a declare field cannot be decorated with standard decorators (TS1206)
	@prop({ type: String }) declare label: string;
	// @ts-expect-error an accessor field is not a field decorator target
	@prop({ type: String }) accessor caption = '';
}

/** decorators/state.mdx, decorators/prop.mdx and getting-started/best-practices.mdx: the binding shape is the type argument. */

export class CounterDisplay extends RadiantElement<{ count: number }> {
	@state count = 0;

	@onEvent({ selector: 'button', type: 'click' })
	increment() {
		this.count += 1;
	}

	override render() {
		return (
			<div>
				<p>Count: {this.$.count}</p>
				<button type="button">Increment</button>
			</div>
		);
	}
}

export class MissingBindings extends RadiantElement {
	@state count = 0;

	override render() {
		// @ts-expect-error `this.$` only has the keys of the binding shape passed to RadiantElement
		return <p>{this.$.count}</p>;
	}
}

type UserCardProps = { name?: string; avatarUrl?: string };
type UserCardBindings = UserCardProps & { isExpanded: boolean };

export class UserCardWithBindings extends RadiantElement<UserCardBindings> {
	@prop({ type: String, defaultValue: 'Anonymous' }) name!: string;
	@prop({ type: String, defaultValue: '' }) avatarUrl!: string;
	@state isExpanded = false;

	toggleExpanded = () => {
		this.isExpanded = !this.isExpanded;
	};

	override render() {
		return (
			<article class={this.isExpanded ? 'user-card user-card--expanded' : 'user-card'}>
				<h2>{this.$.name}</h2>
				{this.avatarUrl && <img src={this.avatarUrl} alt="" />}
				<button type="button" on:click={this.toggleExpanded}>
					{this.$.isExpanded ? 'Hide details' : 'Show details'}
				</button>
			</article>
		);
	}
}

/** decorators/prop.mdx */

const csvStrings: PropTransform<string[]> = {
	fromAttribute: (value) => (value ? value.split(',').map((token) => token.trim()).filter(Boolean) : []),
	toAttribute: (values) => (values.length > 0 ? values.join(',') : null),
	fromProperty: (value) => {
		if (Array.isArray(value)) return value.map(String);
		if (typeof value === 'string') return value ? value.split(',') : [];
		return [];
	},
};

export class TokenSelect extends RadiantElement {
	@prop({ type: Array, reflect: true, transform: csvStrings, defaultValue: [] })
	value!: string[];
}

export class ControllerFields extends RadiantController {
	@attr({ source: 'data-page', type: Number }) page = 1;
	@attr({ source: 'data-enabled', type: Boolean }) enabled = false;
	@attr({ source: 'title' }) title?: string;
	@attr({ source: 'data-success-message' }) successMessage = 'Thanks for subscribing.';
	@query({ ref: 'form' }) form!: HTMLFormElement | null;
}

/** decorators/query.mdx and decorators/query-slot.mdx */

export class UserProfile extends RadiantElement {
	@query({ ref: 'avatar' }) avatar!: HTMLImageElement | null;
	@query({ selector: 'button.action' }) submitButton!: HTMLButtonElement | null;
	@query({ ref: 'item', all: true }) items!: HTMLElement[];
	@query({ ref: 'stable-el', cache: true }) stableEl!: HTMLElement | null;

	focusAvatar() {
		this.avatar?.focus();
	}
}

export class ShellCard extends RadiantElement {
	@querySlot({ name: 'heading' }) heading!: HTMLHeadingElement | null;
	@querySlot() body!: HTMLParagraphElement | null;
	@querySlot({ name: 'action', all: true }) actions!: HTMLButtonElement[];
}

declare const allMatches: boolean;

export class QueryAllMustBeLiteral extends RadiantElement {
	// @ts-expect-error all picks the overload, so it cannot be a boolean variable
	@query({ ref: 'item', all: allMatches }) items!: HTMLElement[];
}

/** decorators/event.mdx */

export class CounterButton extends RadiantElement {
	@event({ name: 'count-changed', bubbles: true }) countChanged!: EventEmitter<{ count: number }>;
}

/** decorators/bind-to.mdx and components/radiant-element.mdx */

export class RuiDialog extends RadiantElement {
	@prop({ type: Boolean, reflect: true, defaultValue: false })
	@bindTo({ ref: 'root', bool: 'hidden', invert: true })
	open = false;
}

export class Disclosure extends RadiantElement {
	@prop({ type: Boolean, defaultValue: false })
	@bindTo([
		{ selector: '[data-disclosure-trigger]', attr: 'aria-expanded' },
		{ selector: '[data-disclosure-panel]', attr: 'data-state', map: (open) => (open ? 'open' : 'closed') },
	])
	open = false;
}

export class RadiantCounter extends RadiantElement {
	@prop({ type: Number, reflect: true, defaultValue: 0 })
	@bindTo({ ref: 'count', text: true })
	value!: number;
}

export class PaintedCount extends RadiantElement {
	@bindTo({ ref: 'count', text: true })
	@state
	count = 0;
}

/** decorators/on-updated.mdx */

type CartItem = { price: number; quantity: number };

export class SearchField extends RadiantElement {
	@prop({ type: Boolean, defaultValue: false }) open!: boolean;
	@query({ ref: 'input' }) input!: HTMLInputElement | null;
	@prop({ type: Array, defaultValue: [] }) items!: CartItem[];
	@state total = 0;

	@onUpdated('open')
	focusInput() {
		if (this.open) {
			this.input?.focus();
		}
	}

	@onUpdated('items')
	calculateTotals() {
		this.total = this.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
	}
}

export class ThemeController extends RadiantController {
	@bindTo({ attr: 'data-theme' })
	@state
	theme = 'light';

	@onUpdated('theme')
	persistTheme() {
		localStorage.setItem('theme', this.theme);
	}
}

/** context/provide-context.mdx, context/consume-context.mdx and context/context-selector.mdx */

type ThemeContext = { mode: 'light' | 'dark' };
const themeContext = createContext<ThemeContext>(Symbol('theme-context'));
type Todo = { id: string; text: string; complete: boolean };
type TodoContext = { todos: Todo[]; logger: { log(message: string): void } };
const todoContext = createContext<TodoContext>(Symbol('todo-context'));
type BoardContext = { commits: number; stage: string; tempo: string };
const boardContext = createContext<BoardContext>(Symbol('board-context'));
const cartContext = createContext<{ total: number }>(Symbol('cart-context'));

class ThemeLogger {
	log(message: string) {
		console.log(message);
	}
}

type LoggedThemeContext = ThemeContext & { logger: ThemeLogger };

const loggedThemeContext = createContext<LoggedThemeContext>(Symbol('logged-theme-context'));

export class ThemeProvider extends RadiantElement {
	@provideContext<typeof themeContext>({
		context: themeContext,
		initialValue: { mode: 'light' },
	})
	provider!: ContextProvider<typeof themeContext>;

	@provideContext({
		context: themeContext,
		initialValue: { mode: 'light' },
		hydrate: Object,
	})
	hydrated!: ContextProvider<typeof themeContext>;

	@provideContext({
		context: loggedThemeContext,
		initialValue: { mode: 'light', logger: new ThemeLogger() },
		hydrate: Object,
		serialize: ({ mode }) => ({ mode }),
	})
	logged!: ContextProvider<typeof loggedThemeContext>;

	@provideContext({
		context: themeContext,
		// @ts-expect-error the initial value has to match the context type
		initialValue: { mode: 'light', logger: new ThemeLogger() },
	})
	extra!: ContextProvider<typeof themeContext>;

	manual = new ContextProvider<typeof themeContext>(this, {
		context: themeContext,
		initialValue: { mode: 'light' },
	});
}

export class ThemeProviderController extends RadiantController {
	@provideContext<typeof themeContext>({
		context: themeContext,
		initialValue: { mode: 'light' },
	})
	provider!: ContextProvider<typeof themeContext>;
}

export class ThemeLabel extends RadiantElement {
	@consumeContext(themeContext)
	provider!: ContextProvider<typeof themeContext>;

	@consumeContext(themeContext)
	maybeProvider?: ContextProvider<typeof themeContext>;

	// @ts-expect-error a consumed provider is a ContextProvider or undefined, never wider
	@consumeContext(themeContext) wider!: unknown;
	// @ts-expect-error a provider is always installed, so the field cannot be wider
	@provideContext({ context: themeContext }) widerProvider!: unknown;
}

export class ThemePanelController extends RadiantController {
	@consumeContext(themeContext)
	provider!: ContextProvider<typeof themeContext>;

	override render() {
		return <p>Theme: {this.provider.getContext().mode}</p>;
	}
}

export class MultipleContexts extends RadiantElement {
	@consumeContext(themeContext) theme!: ContextProvider<typeof themeContext>;
	@consumeContext(todoContext) todos!: ContextProvider<typeof todoContext>;
}

export class TodoBoard extends RadiantElement {
	@contextSelector({ context: todoContext, select: ({ todos }) => todos })
	todos: Todo[] = [];

	override render() {
		return (
			<ul>
				{this.todos.map((todo) => (
					<li>{todo.text}</li>
				))}
			</ul>
		);
	}
}

export class InsightCard extends RadiantElement {
	@prop({ type: String }) kind: 'commits' | 'stage' | 'tempo' = 'stage';

	@contextSelector({ context: boardContext })
	context: BoardContext | undefined;
}

export class SelectorFieldBounds extends RadiantElement {
	@contextSelector({ context: todoContext, select: ({ todos }) => todos }) wider: unknown;
	// @ts-expect-error the field cannot hold the number the selection returns
	@contextSelector({ context: cartContext, select: ({ total }) => total }) narrower: 0 | 1 = 1;
}

/** context/on-context-update.mdx */

export class CartBadge extends RadiantElement {
	@onContextUpdate({ context: cartContext, select: ({ total }) => total })
	onTotalChanged(total: number) {
		this.setAttribute('data-total', String(total));
	}

	@onContextUpdate({ context: cartContext, requestUpdate: false })
	onCartChanged(cart: { total: number }) {
		document.cookie = `total=${cart.total}; path=/`;
	}

	// @ts-expect-error the method receives the selected number, not a string
	@onContextUpdate({ context: cartContext, select: ({ total }) => total, subscribe: false })
	applyTotal(total: string) {
		this.setAttribute('data-total', total);
	}
}

export class CartBadgeController extends RadiantController {
	@onContextUpdate({ context: cartContext, select: ({ total }) => total })
	onTotalChanged(total: number) {
		this.host.setAttribute('data-total', String(total));
	}
}

/** components/radiant-element.mdx and components/radiant-controller.mdx */

type CounterBindings = { value: number };

export class JsxOwnedCounter extends RadiantElement<CounterBindings> {
	@prop({ type: Number, reflect: true, defaultValue: 0 }) value = 0;

	private readonly decrement = () => {
		if (this.value > 0) {
			this.value -= 1;
		}
	};

	override render() {
		return (
			<>
				<button type="button" on:click={this.decrement} aria-label="Decrement">
					-
				</button>
				<span>{this.$.value}</span>
			</>
		);
	}
}

export class DisclosureController extends RadiantController {
	@attr({ source: 'data-open', type: Boolean }) open = false;
	@state toggles = 0;

	private readonly toggle = () => {
		this.open = !this.open;
		this.toggles += 1;
	};

	override render() {
		return (
			<section>
				<button type="button" on:click={this.toggle}>
					{this.open ? 'Hide' : 'Show'} details
				</button>
				<div hidden={!this.open} data={{ toggleCount: this.toggles }}>
					Details
				</div>
			</section>
		);
	}
}

export class NewsletterFormController extends RadiantController {
	@attr({ source: 'data-success-message' }) successMessage = 'Thanks for subscribing.';
	@state pending = false;
	@query({ ref: 'form' }) form!: HTMLFormElement | null;
	@query({ ref: 'email' }) emailInput!: HTMLInputElement | null;
	@query({ ref: 'status' }) statusNode!: HTMLParagraphElement | null;
	@query({ ref: 'submit' }) submitButton!: HTMLButtonElement | null;

	@onEvent({ ref: 'form', type: 'submit' })
	async submit(event: Event) {
		event.preventDefault();
		const { emailInput, statusNode, submitButton } = this;
		if (!emailInput || !statusNode || !submitButton) return;
		this.pending = true;
		submitButton.disabled = true;
		this.host.setAttribute('aria-busy', 'true');
	}
}

export class ElementOnlyOnController extends RadiantController {
	// @ts-expect-error @querySlot needs a RadiantElement host
	@querySlot({ name: 'heading' }) heading!: HTMLHeadingElement | null;
	// @ts-expect-error @event needs a RadiantElement host
	@event({ name: 'picked' }) picked!: EventEmitter<{ id: string }>;
}

/** examples/counter.mdx, examples/todo-app.mdx and examples/weather-app.mdx */

export class CounterExample extends RadiantElement<{ value?: number }> {
	@prop({ type: Number, reflect: true }) value = 0;
}

type TodoApp = { todos: Todo[]; logger: ThemeLogger };
const todoAppContext = createContext<TodoApp>(Symbol('todo-app-context'));

export class RadiantTodoAppElement extends RadiantElement {
	@provideContext<typeof todoAppContext>({
		context: todoAppContext,
		initialValue: { todos: [], logger: new ThemeLogger() },
		hydrate: Object,
		serialize: ({ todos }: TodoApp) => ({ todos }),
	})
	provider!: ContextProvider<typeof todoAppContext>;

	@contextSelector({ context: todoAppContext, select: ({ todos }) => todos })
	todos: Todo[] = [];
}

export class RadiantTodoItem extends RadiantElement<{ complete: boolean; text: string }> {
	@prop({ type: Boolean, reflect: true, defaultValue: false }) complete!: boolean;
	@prop({ type: String, defaultValue: '' }) text!: string;
	@consumeContext(todoAppContext) context!: ContextProvider<typeof todoAppContext>;
}

type WeatherReport = { cityId: string; city: string };
type WeatherContext = { activeCityId: string; reports: WeatherReport[]; visibleReport?: WeatherReport };
const weatherContext = createContext<WeatherContext>(Symbol('weather-context'));

export class RadiantWeatherSummary extends RadiantElement {
	@contextSelector({
		context: weatherContext,
		select: ({ visibleReport }) => visibleReport,
	})
	visibleReport: WeatherReport | undefined;
}

export class RadiantWeatherAppElement extends RadiantElement {
	@state activeCityId = 'rome';

	@provideContext<typeof weatherContext>({
		context: weatherContext,
		initialValue: {
			activeCityId: 'rome',
			reports: [],
			visibleReport: undefined,
		},
	})
	provider!: ContextProvider<typeof weatherContext>;

	@contextSelector({ context: weatherContext })
	weatherState: WeatherContext = {
		activeCityId: 'rome',
		reports: [],
		visibleReport: undefined,
	};
}

/** jsx/authoring.mdx, jsx/overview.mdx and jsx/rendering.mdx: removal and class values that the types accept. */

declare const isActive: boolean;
declare const isInteractive: boolean;
declare const shouldResetClass: boolean;
declare const isVisible: boolean;
declare const hasPayload: boolean;
declare const shouldShowLabel: boolean;
declare const statusLabel: string;
declare const payload: object;
declare const handleClick: () => void;

export const classValues = (
	<section class="panel" classes={[isActive && 'panel--active', 'surface', { interactive: isInteractive }]} />
);

export const removalValues = (
	<button
		class={shouldResetClass ? undefined : 'toolbar-action'}
		hidden={isVisible ? false : true}
		on:click={isInteractive ? handleClick : undefined}
		prop:payload={hasPayload ? payload : undefined}
	>
		{shouldShowLabel ? statusLabel : null}
	</button>
);

export const rejectedRemovalValues = (
	// @ts-expect-error the shared attributes and event handlers type undefined, not null
	<button class={shouldResetClass ? null : 'toolbar-action'} on:click={isInteractive ? handleClick : null} />
);

type SignInState = { username: string; busy: boolean };

const signIn = () => console.log('sign in');

export const renderSignInButton = (state: SignInState) => (
	<button
		type="button"
		disabled={state.busy || state.username === ''}
		on:click={state.busy ? undefined : signIn}
		title={state.username === '' ? 'Enter your username first' : undefined}
	>
		{state.busy ? 'Signing in...' : 'Sign in'}
	</button>
);
