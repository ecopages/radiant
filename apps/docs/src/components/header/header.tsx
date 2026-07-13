import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { Burger } from '@/components/burger';
import { Logo } from '@/components/logo/logo';
import { Navigation, type NavigationProps } from '@/components/navigation';
import rootJson from '../../../../../packages/radiant/package.json';

export type HeaderProps = {
	navigation: NavigationProps;
	showBurger?: boolean;
};

export const Header = eco.component<HeaderProps, JsxRenderable>({
	dependencies: {
		stylesheets: ['./header.css'],
		components: [Navigation, Logo, Burger],
	},
	render: ({ navigation, showBurger = false }) => {
		return (
			<header class="header">
				<div class="header__inner">
					<div class="header__inner-left">
						{showBurger ? <Burger class="md:hidden" /> : null}
						<Logo href="/" target="_self" title="Radiant" />
						<p class="version">v {rootJson.version}</p>
					</div>
					<Navigation {...navigation} />
				</div>
			</header>
		);
	},
});
