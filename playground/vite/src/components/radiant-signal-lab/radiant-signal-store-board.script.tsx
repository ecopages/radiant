import { RadiantElement } from '@ecopages/radiant/core/radiant-element';
import { customElement } from '@ecopages/radiant/decorators/custom-element';
import {
	advanceFocusedSignalLabTicket,
	focusNextSignalLabTicket,
	signalLabStore,
	toggleSignalLabSync,
} from './radiant-signal-lab.store';

@customElement('radiant-signal-store-chip')
export class RadiantSignalStoreChip extends RadiantElement {
	render() {
		const focusedTicket = signalLabStore.tickets[signalLabStore.focusedIndex];

		return (
			<p
				class="rounded-[999px] border border-[#cbd5e1] bg-[#ffffff] px-4 py-2 text-sm text-[#0f172a]"
				data-ref="store-chip"
			>
				{focusedTicket?.title ?? 'No ticket'} · {signalLabStore.syncOnline ? 'Live sync' : 'Offline sync'}
			</p>
		);
	}
}

@customElement('radiant-signal-store-board')
export class RadiantSignalStoreBoard extends RadiantElement {
	private readonly advanceFocusedTicket = () => {
		advanceFocusedSignalLabTicket();
	};

	private readonly focusNextTicket = () => {
		focusNextSignalLabTicket();
	};

	private readonly toggleSync = () => {
		toggleSignalLabSync();
	};

	render() {
		const focusedTicket = signalLabStore.tickets[signalLabStore.focusedIndex];
		const launchCount = signalLabStore.tickets.filter((ticket) => ticket.lane === 'Launch').length;

		return (
			<section class="rounded-[18px] border border-[#cbd5e1] bg-[#ffffff] p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
				<p class="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-[#0f766e]">Shared store</p>
				<h3 class="mt-2 text-[1.3rem] font-semibold text-[#0f172a]">Signal store board</h3>
				<p class="mt-2 text-sm leading-6 text-[#475569]">
					This component reads a module-level <code>createStore(...)</code> directly during{' '}
					<code>render()</code>. The focused ticket and sync chip stay in sync without an intermediate prop
					bridge.
				</p>
				<div class="mt-4 flex flex-wrap gap-3 text-sm text-[#0f172a]">
					<p class="rounded-[999px] bg-[#e2e8f0] px-3 py-1" data-ref="store-status">
						{signalLabStore.syncOnline ? 'Online' : 'Offline'}
					</p>
					<p class="rounded-[999px] bg-[#ecfccb] px-3 py-1" data-ref="store-launch-count">
						Launch-ready: {launchCount}
					</p>
				</div>
				<p class="mt-4 text-base font-medium text-[#0f172a]" data-ref="store-focus">
					{focusedTicket?.title ?? 'No ticket'} · {focusedTicket?.lane ?? 'n/a'}
				</p>
				<div class="mt-5 flex flex-wrap gap-3">
					<button
						class="rounded-[999px] bg-[#0f172a] px-4 py-2 text-sm font-medium text-[#f8fafc]"
						type="button"
						on:click={this.focusNextTicket}
					>
						Focus next ticket
					</button>
					<button
						class="rounded-[999px] bg-[#0f766e] px-4 py-2 text-sm font-medium text-[#f0fdfa]"
						type="button"
						on:click={this.advanceFocusedTicket}
					>
						Advance focused ticket
					</button>
					<button
						class="rounded-[999px] border border-[#94a3b8] px-4 py-2 text-sm font-medium text-[#0f172a]"
						type="button"
						on:click={this.toggleSync}
					>
						Toggle sync
					</button>
				</div>
			</section>
		);
	}
}
