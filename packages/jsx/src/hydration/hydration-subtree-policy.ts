/**
 * Returns whether a tag name marks the root of a custom-element subtree that
 * parent hydration should not descend into.
 *
 * @remarks Matches the template-root custom-element detection used when collecting
 * JSX hydration bindings with `skipNestedCustomElementRoots`. The custom element
 * reconnects its own host; walking it from the parent would consume markers that
 * were never emitted in that namespace.
 *
 * @param localName Lowercase tag name of the candidate subtree root.
 */
export function shouldSkipHydrationSubtree(localName: string): boolean {
	return localName.includes('-');
}
