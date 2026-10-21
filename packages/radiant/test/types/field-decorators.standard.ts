/**
 * Field decorator forms that only standard decorators can check, because they
 * depend on the declared field type.
 *
 * @remarks
 * Typecheck only. Each `@ts-expect-error` row must fail, so an unused directive
 * means the decorator stopped checking the field type. The remaining rows rely
 * on the field type for contextual typing. Forms that must compile in both
 * decorator modes live in `field-decorators.ts`.
 */
import { state as createState, type WritableSignal } from '@ecopages/signals';
import { RadiantController } from '../../src/core/radiant-controller';
import { RadiantElement } from '../../src/core/radiant-element';
import { attr } from '../../src/decorators/attr';
import { bindTo } from '../../src/decorators/bind-to';
import { prop } from '../../src/decorators/prop';
import { signal } from '../../src/decorators/signal';
import { state } from '../../src/decorators/state';

type Mode = 'a' | 'b';

const label = createState('');

export class StandardElementFields extends RadiantElement {
	// @ts-expect-error defaultValue disagrees with the field
	@prop({ type: Number, defaultValue: 0 }) p1: string;
	// @ts-expect-error defaultValue disagrees with the initializer
	@prop({ type: String, defaultValue: '' }) p2 = 5;
	// @ts-expect-error transform output disagrees with the field
	@prop({ type: String, transform: { fromAttribute: (v) => Number(v) } }) p3: string;
	// @ts-expect-error defaultValue is outside the literal union
	@prop({ type: String, defaultValue: 'c' }) p4: Mode;

	// @ts-expect-error defaultValue disagrees with the field
	@attr({ defaultValue: 0 }) a1: string;
	// @ts-expect-error converter output disagrees with the field
	@attr({ converter: { fromAttribute: (v) => v } }) a2: number;

	// @ts-expect-error initial disagrees with the signal value
	@signal({ initial: 'x' }) g1!: WritableSignal<number>;
	// @ts-expect-error source holds another value type
	@signal({ source: label }) g2!: WritableSignal<number>;
	// @ts-expect-error source factory returns another value type
	@signal({ source: () => label }) g3!: WritableSignal<number>;

	@bindTo({ attr: 'data-n', map: (v) => v.toFixed() }) @state b1 = 0;
	@bindTo([{ attr: 'data-mode' }, { attr: 'title', map: (v) => v.toUpperCase() }]) @state b2: Mode = 'a';
	// @ts-expect-error map receives the field type, a string
	@bindTo({ attr: 'data-n', map: (v) => v.toFixed() }) @state b3 = '';
}

export class StandardControllerFields extends RadiantController {
	// @ts-expect-error defaultValue disagrees with the field
	@prop({ type: Number, defaultValue: 0 }) p1: string;
	// @ts-expect-error defaultValue disagrees with the initializer
	@prop({ type: String, defaultValue: '' }) p2 = 5;
	// @ts-expect-error transform output disagrees with the field
	@prop({ type: String, transform: { fromAttribute: (v) => Number(v) } }) p3: string;
	// @ts-expect-error defaultValue is outside the literal union
	@prop({ type: String, defaultValue: 'c' }) p4: Mode;

	// @ts-expect-error defaultValue disagrees with the field
	@attr({ defaultValue: 0 }) a1: string;
	// @ts-expect-error converter output disagrees with the field
	@attr({ converter: { fromAttribute: (v) => v } }) a2: number;

	// @ts-expect-error initial disagrees with the signal value
	@signal({ initial: 'x' }) g1!: WritableSignal<number>;
	// @ts-expect-error source holds another value type
	@signal({ source: label }) g2!: WritableSignal<number>;
	// @ts-expect-error source factory returns another value type
	@signal({ source: () => label }) g3!: WritableSignal<number>;

	@bindTo({ attr: 'data-n', map: (v) => v.toFixed() }) @state b1 = 0;
	@bindTo([{ attr: 'data-mode' }, { attr: 'title', map: (v) => v.toUpperCase() }]) @state b2: Mode = 'a';
	// @ts-expect-error map receives the field type, a string
	@bindTo({ attr: 'data-n', map: (v) => v.toFixed() }) @state b3 = '';
}
