import { defineHandler } from 'nitro';

export default defineHandler(async () => {
	const { renderSsrComponentResponse } = await import('../../../vite-plugin-radiant/nitro/render');
	const { RadiantSignalReleaseBoardElement } = await import('@/components/radiant-signal-release-board.script');
	return renderSsrComponentResponse(RadiantSignalReleaseBoardElement, {
		initialize: (component) => {
			component.configureBoardState({
				filter: 'launch-ready',
				lastSyncAt: 'SSR rehearsal snapshot',
				selectedTicketId: 103,
				syncState: 'ready',
				syncSummary: 'Nitro preloaded the release rehearsal with a launch-ready focus.',
			});
		},
	});
});
