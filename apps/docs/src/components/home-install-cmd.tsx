import './home-install-cmd.script';
import type { EcoComponent } from '@ecopages/core';
import type { RadiantInstallCmdProps } from './home-install-cmd.script';

export const HomeInstallCmd: EcoComponent<RadiantInstallCmdProps & { class?: string }> = (props) => {
	return <radiant-install-cmd class={props.class} prop:packages={props.packages}></radiant-install-cmd>;
};

HomeInstallCmd.config = {
	dependencies: {
		scripts: ['./home-install-cmd.script.tsx'],
		stylesheets: ['./home-install-cmd.css'],
	},
};