import { defineHandler } from 'nitro';

export default defineHandler(async () => {
	const { renderSsrComponent, createSsrResponse } = await import('../../render');
	const { RadiantSignalReleaseBoardElement } = await import('@/components/radiant-signal-release-board.script');
	return createSsrResponse(
		await renderSsrComponent({
			load: async () => RadiantSignalReleaseBoardElement,
			configure: (component) => {
				component.configureBoardState({
					filter: 'launch-ready',
					lastSyncAt: 'SSR rehearsal snapshot',
					selectedTicketId: 103,
					syncState: 'ready',
					syncSummary: 'Nitro preloaded the release rehearsal with a launch-ready focus.',
				});
			},
		}),
	);
});
