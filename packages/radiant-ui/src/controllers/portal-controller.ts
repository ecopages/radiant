import { bindController, type Controller, type ControllerHost } from './controller';

/** The node a `PortalController` moves and the container it moves it to. */
export type PortalControllerConfig = {
	/** Resolved on every `attach()`; `null` mounts nothing, such as a node the view has not stamped yet. */
	getNode: () => HTMLElement | null;
	/** Where the node goes. Resolved on every `attach()`; `document.body` when omitted. */
	getContainer?: () => ParentNode;
};

const DARK_CLASS = 'dark';
const THEME_ATTRIBUTE = 'data-theme';
const KNOB_PREFIX = '--rui-';

/** What `attach()` put on the node, so `destroy()` takes back exactly that. */
type CarriedTheme = {
	dark: boolean;
	attribute: boolean;
	properties: string[];
};

/**
 * Moves a surface out of its container, for example to `document.body` so it stacks above the page, and puts it
 * back on `destroy()`.
 *
 * @remarks
 * `attach()` leaves a comment where the node was and appends the node to the container, so `destroy()` restores
 * the original position among its siblings. Attaching twice or destroying twice changes nothing.
 *
 * Theming rule: a node that leaves its ancestors loses what they set, so `attach()` carries three things onto
 * the node and `destroy()` removes them again. They are the `dark` class and the `data-theme` attribute of the
 * nearest ancestor that has them, and every `--rui-*` custom property that an ancestor sets inline (nearest wins).
 * Anything the node already has is kept as it is. Stylesheet rules scoped to an ancestor
 * (`.card { --rui-x: ... }`) cannot be listed from the DOM and do not travel; DESIGN.md puts the `--rui-*`
 * defaults and overrides of a portaled surface on the surface class for that reason.
 *
 * `destroy()` skips the move back when something removed the comment in the meantime, such as a re-render of the
 * origin, and still takes the carried theme off the node.
 *
 * @example
 * ```ts
 * const portal = new PortalController({ getNode: () => dialog });
 * portal.attach(); // `dialog` is now a child of `document.body`
 * portal.destroy(); // and back among its old siblings
 * ```
 */
export class PortalController implements Controller {
	private readonly config: PortalControllerConfig;
	private mounted: { node: HTMLElement; placeholder: Comment; theme: CarriedTheme } | null = null;

	constructor(config: PortalControllerConfig) {
		this.config = config;
	}

	get isMounted(): boolean {
		return this.mounted !== null;
	}

	/**
	 * @remarks
	 * Mounts nothing for a node without a parent, such as a surface a re-render replaced: it has no place to
	 * return to, and moving it would leave a stale node in the container for good.
	 */
	attach(): void {
		const node = this.config.getNode();
		if (this.mounted || !node?.parentNode) {
			return;
		}
		const placeholder = document.createComment('rui-portal');
		node.before(placeholder);
		const theme = this.carryTheme(node);
		(this.config.getContainer?.() ?? document.body).appendChild(node);
		this.mounted = { node, placeholder, theme };
	}

	destroy(): void {
		if (!this.mounted) {
			return;
		}
		const { node, placeholder, theme } = this.mounted;
		this.mounted = null;
		if (theme.dark) node.classList.remove(DARK_CLASS);
		if (theme.attribute) node.removeAttribute(THEME_ATTRIBUTE);
		theme.properties.forEach((name) => node.style.removeProperty(name));
		if (placeholder.parentNode) {
			placeholder.replaceWith(node);
		}
	}

	private carryTheme(node: HTMLElement): CarriedTheme {
		const carried: CarriedTheme = { dark: false, attribute: false, properties: [] };
		const seen = new Set<string>();
		for (let ancestor = node.parentElement; ancestor; ancestor = ancestor.parentElement) {
			if (!carried.dark && !node.classList.contains(DARK_CLASS) && ancestor.classList.contains(DARK_CLASS)) {
				node.classList.add(DARK_CLASS);
				carried.dark = true;
			}
			const theme = ancestor.getAttribute(THEME_ATTRIBUTE);
			if (theme !== null && !carried.attribute && !node.hasAttribute(THEME_ATTRIBUTE)) {
				node.setAttribute(THEME_ATTRIBUTE, theme);
				carried.attribute = true;
			}
			for (const name of Array.from(ancestor.style)) {
				if (!name.startsWith(KNOB_PREFIX) || seen.has(name)) continue;
				seen.add(name);
				if (node.style.getPropertyValue(name)) continue;
				node.style.setProperty(name, ancestor.style.getPropertyValue(name));
				carried.properties.push(name);
			}
		}
		return carried;
	}
}

/**
 * Creates a `PortalController` that moves the node when `host` connects and puts it back when it disconnects.
 *
 * @example
 * ```ts
 * // in a RadiantElement subclass
 * createPortalController(this, { getNode: () => this.panel }); // panel moves to document.body while connected
 * ```
 */
export function createPortalController(host: ControllerHost, config: PortalControllerConfig): PortalController {
	return bindController(host, new PortalController(config));
}
