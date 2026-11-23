import { RuiBadge } from '@ecopages/radiant-ui/badge';

/**
 * A flask marking a docs page about an API that may still change.
 *
 * @remarks
 * The flask is the only visible cue, so the badge carries the text for assistive technology and as a tooltip.
 */
export function ExperimentalBadge() {
	return (
		<RuiBadge
			variant="ghost"
			class="docs-status-badge"
			role="img"
			aria-label="Experimental"
			title="Experimental: this API may change"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="14"
				height="14"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2" />
				<path d="M6.453 15h11.094" />
				<path d="M8.5 2h7" />
			</svg>
		</RuiBadge>
	);
}
