/** Whether the story canvas is showing markup-only SSR inside a sandboxed iframe. */
export function isStaticSsrPreview(canvasElement: HTMLElement): boolean {
	return Boolean(
		canvasElement.querySelector('iframe.radiant-ssr-static-frame') ||
			canvasElement.ownerDocument.defaultView?.frameElement?.classList.contains('radiant-ssr-static-frame'),
	);
}
