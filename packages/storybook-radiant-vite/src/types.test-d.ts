/**
 * Type-level regression tests for the CSF surface.
 *
 * @remarks
 * Checked by `tsc --noEmit -p tsconfig.json` (this file is inside `include`), not by the
 * vitest run. These exist because the previous `radiantMeta()` helper silently degraded
 * `TArgs` to `Args`: `Meta<T>` is a conditional type, so TypeScript cannot infer `T` from
 * a parameter typed by it. Authors must use `satisfies` instead.
 */
import { expectTypeOf } from 'vitest';
import type { Meta, RadiantAuthoredParameters, RadiantDerivedParameters, StoryObj } from './types';

type ButtonProps = {
	variant?: 'solid' | 'outline';
	size?: 'sm' | 'md';
	label: string;
	disabled?: boolean;
};

const Button = (props: ButtonProps) => `<button>${props.label}</button>`;

class ButtonElement {
	static observedAttributes = [];
}
const ButtonHost = ButtonElement as unknown as CustomElementConstructor;

/* -------------------------------------------------------------------------- */
/* Meta<typeof view> derives args from the view's props                        */
/* -------------------------------------------------------------------------- */

const meta = {
	title: 'Components/Button',
	component: Button,
	parameters: { radiant: { element: ButtonHost, cssImports: ['./button.css'] } },
	args: { variant: 'solid', label: 'Save' },
	argTypes: {
		variant: { control: { type: 'select' }, options: ['solid', 'outline'] },
	},
	render: (args) => {
		expectTypeOf(args).toEqualTypeOf<ButtonProps>();
		return Button(args);
	},
} satisfies Meta<typeof Button>;

expectTypeOf(meta.args).toEqualTypeOf<{ variant: 'solid'; label: string }>();

// `satisfies` preserves the literal, so `StoryObj<typeof meta>` can read `component`.
expectTypeOf(meta.component).toEqualTypeOf<typeof Button>();

/* Presentational and view-typed hosts are valid — element is not CE-only. */
const presentational = {
	component: Button,
	parameters: { radiant: { cssImports: ['./button.css'] } },
} satisfies Meta<typeof Button>;
void presentational;

const viewAsHost = {
	component: Button,
	parameters: { radiant: { element: Button } },
} satisfies Meta<typeof Button>;
void viewAsHost;

/* -------------------------------------------------------------------------- */
/* Meta rejects what it used to wave through                                   */
/* -------------------------------------------------------------------------- */

// @ts-expect-error -- `nope` is not a prop of ButtonProps
const badArgTypeKey = { component: Button, argTypes: { nope: { control: { type: 'text' } } } } satisfies Meta<
	typeof Button
>;

// @ts-expect-error -- 'ghost' is not a ButtonProps['variant']
const badArgValue = { component: Button, args: { variant: 'ghost' } } satisfies Meta<typeof Button>;

// @ts-expect-error -- 'sometimes' is not a RadiantRenderMode
const badRenderMode = { component: Button, parameters: { radiant: { renderMode: 'sometimes' } } } satisfies Meta<
	typeof Button
>;

const badRenderUsage = {
	component: Button,
	// @ts-expect-error -- `args` is contextually typed, so unknown props are rejected
	render: (args) => args.notAProp,
} satisfies Meta<typeof Button>;

void badArgTypeKey;
void badArgValue;
void badRenderMode;
void badRenderUsage;

/* -------------------------------------------------------------------------- */
/* A CustomElementConstructor must not leak in as the args type                */
/* -------------------------------------------------------------------------- */

const hostMeta = {
	component: ButtonHost,
	args: { anything: true },
} satisfies Meta<typeof ButtonHost>;

// Falls back to `Args`, not `{ observedAttributes: [] }`.
expectTypeOf<NonNullable<Meta<typeof ButtonHost>['args']>>().toExtend<Record<string, unknown>>();
void hostMeta;

/* -------------------------------------------------------------------------- */
/* StoryObj<typeof meta>                                                       */
/* -------------------------------------------------------------------------- */

type Story = StoryObj<typeof meta>;

const story: Story = {
	args: { variant: 'outline' },
	parameters: { radiant: { renderMode: 'ssr-hydrate' } },
	render: (args) => {
		expectTypeOf(args).toEqualTypeOf<ButtonProps>();
		return Button(args);
	},
};
void story;

// `label` is required on ButtonProps but supplied by `meta.args`, so stories may omit it.
const inheritsMetaArgs: Story = { args: { size: 'sm' } };
void inheritsMetaArgs;

const badStory: Story = {
	// @ts-expect-error -- 'ghost' is not a ButtonProps['variant']
	args: { variant: 'ghost' },
};
void badStory;

const badStoryParameters: Story = {
	// @ts-expect-error -- `parameters.radiant` is typed on stories too, not `any`
	parameters: { radiant: { renderMode: 'nope' } },
};
void badStoryParameters;

/* -------------------------------------------------------------------------- */
/* `radiant` is closed; the rest of `parameters` stays open for addons         */
/* -------------------------------------------------------------------------- */

/* `radiant` is the framework's SSR contract, not a scratch namespace for project config. */
const projectKeyUnderRadiant = {
	component: Button,
	// @ts-expect-error -- not a framework field; decorator options go to a decorator factory
	parameters: { radiant: { dialogStage: { trigger: false } } },
} satisfies Meta<typeof Button>;
void projectKeyUnderRadiant;

const typoedFieldUnderRadiant: Story = {
	// @ts-expect-error -- stories are closed under `radiant` too, not just meta
	parameters: { radiant: { renderMoed: 'ssr-hydrate' } },
};
void typoedFieldUnderRadiant;

/* Addon and project parameters pass — the framework has no opinion about them, and an
   `unknown` index keeps `parameters.radiant` typed where Storybook's `any` index would not. */
const addonParameters = {
	component: Button,
	parameters: {
		layout: 'centered',
		docs: { description: { component: 'A button.' } },
		controls: { exclude: ['label'] },
		a11y: { test: 'off' },
		chromatic: { viewports: [320] },
		radiant: { element: ButtonHost },
	},
} satisfies Meta<typeof Button>;
void addonParameters;

/* -------------------------------------------------------------------------- */
/* Derived fields stay overridable, and both halves land on one flat object    */
/* -------------------------------------------------------------------------- */

const derivedOverrides = {
	component: Button,
	parameters: {
		radiant: {
			renderMode: 'ssr-hydrate',
			element: ButtonHost,
			cssImports: ['./button.css'],
			ssrModule: '/src/components/button.script.tsx',
			ssrExport: 'RuiButton',
			storyExport: 'Default',
		},
	},
} satisfies Meta<typeof Button>;
void derivedOverrides;

/* Authoring and derived fields are reachable through one flat `radiant` object. */
expectTypeOf<NonNullable<NonNullable<Meta<typeof Button>['parameters']>['radiant']>>().toExtend<{
	renderMode?: RadiantAuthoredParameters['renderMode'];
	ssrModule?: RadiantDerivedParameters['ssrModule'];
}>();

/* -------------------------------------------------------------------------- */
/* StoryObj<Props> still works for the bare-args form                          */
/* -------------------------------------------------------------------------- */

const bareArgsStory: StoryObj<ButtonProps> = {
	args: { label: 'Save' },
	render: (args) => {
		expectTypeOf(args).toEqualTypeOf<ButtonProps>();
		return Button(args);
	},
};
void bareArgsStory;
