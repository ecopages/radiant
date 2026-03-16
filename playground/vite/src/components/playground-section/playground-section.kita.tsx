import type { WithChildren } from '../../types';

type PlaygroundSectionProps = WithChildren<{
	badge?: string;
	title: string;
	description?: string;
	actions?: JSX.Element | JSX.Element[];
}>;

export const PlaygroundSection = ({ badge, title, description, actions, children }: PlaygroundSectionProps) => {
	return (
		<section class="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm shadow-slate-200/70 backdrop-blur sm:p-8">
			<div class="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
				<div class="space-y-3">
					{badge ? (
						<p class="inline-flex w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
							{badge}
						</p>
					) : null}
					<div class="space-y-2">
						<h2 class="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</h2>
						{description ? <p class="max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
					</div>
				</div>
				{actions ? <div class="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
			</div>
			<div class="pt-6">{children}</div>
		</section>
	);
};
