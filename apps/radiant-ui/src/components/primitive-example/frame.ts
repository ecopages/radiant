/** What decides how an example frame is marked; see {@link frameAttributes}. */
export type FrameOptions = {
	/** Names the example for the page script, which finds its elements under `[data-example="<name>"]`. */
	name?: string;
	/**
	 * Marks the frame as holding one root element: a custom element, a Radiant form that runs itself on connect, or
	 * an example's own `<div data-example>` that a page script mounts. The root takes no box of its own unless a
	 * stylesheet gives it one, so its children lay out in the frame.
	 */
	host?: boolean;
	/** `stack` lays the children out as one full-width column instead of a wrapping row. */
	layout?: 'stack';
};

/**
 * The attributes of an example frame, kept apart from the component so a browser test can build the frame the page
 * renders.
 */
export function frameAttributes({ name, host, layout }: FrameOptions): Record<string, string> {
	const attributes: Record<string, string> = { class: 'primitive-example unstyled' };
	if (name !== undefined) attributes['data-example'] = name;
	if (layout !== undefined) attributes['data-layout'] = layout;
	if (host) attributes['data-host'] = '';
	return attributes;
}
