/**
 * Pure logic that components are built on, with no DOM at import time and none in the call path
 * except where a function says so. Usable on the server and in tests.
 *
 * @remarks
 * Stateful, element-bound behavior is in `@ecopages/radiant-ui/controllers`. The module is named
 * `helpers.ts`, not `index.ts`, so the package `sideEffects` entry for built `index.js` files does not
 * match the built entry and a bundler can drop what a consumer does not import.
 */
export * from './lib/intl-date';
export * from './lib/intl-number';
export * from './lib/mask';
export { textContains, type TextFilterSensitivity } from './lib/text-filter';
export { cycleValue } from './lib/cycle-value';
export { isCssSafeId, uniqueId } from './lib/unique-id';
export {
	MAX_VALUE_FRACTION_DIGITS,
	SLIDER_PAGE_STEP_MULTIPLIER,
	createNumericRange,
	formatNumericValue,
	fractionDigitsFromStep,
	resolveValuePrecision,
	valueFromSliderKey,
	valuesAlignOnStep,
	type NumericRange,
} from './components/ui/shared/numeric-range';
export { wrapCollectionIndex } from './controllers/collection-navigation';
export { resolveTrapMove, type TrapMove } from './controllers/focus-trap-order';
export {
	findRectIndex,
	reorder,
	resolveContainerKeyIndex,
	resolveInsertIndex,
	resolveSortIndex,
	resolveSortKeyIndex,
	type SortableAxis,
	type SortableRect,
} from './controllers/sortable-order';
export {
	DEFAULT_SWIPE_THRESHOLD_PX,
	resolveSwipeDirection,
	type SwipeAxis,
	type SwipeDirection,
	type SwipeOptions,
} from './controllers/swipe-direction';
