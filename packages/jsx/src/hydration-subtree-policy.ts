/**
 * Returns whether a DOM element marks the root of a custom-element subtree that
 * flat hydration should not descend into.
 *
 * @remarks Matches the template-root custom-element detection used when collecting
 * JSX hydration bindings with `skipNestedCustomElementRoots`.
 */
export function shouldSkipHydrationSubtree(element: Element): boolean {
	return element.localName.includes('-');
}
