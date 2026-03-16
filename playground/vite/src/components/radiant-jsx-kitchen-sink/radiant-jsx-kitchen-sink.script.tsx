/** @jsxImportSource @ecopages/jsx */

import type { ContextProvider } from '@ecopages/radiant/context/context-provider';
import { consumeContext } from '@ecopages/radiant/context/consume-context';
import { contextSelector } from '@ecopages/radiant/context/context-selector';
import { createContext } from '@ecopages/radiant/context/create-context';
import { provideContext } from '@ecopages/radiant/context/provide-context';
import { RadiantElementJsx } from '@ecopages/radiant/core/radiant-element-jsx';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import { onUpdated } from '@ecopages/radiant/decorators/on-updated';
import { reactiveProp } from '@ecopages/radiant/decorators/reactive-prop';
import { MetricTile, type MetricTileTone } from './metric-tile';

type FeatureId = 'render' | 'events' | 'props' | 'lists';

type FeatureDefinition = {
	id: FeatureId;
	label: string;
	capability: string;
	description: string;
	tone: MetricTileTone;
};

export type RadiantJsxKitchenSinkProps = {
	heading?: string;
	compact?: boolean;
	count?: number;
};

type SinkState = {
	compact: boolean;
	count: number;
	tone: MetricTileTone;
	selectedFeature: FeatureId;
	note: string;
	activity: string[];
};

type MetricDescriptor = {
	id: 'count' | 'mode' | 'channel';
	label: string;
	description: string;
	tone: MetricTileTone;
};

type SinkHeroProps = {
	heading?: string;
	eyebrow?: string;
	description?: string;
};

type SinkMetricsProps = {
	descriptors?: MetricDescriptor[];
};

type SinkFeaturePaletteProps = {
	features?: FeatureDefinition[];
	highlights?: string[];
};

type SinkNoteEditorProps = {
	title?: string;
	helper?: string;
};

const sinkContext = createContext<SinkState>(Symbol('radiant-jsx-kitchen-sink'));

const featureDefinitions: FeatureDefinition[] = [
	{
		id: 'render',
		label: 'render()',
		capability: 'Template diff-free rendering into light DOM',
		description:
			'This panel is fully rendered through RadiantElementJsx.render(). The playground entry only mounts the host element.',
		tone: 'emerald',
	},
	{
		id: 'events',
		label: 'on:* events',
		capability: 'Native DOM event bindings inside JSX',
		description:
			'Buttons, toggles, selects and text inputs in this demo use JSX event bindings instead of decorator wiring.',
		tone: 'sky',
	},
	{
		id: 'props',
		label: 'prop:* bindings',
		capability: 'Property-first bindings for form state',
		description:
			'The note input and JSON preview use property bindings so values stay in sync without relying on reflected attributes.',
		tone: 'amber',
	},
	{
		id: 'lists',
		label: 'Nested lists',
		capability: 'Mapped arrays, fragments and reusable JSX components',
		description:
			'The metric tiles and activity log are generated from arrays and composed with a reusable local component.',
		tone: 'emerald',
	},
];

const metricDescriptors: MetricDescriptor[] = [
	{
		id: 'count',
		label: 'Context count',
		description: 'State changes originate in one child and are reflected in another through context.',
		tone: 'emerald',
	},
	{
		id: 'mode',
		label: 'Layout mode',
		description: 'Consumers react to the shared compact toggle without any direct parent callback chain.',
		tone: 'amber',
	},
	{
		id: 'channel',
		label: 'Focused track',
		description: 'The selected capability drives multiple views at once, mixing prop catalogs with context state.',
		tone: 'sky',
	},
];

const sinkHighlights = [
	'Prop-passed feature catalogs rendered by separate JSX elements.',
	'Context-powered controls, metrics and inspector panels.',
	'Local draft editing that no longer steals focus on every keystroke.',
	'Published Lit compatibility kept separate from the Radiant JSX render path.',
];

const initialSinkState: SinkState = {
	compact: false,
	count: 3,
	tone: 'emerald',
	selectedFeature: 'render',
	note: 'Use the note editor to publish a message into shared context.',
	activity: ['Kitchen sink mounted.', 'Children are connected through context and prop passing.'],
};

const getFeature = (featureId: FeatureId) =>
	featureDefinitions.find((feature) => feature.id === featureId) ?? featureDefinitions[0];

const prependActivity = (activity: string[], message: string) => [message, ...activity].slice(0, 6);

@customElement('radiant-jsx-sink-hero')
export class RadiantJsxSinkHero extends RadiantElementJsx {
	@reactiveProp({ type: String, defaultValue: 'Radiant JSX Kitchen Sink' }) heading!: string;
	@reactiveProp({ type: String, defaultValue: 'Connected JSX sink' }) eyebrow!: string;
	@reactiveProp({
		type: String,
		defaultValue:
			'A cluster of small RadiantElementJsx components sharing context while still exercising prop-driven rendering and reusable JSX helpers.',
	})
	description!: string;

	override connectedCallback() {
		super.connectedCallback();
		this.renderView();
	}

	@onUpdated(['heading', 'eyebrow', 'description'])
	syncView() {
		this.renderView();
	}

	private renderView() {
		this.render(
			<header class="rounded-[2rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.98))] p-6 shadow-sm shadow-slate-200/80 sm:p-8">
				<div class="max-w-3xl space-y-4">
					<p class="inline-flex rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700">
						{this.eyebrow}
					</p>
					<div class="space-y-3">
						<h3 class="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{this.heading}</h3>
						<p class="text-sm leading-7 text-slate-600 sm:text-base">{this.description}</p>
					</div>
				</div>
			</header>,
		);
	}
}

@customElement('radiant-jsx-sink-metrics')
export class RadiantJsxSinkMetrics extends RadiantElementJsx {
	@reactiveProp({ type: Array, defaultValue: [] }) descriptors!: MetricDescriptor[];

	private snapshot: SinkState = initialSinkState;

	override connectedCallback() {
		super.connectedCallback();
		this.renderView();
	}

	@onUpdated('descriptors')
	syncDescriptors() {
		this.renderView();
	}

	@contextSelector({ context: sinkContext })
	onStateChange(snapshot: SinkState) {
		this.snapshot = snapshot;
		this.renderView();
	}

	private renderView() {
		const activeFeature = getFeature(this.snapshot.selectedFeature);

		this.render(
			<div class="grid gap-4 md:grid-cols-3">
				{this.descriptors.map((descriptor) => {
					const value =
						descriptor.id === 'count'
							? this.snapshot.count
							: descriptor.id === 'mode'
								? this.snapshot.compact
									? 'Compact'
									: 'Cozy'
								: activeFeature.label;

					const detail =
						descriptor.id === 'count'
							? this.snapshot.count === 1
								? 'One shared unit is active right now.'
								: `${this.snapshot.count} shared units are flowing through context.`
							: descriptor.id === 'mode'
								? this.snapshot.compact
									? 'Consumers tighten spacing without a parent rerender.'
									: 'Consumers keep the roomy layout while sharing the same state source.'
								: activeFeature.capability;

					return (
						<MetricTile
							label={descriptor.label}
							value={value}
							description={`${descriptor.description} ${detail}`}
							tone={descriptor.tone}
							active={descriptor.id === 'channel'}
						/>
					);
				})}
			</div>,
		);
	}
}

@customElement('radiant-jsx-sink-feature-palette')
export class RadiantJsxSinkFeaturePalette extends RadiantElementJsx {
	@reactiveProp({ type: Array, defaultValue: [] }) features!: FeatureDefinition[];
	@reactiveProp({ type: Array, defaultValue: [] }) highlights!: string[];

	private selectedFeature: FeatureId = initialSinkState.selectedFeature;

	override connectedCallback() {
		super.connectedCallback();
		this.renderView();
	}

	@onUpdated(['features', 'highlights'])
	syncProps() {
		this.renderView();
	}

	@contextSelector({ context: sinkContext, select: (state: SinkState) => state.selectedFeature })
	onSelectedFeature(featureId: FeatureId) {
		this.selectedFeature = featureId;
		this.renderView();
	}

	private renderView() {
		const features = this.features.length > 0 ? this.features : featureDefinitions;
		const highlights = this.highlights.length > 0 ? this.highlights : sinkHighlights;
		const activeFeature = features.find((feature) => feature.id === this.selectedFeature) ?? features[0];

		this.render(
			<section class="grid gap-5 rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/80 sm:p-6">
				<div class="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
					<div class="space-y-3">
						<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
							Feature catalog via props
						</p>
						<div class="flex flex-wrap gap-2">
							{features.map((feature) => (
								<span
									class={[
										'rounded-full border px-3 py-1 text-xs font-medium transition',
										feature.id === this.selectedFeature
											? 'border-slate-900 bg-slate-900 text-white'
											: 'border-slate-200 bg-slate-50 text-slate-600',
									].join(' ')}
								>
									{feature.label}
								</span>
							))}
						</div>
					</div>

					<div class="rounded-[1.5rem] border border-slate-200/80 bg-slate-50 p-5">
						<p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
							Currently focused through context
						</p>
						<h4 class="mt-3 text-xl font-semibold tracking-tight text-slate-950">
							{activeFeature.capability}
						</h4>
						<p class="mt-3 text-sm leading-6 text-slate-600">{activeFeature.description}</p>
					</div>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					{highlights.map((highlight, index) => (
						<div class="rounded-2xl border border-dashed border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] px-4 py-4 text-sm leading-6 text-slate-700 shadow-sm shadow-slate-100/80">
							<p class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
								0{index + 1}
							</p>
							{highlight}
						</div>
					))}
				</div>
			</section>,
		);
	}
}

@customElement('radiant-jsx-sink-controls')
export class RadiantJsxSinkControls extends RadiantElementJsx {
	@consumeContext(sinkContext) sink!: ContextProvider<typeof sinkContext>;

	private snapshot: SinkState = initialSinkState;

	override connectedCallback() {
		super.connectedCallback();
		this.renderView();
	}

	@contextSelector({ context: sinkContext })
	onStateChange(snapshot: SinkState) {
		this.snapshot = snapshot;
		this.renderView();
	}

	private updateContext(update: Partial<SinkState>, activityMessage?: string) {
		const current = this.sink.getContext();
		this.sink.setContext({
			...update,
			...(activityMessage ? { activity: prependActivity(current.activity, activityMessage) } : {}),
		});
	}

	private setTone = (event: Event) => {
		const target = event.target as HTMLSelectElement;
		this.updateContext({ tone: target.value as MetricTileTone }, `Tone changed to ${target.value}.`);
	};

	private toggleCompact = () => {
		this.updateContext(
			{ compact: !this.snapshot.compact },
			`Compact mode ${!this.snapshot.compact ? 'enabled' : 'disabled'}.`,
		);
	};

	private incrementCount = () => {
		this.updateContext({ count: this.snapshot.count + 1 }, `Counter increased to ${this.snapshot.count + 1}.`);
	};

	private decrementCount = () => {
		if (this.snapshot.count === 0) {
			this.updateContext({}, 'Counter is already at zero.');
			return;
		}

		this.updateContext({ count: this.snapshot.count - 1 }, `Counter decreased to ${this.snapshot.count - 1}.`);
	};

	private chooseFeature = (featureId: FeatureId) => {
		this.updateContext({ selectedFeature: featureId }, `Focused on ${featureId}.`);
	};

	private renderView() {
		const chipClass = (featureId: FeatureId) =>
			[
				'rounded-full border px-4 py-2 text-left text-sm font-medium transition',
				this.snapshot.selectedFeature === featureId
					? 'border-slate-900 bg-slate-900 text-white shadow-sm'
					: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
			].join(' ');

		const controlClass =
			'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10';

		this.render(
			<section class="space-y-5 rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/80 sm:p-6">
				<div class="grid gap-3 sm:grid-cols-[minmax(0,12rem)_1fr]">
					<label class="space-y-2">
						<span class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tone</span>
						<select class={controlClass} prop:value={this.snapshot.tone} on:change={this.setTone}>
							<option value="emerald">Emerald</option>
							<option value="sky">Sky</option>
							<option value="amber">Amber</option>
						</select>
					</label>
					<div class="flex flex-wrap items-end gap-3">
						<button
							class="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
							type="button"
							on:click={this.toggleCompact}
						>
							{this.snapshot.compact ? 'Switch to cozy mode' : 'Switch to compact mode'}
						</button>
						<button
							class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
							type="button"
							on:click={this.decrementCount}
							disabled={this.snapshot.count === 0}
						>
							Decrease count
						</button>
						<button
							class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
							type="button"
							on:click={this.incrementCount}
						>
							Increase count
						</button>
					</div>
				</div>

				<div class="space-y-3">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Capability focus</p>
					<div class="flex flex-wrap gap-3">
						{featureDefinitions.map((feature) => (
							<button
								class={chipClass(feature.id)}
								type="button"
								on:click={() => this.chooseFeature(feature.id)}
								aria={{ pressed: this.snapshot.selectedFeature === feature.id ? 'true' : 'false' }}
							>
								{feature.label}
							</button>
						))}
					</div>
				</div>
			</section>,
		);
	}
}

@customElement('radiant-jsx-sink-note-editor')
export class RadiantJsxSinkNoteEditor extends RadiantElementJsx {
	@reactiveProp({ type: String, defaultValue: 'Draft note' }) title!: string;
	@reactiveProp({ type: String, defaultValue: 'Edit locally, then publish into shared context when you are ready.' })
	helper!: string;
	@consumeContext(sinkContext) sink!: ContextProvider<typeof sinkContext>;

	private localDraft = initialSinkState.note;
	private committedNote = initialSinkState.note;

	override connectedCallback() {
		super.connectedCallback();
		this.renderView();
	}

	@onUpdated(['title', 'helper'])
	syncProps() {
		this.renderView();
	}

	@contextSelector({ context: sinkContext, select: (state: SinkState) => state.note })
	onCommittedNote(note: string) {
		this.committedNote = note;
		if (document.activeElement !== this.noteInput) {
			this.localDraft = note;
			this.renderView();
			return;
		}
		this.updateDraftUi();
	}

	private get noteInput() {
		return this.querySelector('[data-ref="note-input"]') as HTMLInputElement | null;
	}

	private get draftMirror() {
		return this.querySelector('[data-ref="draft-mirror"]') as HTMLElement | null;
	}

	private get syncBadge() {
		return this.querySelector('[data-ref="sync-badge"]') as HTMLElement | null;
	}

	private handleInput = (event: Event) => {
		const target = event.target as HTMLInputElement;
		this.localDraft = target.value;
		this.updateDraftUi();
	};

	private publishDraft = () => {
		const current = this.sink.getContext();
		this.sink.setContext({
			note: this.localDraft,
			activity: prependActivity(current.activity, 'Draft note published through context.'),
		});
		this.renderView();
	};

	private restoreDraft = () => {
		this.localDraft = this.committedNote;
		this.renderView();
	};

	private updateDraftUi() {
		if (this.draftMirror) {
			this.draftMirror.textContent =
				this.localDraft || 'Start typing and the field will keep focus while the rest of the sink reacts.';
		}

		if (this.syncBadge) {
			const synced = this.localDraft === this.committedNote;
			this.syncBadge.textContent = synced ? 'Synced to context' : 'Local draft only';
			this.syncBadge.className = synced
				? 'rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700'
				: 'rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700';
		}
	}

	private renderView() {
		this.render(
			<section class="space-y-4 rounded-[1.75rem] border border-slate-200/80 bg-white/95 p-5 shadow-sm shadow-slate-200/80 sm:p-6">
				<div class="flex flex-wrap items-start justify-between gap-3">
					<div class="space-y-2">
						<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Context editor</p>
						<h4 class="text-xl font-semibold tracking-tight text-slate-950">{this.title}</h4>
						<p class="text-sm leading-6 text-slate-600">{this.helper}</p>
					</div>
					<span
						data-ref="sync-badge"
						class="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600"
					>
						Synced to context
					</span>
				</div>

				<label class="space-y-2">
					<span class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Draft</span>
					<input
						data-ref="note-input"
						class="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
						type="text"
						prop:value={this.localDraft}
						on:input={this.handleInput}
					/>
				</label>

				<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Local preview</p>
					<p data-ref="draft-mirror" class="mt-3 text-sm leading-6 text-slate-700">
						{this.localDraft}
					</p>
				</div>

				<div class="flex flex-wrap gap-3">
					<button
						data-ref="publish-note"
						class="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white"
						type="button"
						on:click={this.publishDraft}
					>
						Publish to context
					</button>
					<button
						data-ref="reset-note"
						class="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
						type="button"
						on:click={this.restoreDraft}
					>
						Reset to committed note
					</button>
				</div>
			</section>,
		);

		this.updateDraftUi();
	}
}

@customElement('radiant-jsx-sink-inspector')
export class RadiantJsxSinkInspector extends RadiantElementJsx {
	private snapshot: SinkState = initialSinkState;

	override connectedCallback() {
		super.connectedCallback();
		this.renderView();
	}

	@contextSelector({ context: sinkContext })
	onStateChange(snapshot: SinkState) {
		this.snapshot = snapshot;
		this.renderView();
	}

	private renderView() {
		const activeFeature = getFeature(this.snapshot.selectedFeature);

		this.render(
			<aside class="space-y-4 rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(30,41,59,0.98))] p-5 text-slate-100 shadow-lg shadow-slate-300/40 sm:p-6">
				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Context observer</p>
					<h4 class="text-xl font-semibold text-white">{activeFeature.capability}</h4>
					<p class="text-sm leading-6 text-slate-300">{activeFeature.description}</p>
				</div>

				<div class="rounded-2xl border border-white/10 bg-white/5 p-4">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Committed note</p>
					<p data-ref="committed-note" class="mt-3 text-sm leading-6 text-slate-200">
						{this.snapshot.note}
					</p>
				</div>

				<div class="space-y-2">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Shared snapshot</p>
					<textarea
						class="min-h-40 w-full rounded-2xl border border-white/10 bg-slate-950/80 p-4 font-mono text-xs text-emerald-200 outline-none"
						prop:value={JSON.stringify(
							{
								count: this.snapshot.count,
								compact: this.snapshot.compact,
								tone: this.snapshot.tone,
								selectedFeature: this.snapshot.selectedFeature,
								note: this.snapshot.note,
							},
							null,
							2,
						)}
						readonly={true}
					/>
				</div>

				<div class="space-y-3">
					<p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Activity</p>
					<ul class="space-y-2">
						{this.snapshot.activity.map((item, index) => (
							<li class="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
								<span class="mr-2 text-slate-500">0{index + 1}</span>
								{item}
							</li>
						))}
					</ul>
				</div>
			</aside>,
		);
	}
}

@customElement('radiant-jsx-kitchen-sink')
export class RadiantJsxKitchenSink extends RadiantElementJsx {
	@reactiveProp({ type: String, defaultValue: 'Radiant JSX Kitchen Sink' }) heading!: string;
	@reactiveProp({ type: Boolean, reflect: true, defaultValue: initialSinkState.compact }) compact!: boolean;
	@reactiveProp({ type: Number, reflect: true, defaultValue: initialSinkState.count }) count!: number;
	@provideContext<typeof sinkContext>({ context: sinkContext, initialValue: initialSinkState })
	sink!: ContextProvider<typeof sinkContext>;

	override connectedCallback() {
		super.connectedCallback();
		this.seedContextFromProps();
		this.renderShell();
	}

	@onUpdated(['heading'])
	syncShell() {
		this.renderShell();
	}

	@onUpdated(['compact', 'count'])
	syncContextSeeds() {
		this.seedContextFromProps();
	}

	private seedContextFromProps() {
		const current = this.sink.getContext();
		if (current.count === this.count && current.compact === this.compact) {
			return;
		}

		this.sink.setContext({ count: this.count, compact: this.compact });
	}

	private renderShell() {
		this.render(
			<section
				class="grid gap-6 rounded-[2.25rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-5 shadow-xl shadow-slate-200/70 sm:p-6 lg:p-8"
				aria={{ live: 'polite', label: 'Radiant JSX kitchen sink' }}
			>
				<radiant-jsx-sink-hero
					heading={this.heading}
					eyebrow="Connected JSX sink"
					description="Multiple small RadiantElementJsx components are mounted here. Some receive descriptor data via props, while others consume shared context and update in lockstep."
				/>

				<radiant-jsx-sink-metrics prop:descriptors={metricDescriptors} />

				<div class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
					<div class="space-y-6">
						<radiant-jsx-sink-controls />
						<radiant-jsx-sink-feature-palette
							prop:features={featureDefinitions}
							prop:highlights={sinkHighlights}
						/>
					</div>

					<div class="space-y-6">
						<radiant-jsx-sink-note-editor
							title="Draft note"
							helper="Type locally without losing focus, then publish the message into shared context when you are ready."
						/>
						<radiant-jsx-sink-inspector />
					</div>
				</div>
			</section>,
		);
	}
}

declare global {
	namespace JSX {
		interface IntrinsicElements {
			'radiant-jsx-kitchen-sink': HtmlTag & RadiantJsxKitchenSinkProps;
			'radiant-jsx-sink-hero': HtmlTag & SinkHeroProps;
			'radiant-jsx-sink-metrics': HtmlTag & SinkMetricsProps;
			'radiant-jsx-sink-feature-palette': HtmlTag & SinkFeaturePaletteProps;
			'radiant-jsx-sink-controls': HtmlTag;
			'radiant-jsx-sink-note-editor': HtmlTag & SinkNoteEditorProps;
			'radiant-jsx-sink-inspector': HtmlTag;
		}
	}
}
