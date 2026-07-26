import type {
	Args,
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

export type Meta<TCmpOrArgs = Args> = [TCmpOrArgs] extends [RadiantRenderer]
	? ComponentAnnotations<TCmpOrArgs> & {
			parameters?: ComponentAnnotations<TCmpOrArgs>['parameters'] & RadiantStoryParameters;
		}
	: TCmpOrArgs extends (args: infer TArgs) => unknown
		? ComponentAnnotations<RadiantRenderer, TArgs> & {
				parameters?: ComponentAnnotations<RadiantRenderer, TArgs>['parameters'] & RadiantStoryParameters;
			}
		: ComponentAnnotations<RadiantRenderer, TCmpOrArgs> & {
				parameters?: ComponentAnnotations<RadiantRenderer, TCmpOrArgs>['parameters'] & RadiantStoryParameters;
			};

export type StoryObj<TMetaOrArgs = Args> = TMetaOrArgs extends { component?: infer TComponent }
	? TComponent extends (args: infer TArgs) => unknown
		? StoryAnnotations<RadiantRenderer, TArgs>
		: StoryAnnotations<RadiantRenderer, TMetaOrArgs>
	: StoryAnnotations<RadiantRenderer, TMetaOrArgs>;

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
