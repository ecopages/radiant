/**
 * Field decorator forms that must compile with no explicit generic.
 *
 * @remarks
 * Typecheck only: `tsconfig.json` checks this file with standard decorators and
 * `test/types/tsconfig.legacy.json` checks it with legacy decorators. The forms each
 * decorator must reject and the forms that need the field type for contextual
 * typing live in `field-decorators.standard.ts`, because legacy mode never sees
 * the field type.
 */
import { state as createState, type ExternalStoreSource, type WritableSignal } from '@ecopages/signals';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { attr } from '../../src/decorators/attr';
import { bindTo } from '../../src/decorators/bind-to';
import { customElement } from '../../src/decorators/custom-element';
import { fromStore } from '../../src/decorators/from-store';
import { prop } from '../../src/decorators/prop';
import { signal } from '../../src/decorators/signal';
import { state } from '../../src/decorators/state';

type Mode = 'a' | 'b';

customElement('valid-custom-element');
customElement('valid-custom-element-with-options', {});
// @ts-expect-error customized built-ins are not supported
customElement('invalid-custom-element', { extends: 'button' });

const count = createState(0);

const cartStore: ExternalStoreSource<{ n: number; label: string }> = {
	getState: () => ({ n: 0, label: 'a' }),
	subscribe: () => () => {},
};

/** Zustand's `StoreApi<T>`: its listener takes the state and the previous state. */
type ZustandStoreApi<T> = {
	getInitialState: () => T;
	getState: () => T;
	setState: (partial: Partial<T>) => void;
	subscribe: (listener: (state: T, previousState: T) => void) => () => void;
};

declare const zustandStore: ZustandStoreApi<{ n: number }>;
/** What `create()` from `zustand` returns: the React hook, with the store API on it. */
declare const zustandHook: ZustandStoreApi<{ n: number }> & (() => { n: number });
/** The shape of a Redux Toolkit `configureStore()` result that `@fromStore` reads. */
declare const reduxStore: {
	dispatch: (action: { type: string }) => unknown;
	getState: () => { user: string };
	subscribe: (listener: () => void) => () => void;
};

export class ValidElementFields extends RadiantElement {
	@prop({ type: Number, defaultValue: 0 }) p1: number;
	@prop({ type: Number }) p2?: number;
	@prop({ type: String, defaultValue: 'a' }) p3: Mode;
	@prop({ type: Array, defaultValue: [] }) p4: string[];
	@prop({ type: Object }) p5?: { a: number };
	@prop({ type: Number, defaultValue: 0 }) p6 = 0;
	@prop({ type: Object, transform: { fromProperty: (v) => v as { a: number } } }) p7?: { a: number };
	@prop<Mode>({ type: String, defaultValue: 'a' }) p8: Mode;
	@prop<number | undefined>({ type: Number }) p9?: number;
	// @ts-expect-error bind is no longer a reactive member option
	@prop({ type: Number, defaultValue: 0, bind: true }) pBind: number;

	@attr() a1?: string;
	@attr() a2: string | undefined;
	@attr({ defaultValue: '' }) a3: string;
	@attr({ type: Number, defaultValue: 0 }) a4: number;
	@attr({ type: Number }) a5?: number;
	@attr({ type: Boolean }) a6: boolean;
	@attr({ source: 'data-mode' }) a7?: Mode;
	@attr({ defaultValue: 'a' }) a8: Mode;
	@attr({ converter: { fromAttribute: (v) => (v ? Number(v) : 0) } }) a9: number;
	@attr({ converter: { fromAttribute: (v) => (v === 'b' ? 'b' : 'a') } }) a10: Mode;
	@attr<number>({ type: Number, defaultValue: 0 }) a11: number;

	@state s1 = 0;
	@state s2: string[] = [];
	@state s3?: Mode;
	@state s4: Mode = 'a';

	@signal g1!: WritableSignal<number>;
	@signal() g2!: WritableSignal<number | undefined>;
	@signal({ initial: 0 }) g3!: WritableSignal<number>;
	@signal({ initial: 'a' }) g4!: WritableSignal<Mode>;
	@signal({ initial: [] }) g5!: WritableSignal<string[]>;
	@signal({ source: count }) g6!: WritableSignal<number>;
	@signal({ source: () => count }) g7!: WritableSignal<number>;
	@signal<Mode>({ initial: 'a' }) g8!: WritableSignal<Mode>;

	@bindTo({ attr: 'aria-label' }) @state b1 = '';
	@bindTo({ attr: 'data-n', map: (v) => String(v) }) @state b2 = 0;
	@bindTo([{ attr: 'data-mode' }, { attr: 'title', map: (v) => String(v) }]) @state b3: Mode = 'a';
	@bindTo<WritableSignal<number>>({ attr: 'data-n', map: (v) => v.toFixed() })
	@signal<number>({ initial: 0 })
	b4!: WritableSignal<number>;

	@fromStore(cartStore, (s) => s.n) f1!: number;
	@fromStore(cartStore) f2!: { n: number; label: string };
	@bindTo<number>({ attr: 'data-n', map: (v) => v.toFixed() })
	@fromStore(cartStore, (s) => s.n)
	f3!: number;
	@fromStore(zustandStore, (s) => s.n) f4!: number;
	@fromStore(zustandHook, (s) => s.n) f5!: number;
	@fromStore(reduxStore, (s) => s.user) f6!: string;
	@fromStore(cartStore, (s) => s.label, { equals: (a, b) => a.toLowerCase() === b.toLowerCase() }) f7!: string;
	// @ts-expect-error a store needs getSnapshot or getState
	@fromStore({ subscribe: () => () => {} }) f8!: unknown;
}

export class ValidControllerFields extends RadiantController {
	@prop({ type: Number, defaultValue: 0 }) p1: number;
	@prop({ type: Number }) p2?: number;
	@prop({ type: String, defaultValue: 'a' }) p3: Mode;
	@prop({ type: Array, defaultValue: [] }) p4: string[];
	@prop({ type: Object }) p5?: { a: number };
	@prop({ type: Number, defaultValue: 0 }) p6 = 0;
	@prop({ type: Object, transform: { fromProperty: (v) => v as { a: number } } }) p7?: { a: number };
	@prop<Mode>({ type: String, defaultValue: 'a' }) p8: Mode;
	@prop<number | undefined>({ type: Number }) p9?: number;

	@attr() a1?: string;
	@attr() a2: string | undefined;
	@attr({ defaultValue: '' }) a3: string;
	@attr({ type: Number, defaultValue: 0 }) a4: number;
	@attr({ type: Number }) a5?: number;
	@attr({ type: Boolean }) a6: boolean;
	@attr({ source: 'data-mode' }) a7?: Mode;
	@attr({ defaultValue: 'a' }) a8: Mode;
	@attr({ converter: { fromAttribute: (v) => (v ? Number(v) : 0) } }) a9: number;
	@attr({ converter: { fromAttribute: (v) => (v === 'b' ? 'b' : 'a') } }) a10: Mode;
	@attr<number>({ type: Number, defaultValue: 0 }) a11: number;

	@state s1 = 0;
	@state s2: string[] = [];
	@state s3?: Mode;
	@state s4: Mode = 'a';

	@signal g1!: WritableSignal<number>;
	@signal() g2!: WritableSignal<number | undefined>;
	@signal({ initial: 0 }) g3!: WritableSignal<number>;
	@signal({ initial: 'a' }) g4!: WritableSignal<Mode>;
	@signal({ initial: [] }) g5!: WritableSignal<string[]>;
	@signal({ source: count }) g6!: WritableSignal<number>;
	@signal({ source: () => count }) g7!: WritableSignal<number>;
	@signal<Mode>({ initial: 'a' }) g8!: WritableSignal<Mode>;

	@bindTo({ attr: 'aria-label' }) @state b1 = '';
	@bindTo({ attr: 'data-n', map: (v) => String(v) }) @state b2 = 0;
	@bindTo([{ attr: 'data-mode' }, { attr: 'title', map: (v) => String(v) }]) @state b3: Mode = 'a';
	@bindTo<WritableSignal<number>>({ attr: 'data-n', map: (v) => v.toFixed() })
	@signal<number>({ initial: 0 })
	b4!: WritableSignal<number>;

	@fromStore(cartStore, (s) => s.n) f1!: number;
	@fromStore(cartStore) f2!: { n: number; label: string };
}
