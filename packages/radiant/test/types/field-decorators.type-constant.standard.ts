/**
 * `type` constant forms on `@prop` and `@attr` that only standard decorators can
 * reject, because they depend on the declared field type.
 *
 * @remarks
 * Typecheck only. Each `@ts-expect-error` row must fail, so an unused directive
 * means the `type` constant stopped constraining the field. Forms that both
 * decorator modes check live in `field-decorators.type-constant.ts`.
 */
import { RadiantElement } from '../../src/core/radiant-element';
import { attr } from '../../src/decorators/attr';
import { prop } from '../../src/decorators/prop';

export class StandardTypeConstantFields extends RadiantElement {
	// @ts-expect-error a Number attribute parses to a number, not a string
	@prop({ type: Number }) p1?: string;
	// @ts-expect-error a Boolean attribute parses to a boolean, not a string
	@prop({ type: Boolean, defaultValue: 'x' }) p2: string;
	// @ts-expect-error a field of two parsed types fits no single constant
	@prop({ type: Number }) p3: string | number;
	// @ts-expect-error the parser owns the value type, and it returns a number
	@prop({ type: Number, transform: { fromAttribute: (v) => Number(v) } }) p4: string;
	// @ts-expect-error an Object attribute rejects arrays at runtime
	@prop({ type: Object, defaultValue: [] }) p5: string[];
	// @ts-expect-error a transform without fromAttribute leaves the constant checked
	@prop({ type: Number, transform: { fromProperty: (v) => String(v) } }) p6: string;

	// @ts-expect-error a Number attribute parses to a number, not a string
	@attr({ type: Number }) a1?: string;
	// @ts-expect-error defaultValue disagrees with the boolean field
	@attr({ type: Boolean, defaultValue: 0 }) a2: boolean;
	// @ts-expect-error an Array attribute parses to an array, not a string
	@attr({ type: Array }) a3: string;
	// @ts-expect-error a converter without fromAttribute leaves the constant checked
	@attr({ type: Number, converter: { toAttribute: (v) => v } }) a4: string;
	// @ts-expect-error without a type constant the attribute stays a string, not a number
	@attr({ source: 'data-count' }) a5: number;
	// @ts-expect-error without a type constant the attribute stays a string, not a number
	@attr() a6?: number;
	// @ts-expect-error a defaultValue does not parse the attribute, so the field cannot be a number
	@attr({ defaultValue: 0 }) a7: number;
	// @ts-expect-error without a type constant the attribute stays a string, not a boolean
	@attr() a8?: boolean;
	// @ts-expect-error a field of two parsed types fits no constant, so it needs a parser
	@attr() a9: string | number;
	// @ts-expect-error a field of a string literal and a number fits no constant, so it needs a parser
	@attr({ defaultValue: 'a' }) a10: 'a' | 1;
}

export class StandardGenericHostFields<V extends string> extends RadiantElement {
	@attr() v1?: V;
	@attr({ source: 'data-value' }) v2: V | null;
}
