/**
 * `type` constant forms on `@prop` and `@attr` that both decorator modes must check the same way.
 *
 * @remarks
 * Typecheck only: `tsconfig.json` checks this file with standard decorators and
 * `test/types/tsconfig.legacy.json` checks it with legacy decorators. The plain rows
 * must compile with no explicit generic. The `@ts-expect-error` rows pass the field
 * type explicitly, so legacy mode rejects them too. Forms whose rejection needs the
 * declared field type live in `field-decorators.type-constant.standard.ts`. Forms
 * already listed in `field-decorators.ts` are not repeated here.
 */
import { RadiantElement } from '../../src/core/radiant-element';
import { attr } from '../../src/decorators/attr';
import { prop } from '../../src/decorators/prop';

type Mode = 'a' | 'b';

interface Shape {
	w: number;
}

export class ValidTypeConstantFields extends RadiantElement {
	@prop({ type: Boolean }) p1?: boolean;
	@prop({ type: Boolean, defaultValue: false }) p2: boolean;
	@prop({ type: String, transform: { fromAttribute: (v) => Number(v) } }) p3: number;
	@prop({ type: String, defaultValue: 'a', transform: { fromAttribute: (v) => (v === 'b' ? 'b' : 'a') } }) p4: Mode;
	@prop({ type: Number }) p5: number | null;
	@prop({ type: Array }) p6?: readonly string[];
	@prop({ type: Array, defaultValue: [] }) p7: readonly string[];
	@prop({ type: String, transform: { fromAttribute: (v) => (v === null ? 0 : v) } }) p8: string | number;
	@prop({ type: Object }) p9?: Shape;
	@prop({ type: Object }) p10?: Record<string, unknown> | Shape | null;

	@attr({ type: String }) a1?: string;
	@attr({ type: String, converter: { fromAttribute: (v) => Number(v) } }) a2: number;
	@attr({ type: Array, defaultValue: [] }) a3: string[];
	@attr({ type: Array, defaultValue: [] }) a4: readonly string[];
	@attr({ source: 'data-state' }) a5: string | null;
	@attr() a6 = '';
	@attr({ converter: { fromAttribute: (v) => Number(v) } }) a7: number;
	@attr({ type: Number }) a8 = 0;
}

export class ExplicitTypeConstantFields extends RadiantElement {
	// @ts-expect-error an explicit field type is checked against the constant
	@prop<string>({ type: Number }) p1: string;

	// @ts-expect-error an explicit field type is checked against the constant
	@attr<string>({ type: Number }) a1: string;

	// @ts-expect-error an explicit field type that is not a string needs a type constant
	@attr<number>({ defaultValue: 0 }) a2: number;

	// @ts-expect-error an explicit field type that is not a string needs a type constant
	@attr<number | undefined>() a3?: number;
}
