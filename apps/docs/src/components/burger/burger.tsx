import type { EcoComponent } from '@ecopages/core';

export const Burger: EcoComponent<{ class?: string }> = ({ class: className }) => {
	return (
		<span class={className}>
			<radiant-burger class="burger-host" />
		</span>
	);
};

Burger.config = {
	dependencies: {
		stylesheets: ['./burger.css'],
		scripts: ['./burger.script.tsx'],
	},
};
