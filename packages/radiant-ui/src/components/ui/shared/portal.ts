export type PortalHandle = {
	unmount: () => void;
};

/**
 * Moves `node` into `container`, leaving a placeholder to restore DOM order on unmount.
 */
export function mountPortal(node: HTMLElement, container: ParentNode = document.body): PortalHandle {
	const parent = node.parentNode;
	if (!parent) {
		return { unmount: () => {} };
	}

	const placeholder = document.createComment('rui-portal');
	parent.insertBefore(placeholder, node);
	container.appendChild(node);

	return {
		unmount: () => {
			const restoreParent = placeholder.parentNode;
			if (!restoreParent) {
				return;
			}
			restoreParent.insertBefore(node, placeholder);
			placeholder.remove();
		},
	};
}
