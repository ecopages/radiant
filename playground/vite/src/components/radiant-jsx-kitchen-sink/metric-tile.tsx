/** @jsxImportSource @ecopages/jsx */

export type MetricTileTone = 'emerald' | 'sky' | 'amber';

export type MetricTileProps = {
	label: string;
	value: string | number;
	description: string;
	tone?: MetricTileTone;
	active?: boolean;
};

const toneStyles: Record<MetricTileTone, { shell: string; eyebrow: string; value: string; activeRing: string }> = {
	emerald: {
		shell: 'border-emerald-200/90 bg-emerald-50/85',
		eyebrow: 'text-emerald-700',
		value: 'text-emerald-950',
		activeRing: 'ring-emerald-500/20',
	},
	sky: {
		shell: 'border-sky-200/90 bg-sky-50/85',
		eyebrow: 'text-sky-700',
		value: 'text-sky-950',
		activeRing: 'ring-sky-500/20',
	},
	amber: {
		shell: 'border-amber-200/90 bg-amber-50/85',
		eyebrow: 'text-amber-700',
		value: 'text-amber-950',
		activeRing: 'ring-amber-500/20',
	},
};

export const MetricTile = ({ label, value, description, tone = 'emerald', active = false }: MetricTileProps) => {
	const styles = toneStyles[tone];

	return (
		<article
			classes={[
				'relative min-h-full rounded-3xl border p-5 transition duration-200',
				styles.shell,
				active ? ['shadow-lg shadow-slate-200/80 ring-2', styles.activeRing] : 'shadow-sm shadow-slate-200/70',
			]}
			data={{ tone, active: active ? 'true' : 'false' }}
		>
			<div class="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
			<p classes={['text-xs font-semibold uppercase tracking-[0.22em]', styles.eyebrow]}>{label}</p>
			<p classes={['mt-4 text-3xl font-semibold tracking-tight sm:text-[2rem]', styles.value]}>{value}</p>
			<p class="mt-3 text-sm leading-6 text-slate-600">{description}</p>
		</article>
	);
};
