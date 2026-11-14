type Mount = (root: HTMLElement) => () => void;

const mounts = new Map<string, Mount>();
const mounted = new Map<HTMLElement, () => void>();

/**
 * Mounts every registered example that is on the page and not mounted yet, and runs the cleanup of the ones that
 * left it.
 *
 * @remarks
 * Safe to call at any time: an element is mounted once. The docs site calls it on `eco:page-load` and
 * `eco:after-swap` because the router swaps in new example elements while a page script, a module, never runs
 * again.
 */
export function syncExamples(): void {
	for (const [root, cleanup] of mounted) {
		if (!root.isConnected) {
			cleanup();
			mounted.delete(root);
		}
	}
	for (const [name, mount] of mounts) {
		for (const root of document.querySelectorAll<HTMLElement>(`[data-example="${name}"]`)) {
			if (!mounted.has(root)) {
				mounted.set(root, mount(root));
			}
		}
	}
}

/**
 * Registers how to start the example named `name` and mounts the elements already on the page.
 *
 * @param mount - Wires one `[data-example="<name>"]` element and returns what undoes it. Called once per element.
 */
export function mountExample(name: string, mount: Mount): void {
	mounts.set(name, mount);
	syncExamples();
}

document.addEventListener('eco:page-load', syncExamples);
document.addEventListener('eco:after-swap', syncExamples);
