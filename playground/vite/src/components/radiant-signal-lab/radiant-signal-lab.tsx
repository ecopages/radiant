import './radiant-shared-signal-meter.script.tsx';
import './radiant-signal-store-board.script.tsx';

const SharedSignalMeter = ({ meter }: { meter: string }) => {
	return (
		<radiant-shared-signal-meter
			data-meter={meter}
			class="rounded-[18px] border border-[#cbd5e1] bg-[#ffffff] p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)]"
		>
			<p class="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#2563eb]">Plain RadiantElement</p>
			<h3 class="mt-2 text-[1.2rem] font-semibold text-[#0f172a]">Shared signal meter {meter}</h3>
			<p class="mt-2 text-sm leading-6 text-[#475569]">
				This host connects a module-level signal through <code>@signal</code> and still exposes the same Radiant
				update and <code>$</code> binding surface.
			</p>
			<p class="mt-4 text-3xl font-semibold text-[#0f172a]" data-ref="count">
				2
			</p>
			<p class="mt-2 text-sm text-[#64748b]" data-ref="binding">
				$.count -&gt; 2
			</p>
			<div class="mt-5 flex gap-3">
				<button
					class="rounded-[999px] border border-[#94a3b8] px-4 py-2 text-sm font-medium text-[#0f172a]"
					type="button"
					data-ref="decrement"
				>
					Decrease shared signal
				</button>
				<button
					class="rounded-[999px] bg-[#2563eb] px-4 py-2 text-sm font-medium text-[#eff6ff]"
					type="button"
					data-ref="increment"
				>
					Increment shared signal
				</button>
			</div>
		</radiant-shared-signal-meter>
	);
};

export const RadiantSignalLab = () => {
	return (
		<div class="grid gap-6">
			<div class="grid gap-4 md:grid-cols-2">
				<SharedSignalMeter meter="alpha" />
				<SharedSignalMeter meter="beta" />
			</div>
			<div class="grid gap-4">
				<radiant-signal-store-chip />
				<radiant-signal-store-board />
			</div>
		</div>
	);
};
