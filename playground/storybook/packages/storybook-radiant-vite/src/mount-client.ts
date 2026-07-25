import { createRoot, type JsxRenderable } from '@ecopages/jsx';
import { isTemplateResultLike } from '@ecopages/jsx/jsx-runtime';
import { uninstallRadiantHydrator } from '@ecopages/radiant/client/hydrator';
import { loadRadiantDomModules } from 'virtual:radiant/dom-module-registry';
import { clearSsrInjectedStyles } from './mount-ssr';
import { simulatePageLoad } from 'storybook/preview-api';
import { dedent } from 'ts-dedent';
import { ensureRootInner, getMountedRoot, setMountedRoot, teardownCanvas } from './canvas';

type ShowError = (error: { title: string; description: string }) => void;

/**
 * Mount a client-mode story result into the canvas.
 */
export async function mountClientResult(options: {
	canvasElement: HTMLElement;
	element: unknown;
	forceRemount: boolean;
	storyName: string;
	storyKind: string;
	showError: ShowError;
}): Promise<void> {
	const { canvasElement, element, forceRemount, storyName, storyKind, showError } = options;

	const finishMount = async (scope: ParentNode) => {
		await loadRadiantDomModules(scope);
		await Promise.resolve();
		simulatePageLoad(canvasElement);
	};

	uninstallRadiantHydrator();
	clearSsrInjectedStyles();

	if (element == null) {
		teardownCanvas(canvasElement);
		return;
	}

	if (typeof element === 'string') {
		teardownCanvas(canvasElement);
		canvasElement.innerHTML = element;
		await finishMount(canvasElement);
		return;
	}

	if (typeof Node !== 'undefined' && element instanceof Node) {
		if (canvasElement.firstChild === element && !forceRemount) {
			return;
		}
		teardownCanvas(canvasElement);
		canvasElement.appendChild(element);
		await finishMount(canvasElement);
		return;
	}

	if (isTemplateResultLike(element) || typeof element === 'object') {
		const renderTo = ensureRootInner(canvasElement, forceRemount);
		let root = getMountedRoot(canvasElement);
		if (!root) {
			root = createRoot(renderTo);
			setMountedRoot(canvasElement, root);
		}
		root.render(element as JsxRenderable);
		await finishMount(renderTo);
		return;
	}

	showError({
		title: `Expecting JSX, an HTML snippet, or a DOM node from the story: "${storyName}" of "${storyKind}".`,
		description: dedent`
      Did you forget to return JSX or a DOM node from the story?
      Use a Radiant JSX view, a custom element host, or a string of HTML.
    `,
	});
}
