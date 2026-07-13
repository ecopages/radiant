import { eco } from '@ecopages/core';
import { BaseLayout } from '@/layouts/base-layout';
import type { JsxRenderable } from '@ecopages/jsx';
import type { Error404TemplateProps } from '@ecopages/core';

const Error404 = eco.page<Error404TemplateProps, JsxRenderable>({
	layout: BaseLayout,
	dependencies: {
		stylesheets: ['./404.css'],
	},
	render: () => {
		return (
			<div class="error404">
				<div class="error404__content">
					<div class="error404__code" aria-hidden="true">
						404
					</div>
					<h1 class="error404__title">Page Not Found</h1>
					<p class="error404__message">
						We couldn't find the page you're looking for. It might have been moved or deleted.
					</p>
					<div class="error404__actions">
						<a href="/" class="button button--primary">
							Return Home
						</a>
					</div>
				</div>
			</div>
		);
	},
});

export default Error404;
