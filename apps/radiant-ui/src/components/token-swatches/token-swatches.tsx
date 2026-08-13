import { eco } from '@ecopages/core';
import type { JsxRenderable } from '@ecopages/jsx';
import {
	absoluteColorTokens,
	elevationTokens,
	grayScaleTokens,
	palettePacks,
	radiusRoleTokens,
	radiusScaleTokens,
	semanticColorFamilies,
	spacingRoleTokens,
	spacingScaleTokens,
	tokenStepLabel,
	typographySizeTokens,
	type ColorFamily,
	type PalettePack,
} from './token-catalog';
import './token-swatches.script';

const swatchDependencies = {
	stylesheets: ['./token-swatches.css'],
	scripts: ['./token-swatches.script.ts'],
};

function fillStyle(token: string, onToken?: string): Record<string, string> {
	const style: Record<string, string> = { '--token-swatch-fill': `var(${token})` };
	if (onToken) style['--token-swatch-on'] = `var(${onToken})`;
	return style;
}

function TokenStatus() {
	return <div class="token-swatches__status" data-token-status aria-live="polite" />;
}

function ColorSwatchButton({ token, onToken }: { token: string; onToken?: string }) {
	return (
		<button
			type="button"
			class="token-swatch"
			data-token-copy={token}
			aria-label={`Copy ${token}`}
			style={fillStyle(token, onToken)}
		>
			<span class="token-swatch__chip">
				{onToken ? <span class="token-swatch__chip-label">{onToken}</span> : null}
			</span>
			<span class="token-swatch__meta">
				<span class="token-swatch__name">{token}</span>
			</span>
		</button>
	);
}

function ColorFamilySection({ family }: { family: ColorFamily }) {
	return (
		<div class="token-swatches__family">
			<p class="token-swatches__family-label">{family.label}</p>
			<p class="token-swatches__family-description">{family.description}</p>
			<div class="token-swatches__grid">
				{family.swatches.map((swatch) => (
					<ColorSwatchButton token={swatch.token} onToken={swatch.onToken} />
				))}
			</div>
		</div>
	);
}

function PaletteStepButton({ token }: { token: string }) {
	return (
		<button
			type="button"
			class="token-palette__step"
			data-token-copy={token}
			aria-label={`Copy ${token}`}
			style={fillStyle(token)}
		>
			<span class="token-palette__step-chip" />
			<span class="token-palette__step-label">{tokenStepLabel(token)}</span>
		</button>
	);
}

function PalettePackSection({ pack }: { pack: PalettePack }) {
	return (
		<div class="token-palette__pack">
			<div>
				<p class="token-palette__pack-label">{pack.label}</p>
				<p class="token-palette__pack-file">{pack.packFile}</p>
			</div>
			{pack.scales.map((scale) => (
				<div class="token-palette__scale">
					<div class="token-palette__scale-name">{scale.name}</div>
					<div class="token-palette__steps">
						{scale.tokens.map((token) => (
							<PaletteStepButton token={token} />
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function SpacingRow({ token, caption }: { token: string; caption?: string }) {
	return (
		<button
			type="button"
			class="token-space__row"
			data-token-copy={token}
			aria-label={`Copy ${token}`}
			style={{ '--token-space-size': `var(${token})` }}
		>
			<span class="token-space__name">{token}</span>
			<span class="token-space__value" data-token-value={token} />
			<span class="token-space__track">
				<span class="token-space__bar" />
			</span>
			{caption ? <span class="token-space__caption">{caption}</span> : null}
		</button>
	);
}

function RadiusItem({ token, variant }: { token: string; variant?: 'pill' }) {
	return (
		<button
			type="button"
			class="token-radius__item"
			data-token-copy={token}
			data-variant={variant}
			aria-label={`Copy ${token}`}
			style={{ '--token-radius-size': `var(${token})` }}
		>
			<span class="token-radius__shape" />
			<span class="token-radius__name">{token}</span>
			<span class="token-radius__value" data-token-value={token} />
		</button>
	);
}

function SwatchHost({ children }: { children: JsxRenderable }) {
	return (
		<radiant-token-swatches class="unstyled">
			{children}
			<TokenStatus />
		</radiant-token-swatches>
	);
}

function defineSwatchSection(renderBody: () => JsxRenderable) {
	return eco.component<Record<string, never>, JsxRenderable>({
		dependencies: swatchDependencies,
		render: () => <SwatchHost>{renderBody()}</SwatchHost>,
	});
}

export const SemanticColorSwatches = defineSwatchSection(() => (
	<div class="token-swatches">
		{semanticColorFamilies.map((family) => (
			<ColorFamilySection family={family} />
		))}
	</div>
));

export const GrayScaleSwatches = defineSwatchSection(() => (
	<div class="token-palette">
		<div class="token-palette__scale">
			<div class="token-palette__scale-name">gray</div>
			<div class="token-palette__steps">
				{grayScaleTokens.map((token) => (
					<PaletteStepButton token={token} />
				))}
			</div>
		</div>
	</div>
));

export const AbsoluteColorSwatches = defineSwatchSection(() => (
	<div class="token-palette">
		<div class="token-palette__scale">
			<div class="token-palette__scale-name">absolute</div>
			<div class="token-palette__steps">
				{absoluteColorTokens.map((token) => (
					<PaletteStepButton token={token} />
				))}
			</div>
		</div>
	</div>
));

export const PaletteSwatches = defineSwatchSection(() => (
	<div class="token-palette">
		{palettePacks.map((pack) => (
			<PalettePackSection pack={pack} />
		))}
	</div>
));

export const SpacingSwatches = defineSwatchSection(() => (
	<div class="token-space">
		{spacingScaleTokens.map((token) => (
			<SpacingRow token={token} />
		))}
	</div>
));

export const SpacingRoleSwatches = defineSwatchSection(() => (
	<div class="token-space">
		{spacingRoleTokens.map((item) => (
			<SpacingRow token={item.token} caption={item.label} />
		))}
	</div>
));

export const RadiusSwatches = defineSwatchSection(() => (
	<div class="token-radius">
		{radiusScaleTokens.map((token) => (
			<RadiusItem token={token} variant={token.endsWith('-full') ? 'pill' : undefined} />
		))}
	</div>
));

export const RadiusRoleSwatches = defineSwatchSection(() => (
	<div class="token-radius">
		{radiusRoleTokens.map((item) => (
			<RadiusItem token={item.token} variant={item.token.endsWith('-pill') ? 'pill' : undefined} />
		))}
	</div>
));

export const ElevationSwatches = defineSwatchSection(() => (
	<div class="token-elevation">
		{elevationTokens.map((item) => (
			<button
				type="button"
				class="token-elevation__item"
				data-token-copy={item.token}
				aria-label={`Copy ${item.token}`}
				style={{ '--token-elevation-shadow': `var(${item.token})` }}
			>
				<span class="token-elevation__card">{item.token}</span>
				<span class="token-elevation__name">{item.token}</span>
				<span class="token-elevation__caption">{item.label}</span>
			</button>
		))}
	</div>
));

export const TypographySwatches = defineSwatchSection(() => (
	<div class="token-type">
		{typographySizeTokens.map((token) => (
			<button
				type="button"
				class="token-type__row"
				data-token-copy={token}
				aria-label={`Copy ${token}`}
				style={{ '--token-type-size': `var(${token})` }}
			>
				<span class="token-type__name">{token}</span>
				<span class="token-type__value" data-token-value={token} />
				<span class="token-type__sample">Ag</span>
			</button>
		))}
	</div>
));
