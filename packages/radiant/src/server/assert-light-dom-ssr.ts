export type LightDomSsrCheckable = {
	readonly renderRootMode: unknown;
	readonly constructor?: Function;
};

/**
 * Radiant host SSR is light-DOM only. Shadow-mode hosts render into an open
 * shadow root on the client; the server pipeline does not emit declarative
 * shadow roots and must not silently serialize view HTML as light-DOM children.
 */
export function assertLightDomSsrSupported(component: LightDomSsrCheckable): void {
	if (component.renderRootMode !== 'shadow') {
		return;
	}

	const name =
		typeof component.constructor === 'function' && component.constructor.name
			? component.constructor.name
			: 'RadiantElement';

	throw new Error(
		`${name} uses renderRootMode "shadow". Radiant SSR is light-DOM only; keep renderRootMode "light" for server rendering, or skip SSR for this host.`,
	);
}
