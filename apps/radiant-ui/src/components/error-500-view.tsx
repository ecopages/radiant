import { RuiButton } from '@ecopages/radiant-ui/button';
import { RuiHeading, RuiHeadingEyebrow, RuiHeadingTitle } from '@ecopages/radiant-ui/heading';

export function Error500View({ detail }: { detail: string }) {
	return (
		<div class="error500 unstyled">
			<header class="error500__header">
				<RuiHeading size="sm" class="error500__heading">
					<RuiHeadingEyebrow>500</RuiHeadingEyebrow>
					<RuiHeadingTitle as="h1">Something went wrong</RuiHeadingTitle>
				</RuiHeading>
				<div class="error500__actions">
					<RuiButton type="button" variant="outline" size="sm" data-error500-copy aria-label="Copy error">
						<span data-error500-copy-label>Copy error</span>
					</RuiButton>
					<RuiButton href="/" variant="outline" size="sm">
						Return home
					</RuiButton>
				</div>
			</header>
			<pre class="error500__detail" data-error500-detail>
				{detail}
			</pre>
		</div>
	);
}
