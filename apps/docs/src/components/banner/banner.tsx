import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import { cn } from '@/styles/utils';

export type BannerProps = {
	children: JsxRenderable;
	type?: 'alert' | 'info' | 'tip' | 'caution';
	class?: string;
};

export type BannerTitleProps = {
	children: string;
	class?: string;
};

const BannerRoot = eco.component<BannerProps, JsxRenderable>({
	dependencies: {
		stylesheets: ['./banner.css'],
	},
	render: ({ children, type = 'info', class: className }) => {
		return (
			<div class={cn(`eco-banner eco-banner--${type}`, className)} role="alert">
				{children}
			</div>
		);
	},
});

const BannerTitle = eco.component<BannerTitleProps, JsxRenderable>({
	render: ({ children, class: className }) => {
		return <p class={cn('eco-banner__title', className)}>{children}</p>;
	},
});

export const Banner = Object.assign(BannerRoot, {
	Title: BannerTitle,
});
