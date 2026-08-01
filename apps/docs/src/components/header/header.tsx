import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { RuiSidebarTrigger } from '@ecopages/radiant-ui/sidebar';
import { Logo } from '@/components/logo/logo';
import { Navigation, type NavigationProps } from '@/components/navigation';
import rootJson from '../../../../../packages/radiant/package.json';

export type HeaderProps = {
	navigation: NavigationProps;
	sidebarId?: string;
};

export const Header = eco.component<HeaderProps, JsxRenderable>({
	dependencies: {
		stylesheets: ['./header.css'],
		components: [Navigation, Logo],
	},
	render: ({ navigation, sidebarId }) => {
		return (
			<header class="header">
				<div class="header__inner">
					<div class="header__inner-left">
						{sidebarId ? (
							<RuiSidebarTrigger
								class="md:hidden"
								controls={sidebarId}
								triggerLabel="Toggle documentation navigation"
							/>
						) : null}
						<Logo href="/" target="_self" title="Radiant" />
						<p class="version">v {rootJson.version}</p>
					</div>
					<Navigation {...navigation} />
				</div>
			</header>
		);
	},
});
