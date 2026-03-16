/** @jsxImportSource @ecopages/jsx */

import type { TemplateResultLike } from '@ecopages/jsx';

export type DemoState = {
	message: string;
	clicks: number;
	query: string;
	active: boolean;
};

export const DirectHandlers = ({
	state,
	onStateChange,
}: {
	state: DemoState;
	onStateChange: (updater: (current: DemoState) => DemoState) => void;
}) => {
	function handleClick() {
		console.log('[radiant-jsx-function-demo] click');
		onStateChange((current) => ({
			...current,
			clicks: current.clicks + 1,
			active: !current.active,
			message: `Clicked ${current.clicks + 1} time${current.clicks + 1 === 1 ? '' : 's'}`,
		}));
	}

	function handleReset() {
		console.log('[radiant-jsx-function-demo] reset');
		onStateChange((current) => ({
			...current,
			clicks: 0,
			query: '',
			active: false,
			message: 'Reset direct handler state',
		}));
	}

	const handleInput = (event: Event) => {
		const value = (event.currentTarget as HTMLInputElement).value;
		console.log('[radiant-jsx-function-demo] input', value);
		onStateChange((current) => ({
			...current,
			query: value,
			message: value ? `Typed "${value}"` : 'Cleared query',
		}));
	};

	return (
		<>
			<div class="space-y-3">
				<p class="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Direct handlers</p>
				<h3 class="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
					Handlers are declared inside the function component.
				</h3>
				<p class="text-sm leading-7 text-slate-600 sm:text-base">
					This demo is the direct pattern you described: local `handleClick` and `handleInput` functions
					returning plain JSX.
				</p>
			</div>

			<div class="grid gap-4 md:grid-cols-3">
				<article
					classes={[
						'rounded-3xl border p-5 shadow-sm shadow-slate-200/70',
						state.active ? 'border-emerald-200/80 bg-emerald-50/80' : 'border-slate-200/80 bg-slate-50/80',
					]}
				>
					<p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Click count</p>
					<p class="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{String(state.clicks)}</p>
					<p class="mt-3 text-sm leading-6 text-slate-600">
						Clicks update local state and log to the console.
					</p>
				</article>
				<article
					classes={[
						'rounded-3xl border p-5 shadow-sm shadow-slate-200/70',
						state.query ? 'border-sky-200/80 bg-sky-50/80' : 'border-slate-200/80 bg-slate-50/80',
					]}
				>
					<p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Input value</p>
					<p class="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{state.query || 'Empty'}</p>
					<p class="mt-3 text-sm leading-6 text-slate-600">
						Input changes log the current value directly from the handler.
					</p>
				</article>
				<article class="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/70">
					<p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Latest event</p>
					<p class="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{state.message}</p>
					<p class="mt-3 text-sm leading-6 text-slate-600">
						The summary is rerendered from the same closure-based state.
					</p>
				</article>
			</div>

			<div class="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
				<div class="space-y-4 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4">
					<p class="text-sm font-semibold text-slate-900">Buttons using local handlers</p>
					<div class="flex flex-wrap gap-3">
						<button
							type="button"
							classes={[
								'rounded-2xl border px-4 py-3 text-sm font-semibold transition duration-200',
								state.active
									? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300/60'
									: 'border-slate-200 bg-white text-slate-700 shadow-sm shadow-slate-200/70 hover:border-slate-300 hover:text-slate-950',
							]}
							on:click={handleClick}
						>
							Log click
						</button>
						<button
							type="button"
							class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-200/70 transition duration-200 hover:border-slate-300 hover:text-slate-950"
							on:click={handleReset}
						>
							Reset
						</button>
					</div>
				</div>

				<div class="space-y-4 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4">
					<p class="text-sm font-semibold text-slate-900">Input using a local arrow handler</p>
					<label class="grid gap-2 text-sm text-slate-600">
						<span class="font-medium text-slate-900">Type something</span>
						<input
							type="text"
							value={state.query}
							class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm shadow-slate-200/60"
							on:input={handleInput}
							placeholder="Logs event.currentTarget.value"
						/>
					</label>
					<pre class="overflow-x-auto rounded-2xl bg-slate-950 px-4 py-3 text-xs leading-6 text-slate-100">{`function DirectHandlers(){
  function handleClick(){ console.log('Click') }
  const handleInput = (e) => console.log((e.currentTarget as HTMLInputElement).value)
  return <button on:click={handleClick} />
}`}</pre>
				</div>
			</div>
		</>
	) as TemplateResultLike;
};

export const FunctionDemoView = ({
	state,
	onStateChange,
}: {
	state: DemoState;
	onStateChange: (updater: (current: DemoState) => DemoState) => void;
}) =>
	(
		<section class="grid gap-6 rounded-[2rem] border border-slate-200/80 bg-white/90 p-5 shadow-xl shadow-slate-200/60 sm:p-6">
			<DirectHandlers state={state} onStateChange={onStateChange} />
		</section>
	) as TemplateResultLike;
