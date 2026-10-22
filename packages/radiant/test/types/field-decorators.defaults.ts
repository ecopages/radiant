/**
 * `defaultValue` forms on `@prop` and `@attr` that both decorator modes accept.
 *
 * @remarks
 * Typecheck only: `tsconfig.json` checks this file with standard decorators and
 * `test/types/tsconfig.legacy.json` checks it with legacy decorators. These rows
 * pair with the runtime tests in `test/decorators/default-value.browser.test.ts`:
 * a `null` default and a parser-owned default load without throwing. Forms whose
 * rejection needs the declared field type live in `field-decorators.defaults.standard.ts`.
 */
import { RadiantElement } from '../../src/core/radiant-element';
import { attr } from '../../src/decorators/attr';
import { prop } from '../../src/decorators/prop';

export class ValidDefaultFields extends RadiantElement {
	@prop({ type: Number, defaultValue: null }) p1: number | null;
	@prop({ type: String, defaultValue: 0, transform: { fromAttribute: (v) => Number(v) } }) p2: number;

	@attr({ type: Number, defaultValue: null }) a1: number | null;
	@attr({ type: String, defaultValue: 0, converter: { fromAttribute: (v) => Number(v) } }) a2: number;
}
