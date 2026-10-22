/**
 * `defaultValue` forms on `@prop` and `@attr` that only standard decorators can
 * reject, because they depend on the declared field type.
 *
 * @remarks
 * Typecheck only. Each `@ts-expect-error` row must fail, so an unused directive
 * means `defaultValue` stopped being checked against the field. Accepted forms that
 * both decorator modes check live in `field-decorators.defaults.ts`.
 */
import { RadiantElement } from '../../src/core/radiant-element';
import { attr } from '../../src/decorators/attr';
import { prop } from '../../src/decorators/prop';

export class StandardDefaultFields extends RadiantElement {
	// @ts-expect-error a null default needs a field that allows null
	@prop({ type: Number, defaultValue: null }) p1: number;
	// @ts-expect-error a parser does not free the default from the field type
	@prop({ type: String, defaultValue: 'x', transform: { fromAttribute: (v) => Number(v) } }) p2: number;

	// @ts-expect-error a null default needs a field that allows null
	@attr({ type: Number, defaultValue: null }) a1: number;
	// @ts-expect-error a parser does not free the default from the field type
	@attr({ type: String, defaultValue: 'x', converter: { fromAttribute: (v) => Number(v) } }) a2: number;
}
