import type {
	Args,
	ArgsFromMeta,
	ArgsStoryFn,
	Canvas,
	CompatibleString,
	ComponentAnnotations,
	DecoratorFunction,
	ProjectAnnotations,
	StoryAnnotations,
	WebRenderer,
} from 'storybook/internal/types';
import type { BuilderOptions, StorybookConfigVite } from '@storybook/builder-vite';
import type { StorybookConfig as StorybookConfigBase } from 'storybook/internal/types';
import type { JsxRenderable } from '@ecopages/jsx';

export type RadiantRenderMode = 'client' | 'ssr-hydrate' | 'ssr-static';

/**
 * Storybook parameters under `parameters.radiant`.
 *
 * Important: SSR modes talk to the Vite middleware over HTTP.
 * Only JSON-serializable data (`args`, module paths, export names) crosses that boundary.
 * There is no server-side callback hook — put host state in `args`.
 */
export type RadiantStoryParameters = {
	radiant?: {
		/** How the story is mounted in the canvas. Default: `client`. */
		renderMode?: RadiantRenderMode;
		/**
		 * Host custom element backing a JSX `component` view. Omit for presentational views.
		 *
		 * @remarks
		 * Preview-only: the renderer links it onto the view before resolving SSR module
		 * paths, and it never crosses the SSR HTTP boundary (only the resolved string
		 * paths and {@link sanitizeSsrArgs}-filtered args are sent).
		 */
		element?: CustomElementConstructor;
		/**
		 * Component CSS paths relative to the story file (e.g. `['./alert.css']`).
		 *
		 * @remarks
		 * Source-only metadata: the Storybook stamp transform reads these out of the story
		 * source and prepends side-effect `import './x.css'` statements. Never read at
		 * runtime — apps load CSS via `@ecopages/radiant-ui/styles.css`. For story-scoped
		 * extras injected at render time use `withStylesheets` / `parameters.stylesheets`.
		 */
		cssImports?: readonly string[];
		/**
		 * Vite-resolvable module path for SSR (e.g. `/src/components/ssr/counter.script.tsx`).
		 * Inferred automatically from `meta.component` when it links to a `.script` module.
		 */
		ssrModule?: string;
		/**
		 * Named export of the RadiantElement constructor.
		 * Inferred from the linked element class when omitted.
		 */
		ssrExport?: string;
		/**
		 * Browser module URL to import after injecting SSR markup.
		 * Defaults to the view module (when present) or SSR response `clientModuleSrc`.
		 */
		clientModule?: string;
		/** Vite-resolvable view module path for authored light-DOM SSR. */
		viewModule?: string;
		/** Named export of the view function in `viewModule`. */
		viewExport?: string;
		/** Vite-resolvable CSF story module path for server-side args resolution. */
		storyModule?: string;
		/** Named story export in `storyModule` (e.g. `Default`). */
		storyExport?: string;
	};
};

export type RadiantComponent =
	| string
	| CustomElementConstructor
	// oxlint-disable-next-line no-explicit-any -- mirrors Storybook's `ComponentType<any>`; arg safety comes from `Meta` inference
	| ((args: any) => JsxRenderable | Node | string | null | undefined);

export interface RadiantTypes {
	component: RadiantComponent;
	storyResult:
		JsxRenderable | Node | string | null | undefined | Promise<JsxRenderable | Node | string | null | undefined>;
	canvas: Canvas;
	canvasElement: HTMLElement;
}

export interface RadiantRenderer extends WebRenderer {
	component: RadiantComponent;
	storyResult: RadiantTypes['storyResult'];
	mount: () => Promise<Canvas>;
}

/** Flatten an intersection into a single object type so editor hovers stay readable. */
type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** Make the keys in `K` optional, leaving the rest of `T` untouched. */
type SetOptional<T, K extends keyof T> = Simplify<Omit<T, K> & Partial<Pick<T, K>>>;

/**
 * Args a `component` annotation contributes.
 *
 * @remarks
 * Non-distributive so a `CustomElementConstructor` (a construct signature, not a call
 * signature) and a bare tag string both fall through to `unknown` instead of leaking the
 * constructor type in as the args type.
 */
type ArgsFromComponent<TComponent> = [TComponent] extends [(args: infer TArgs) => unknown] ? TArgs : unknown;

/**
 * Storybook's `Parameters` is `{ [name: string]: any }`. Intersecting it with
 * {@link RadiantStoryParameters} collapses `radiant` back to `any` — the index signature
 * wins — so `parameters.radiant` goes unchecked. Widen with an `unknown` index instead:
 * arbitrary addon parameters still pass, but `radiant` keeps its real type.
 */
type RadiantParameters = RadiantStoryParameters & { [name: string]: unknown };

type RadiantComponentAnnotations<TArgs> = Omit<ComponentAnnotations<RadiantRenderer, TArgs>, 'parameters'> & {
	parameters?: RadiantParameters;
};

type RadiantStoryAnnotations<TArgs, TRequiredArgs> = Omit<
	StoryAnnotations<RadiantRenderer, TArgs, TRequiredArgs>,
	'parameters'
> & {
	parameters?: RadiantParameters;
};

/**
 * CSF `meta` annotations. Use with `satisfies` so the literal is contextually typed:
 * `const meta = { ... } satisfies Meta<typeof MyView>`.
 *
 * @remarks
 * Do not wrap this in a helper function — `Meta<T>` is a conditional type, so TypeScript
 * cannot infer `T` from a parameter typed by it and would silently fall back to `Args`.
 */
export type Meta<TCmpOrArgs = Args> = [TCmpOrArgs] extends [RadiantRenderer]
	? RadiantComponentAnnotations<Args>
	: [TCmpOrArgs] extends [CustomElementConstructor]
		? RadiantComponentAnnotations<Args>
		: [TCmpOrArgs] extends [(args: infer TArgs) => unknown]
			? RadiantComponentAnnotations<TArgs>
			: RadiantComponentAnnotations<TCmpOrArgs>;

/**
 * CSF story annotations. Pass `typeof meta` so args are derived from `meta.component`,
 * `meta.render` and `meta.decorators`, and args already supplied by `meta.args` become
 * optional on the story.
 */
export type StoryObj<TMetaOrCmpOrArgs = Args> = [TMetaOrCmpOrArgs] extends [
	{
		// oxlint-disable-next-line no-explicit-any -- structural probe; mirrors Storybook's own `StoryObj`
		render?: ArgsStoryFn<RadiantRenderer, any>;
		component?: infer TComponent;
		args?: infer TDefaultArgs;
	},
]
	? Simplify<
			ArgsFromComponent<TComponent> & ArgsFromMeta<RadiantRenderer, TMetaOrCmpOrArgs>
		> extends infer TArgs
		? RadiantStoryAnnotations<TArgs, SetOptional<TArgs, keyof TArgs & keyof TDefaultArgs>>
		: never
	: RadiantStoryAnnotations<TMetaOrCmpOrArgs, Partial<TMetaOrCmpOrArgs>>;

export type StoryFn<TArgs = Args> = ArgsStoryFn<RadiantRenderer, TArgs>;

export type Preview = ProjectAnnotations<RadiantRenderer>;

export type Decorator<TArgs = Args> = DecoratorFunction<RadiantRenderer, TArgs>;

export type FrameworkName = CompatibleString<'@ecopages/storybook-radiant-vite'>;
export type BuilderName = CompatibleString<'@storybook/builder-vite'>;

export type FrameworkOptions = {
	builder?: BuilderOptions;
	/** Global style modules (e.g. Tailwind entry) always loaded for SSR static previews. */
	globalStyleModules?: string[];
};

type StorybookConfigFramework = {
	framework:
		| FrameworkName
		| {
				name: FrameworkName;
				options: FrameworkOptions;
		  };
	core?: StorybookConfigBase['core'] & {
		builder?:
			| BuilderName
			| {
					name: BuilderName;
					options: BuilderOptions;
			  };
	};
};

/** Typed Storybook `main` config for this framework. */
export type StorybookConfig = Omit<StorybookConfigBase, keyof StorybookConfigVite | keyof StorybookConfigFramework> &
	StorybookConfigVite &
	StorybookConfigFramework;

export type { Args };
export type { Renderer } from 'storybook/internal/types';
