import type { JsxRenderable } from '@ecopages/jsx';
import type { WithChildren } from '../../types';

type PlaygroundSectionProps = WithChildren<{
	badge?: string;
	title: string;
	description?: string;
	actions?: JsxRenderable;
}>;

export const PlaygroundSection = ({ badge, title, description, actions, children }: PlaygroundSectionProps) => {
	return (
		<section class="rounded-[8px] border border-[#e2e8f0] bg-[#f8fafc] p-[1.5rem] shadow-[0_1px_3px_0_rgb(0,0,0,0.1),0_1px_2px_-1px_rgb(0,0,0,0.1)]">
			<div class="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e8f0] pb-[1rem] mb-[1.5rem]">
				<div class="flex flex-col gap-3">
					{badge ? (
						<p class="inline-flex w-fit rounded-full bg-[#f1f5f9] border border-[#f1f5f9] px-[0.6rem] py-[0.25rem] text-[0.75rem] font-semibold uppercase tracking-[0.05em] text-[#475569]">
							{badge}
						</p>
					) : null}
					<div class="flex flex-col m-0 p-0 border-0">
						<h2 class="text-[1.25rem] font-semibold m-0 p-0 border-none">{title}</h2>
						{description ? <p class="text-[1.125rem] m-0 text-[#64748b]">{description}</p> : null}
					</div>
				</div>
				{actions ? (
					<div class="flex shrink-0 flex-wrap items-center mt-[1rem] gap-[0.5rem]">{actions}</div>
				) : null}
			</div>
			<div>{children}</div>
		</section>
	);
};
