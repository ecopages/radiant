/**
 * Returns whether a tag name marks the root of a custom-element subtree that
 * flat hydration should not descend into.
 *
 * @remarks Matches the template-root custom-element detection used when collecting
 * JSX hydration bindings with `skipNestedCustomElementRoots`.
 *
 * @param localName Lowercase tag name of the candidate subtree root.
 */
export function shouldSkipHydrationSubtree(localName: string): boolean {
	return localName.includes('-');
}
