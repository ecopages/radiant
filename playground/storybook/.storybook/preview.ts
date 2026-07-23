import type { Preview } from '@ecopages/storybook-radiant-vite';
import '../src/styles/tailwind.css';

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
		a11y: {
			test: 'todo',
		},
		radiant: {
			renderMode: 'client',
		},
	},
};

export default preview;
