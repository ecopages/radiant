import type { JsxRenderable } from '@ecopages/jsx';

export type RenderedComponentAsset =
	| {
			/** Browser module specifier that must be loaded to activate the fragment. */
			kind: 'script-module';
			/** Runtime loading policy for the module. */
			stage?: 'hydrate' | 'idle' | 'immediate';
			/** Module specifier or browser-importable URL. */
			src: string;
	  }
	| {
			/** Module graph preload hint for adapters that control the document head. */
			kind: 'modulepreload';
			/** Module specifier or browser-importable URL. */
			href: string;
	  }
	| {
			/** Stylesheet dependency required by the rendered fragment. */
			kind: 'style';
			/** Browser-importable stylesheet URL. */
			href: string;
			/** Optional media query applied to the stylesheet link. */
			media?: string;
	  };

/** Creates a module asset entry for a rendered fragment. */
export function scriptModuleAsset(
	src: string,
	stage: 'hydrate' | 'idle' | 'immediate' = 'hydrate',
): RenderedComponentAsset {
	return { kind: 'script-module', src, stage };
}

/** Creates a modulepreload hint for a rendered fragment. */
export function modulePreloadAsset(href: string): RenderedComponentAsset {
	return { kind: 'modulepreload', href };
}

/** Creates a stylesheet asset entry for a rendered fragment. */
export function styleAsset(href: string, media?: string): RenderedComponentAsset {
	return media ? { kind: 'style', href, media } : { kind: 'style', href };
}

/** Portable metadata for a server-rendered custom-element fragment. */
export type RenderedComponentMetadata = {
	/** Asset dependencies required by the rendered fragment. */
	assets: readonly RenderedComponentAsset[];
	/** Browser-importable client module URL used to register the component before hydration. */
	clientModuleUrl?: string;
	/** ISO timestamp describing when the fragment was rendered. */
	generatedAt: string;
	/** Custom-element tag name emitted at the fragment root. */
	tagName: string;
};

/** Canonical server render result returned by `renderComponent()`. */
export type RenderedComponent = {
	/** Serialized custom-element host markup. */
	markup: string;
	/** Transport-agnostic metadata that adapters can map onto headers or JSON. */
	metadata: RenderedComponentMetadata;
	/** JSX-compatible preview value that can be embedded into a larger SSR shell. */
	preview: JsxRenderable;
};

/** Serializable metadata for a server-rendered custom-element fragment. */
export type RenderedComponentPayload = {
	/** Asset dependencies required by the rendered fragment. */
	assets?: readonly RenderedComponentAsset[];
	/** Browser-importable client module URL used to register the component before hydration. */
	clientModuleSrc?: string;
	/** ISO timestamp describing when the fragment was rendered. */
	generatedAt: string;
	/** Serialized custom-element host markup. */
	markup: string;
	/** Custom-element tag name emitted at the fragment root. */
	tagName: string;
};

/** Full SSR result including a JSX-compatible preview value for shell composition. */
export type RenderedComponentWithPreview = RenderedComponentPayload & {
	/** JSX-compatible preview value that can be embedded into a larger SSR shell. */
	preview: JsxRenderable;
};
