import type { RadiantSlotProps } from '../../../types';
import { defineRadiantView } from '../../../lib/radiant-view';
import type { RuiBreadcrumbItem, RuiBreadcrumbProps } from './breadcrumb.script';
import { RuiBreadcrumb as RuiBreadcrumbElement } from './breadcrumb.script';
import './breadcrumb.css';

export const RuiBreadcrumb = defineRadiantView(
	RuiBreadcrumbElement,
	({ slot, label, items }: RuiBreadcrumbProps & RadiantSlotProps & { items: RuiBreadcrumbItem[] }) => (
		<rui-breadcrumb slot={slot} label={label}>
			<ol class="rui-breadcrumb__list">
				{items.map((item, index) => (
					<li class="rui-breadcrumb__item">
						{item.current || !item.href ? (
							<span aria-current={item.current ? 'page' : undefined}>{item.label}</span>
						) : (
							<a href={item.href}>{item.label}</a>
						)}
						{index < items.length - 1 ? (
							<span class="rui-breadcrumb__separator" aria-hidden="true">
								/
							</span>
						) : null}
					</li>
				))}
			</ol>
		</rui-breadcrumb>
	),
);
