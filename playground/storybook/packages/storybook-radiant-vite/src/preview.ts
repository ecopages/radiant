import type { GlobalTypes, ProjectAnnotations } from 'storybook/internal/types';
import type { RadiantRenderer } from './types';

export const parameters: ProjectAnnotations<RadiantRenderer>['parameters'] = {
	radiant: {
		renderMode: 'client',
	},
};

export const globalTypes = {
	radiantRenderMode: {
		name: 'Radiant render',
		description: 'Override story render mode (client / SSR hydrate / SSR static)',
		defaultValue: 'story',
		toolbar: {
			icon: 'mirror',
			items: [
				{ value: 'story', title: 'Story default', icon: 'mirror' },
				{ value: 'client', title: 'Client', icon: 'browser' },
				{ value: 'ssr-hydrate', title: 'SSR + hydrate', icon: 'lightning' },
				{ value: 'ssr-static', title: 'SSR static', icon: 'document' },
			],
			dynamicTitle: true,
		},
	},
} satisfies GlobalTypes;
