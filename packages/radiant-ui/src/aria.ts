import type { AriaAttributesNormalized } from '@ecopages/jsx';

/**
 * Adds a fallback `aria-label` to the structured ARIA channel.
 *
 * @remarks
 * Direct `aria-label` remains separate and wins during JSX normalization.
 * Existing structured ARIA fields are preserved, including `aria.labelledby`.
 *
 * @see https://www.w3.org/TR/wai-aria/#aria-labelledby
 */
export function withDefaultAriaLabel(
	aria: Partial<AriaAttributesNormalized> | undefined,
	fallback?: AriaAttributesNormalized['label'],
): Partial<AriaAttributesNormalized> | undefined {
	if (fallback === undefined || aria?.label !== undefined) {
		return aria;
	}

	return { ...aria, label: fallback };
}
