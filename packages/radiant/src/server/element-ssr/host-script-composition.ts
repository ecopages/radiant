/**
 * Host script composition for Radiant SSR.
 *
 * This module owns the mode-sensitive ordering and inclusion rules for the
 * script payloads that appear inside a server-rendered Element Host.
 *
 * ## Composition rules
 *
 * | Mode      | Order                                                           |
 * |-----------|-----------------------------------------------------------------|
 * | `plain`   | view content → authored hydration markup → slot projection      |
 * | `hydrate` | view content → slot projection → hydration binding scripts      |
 *
 * In **plain** mode, authored hydration markup (script tags pre-authored on the
 * host) is preserved because the component may rely on them for standalone
 * behavior. Hydration binding scripts are omitted because there is no client
 * hydrator to consume them.
 *
 * In **hydrate** mode, authored hydration markup is superseded by the formal
 * hydration binding scripts. Slot projection comes before hydration scripts so
 * the client can reconstruct projected content before binding recovery.
 */

/** Individual content parts that make up a server-rendered host's inner HTML. */
export type HostContentParts = {
	/** The rendered view HTML from `renderViewToString`. */
	hostContent: string;
	/** Authored hydration script markup pre-existing on the host, if any. */
	authoredHydrationMarkup: string;
	/** Slot projection JSON payload script tag, if any. */
	slotProjectionScript: string;
	/** Hydration binding script tags for client-side recovery, if any. */
	hydrationScripts: string;
};

/**
 * Assembles the inner HTML of a server-rendered Element Host from its
 * individual content parts, respecting the mode-sensitive ordering rules.
 *
 * @param parts Individual content parts to compose.
 * @param hydrate Whether the output targets client-side hydration.
 * @returns Assembled inner HTML string.
 */
export function composeHostContent(parts: HostContentParts, hydrate: boolean): string {
	if (!hydrate) {
		return `${parts.hostContent}${parts.authoredHydrationMarkup}${parts.slotProjectionScript}`;
	}

	return `${parts.hostContent}${parts.slotProjectionScript}${parts.hydrationScripts}`;
}
