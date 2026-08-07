import type { JsxCustomElementAttributes } from '@ecopages/jsx';
import { RadiantElement, customElement, state } from '@ecopages/radiant';
import { contextSelector } from '@ecopages/radiant/context';
import { buildExampleCode } from '@/lib/playground';
import { emptyPlaygroundContext, playgroundContext, type PlaygroundContextValue } from './playground-context';

type CodeView = 'example' | 'import';

type PlaygroundCodeBindings = {
	codeView: CodeView;
	copied: boolean;
};

/**
 * Source panel for the docs playground.
 *
 * @remarks
 * Owns tab/copy UI state locally so toggling it never remounts the controls
 * panel. Example code reads live props from playground context.
 */
@customElement('radiant-playground-code')
export class PlaygroundCodeElement extends RadiantElement<PlaygroundCodeBindings> {
	@state codeView: CodeView = 'example';
	@state copied = false;

	@contextSelector({ context: playgroundContext })
	playground: PlaygroundContextValue = emptyPlaygroundContext;

	private getCode(): string {
		const { slug, props, children, exportName, usageExample } = this.playground;
		if (!slug || !exportName) return '';
		if (this.codeView === 'import') return usageExample;
		return buildExampleCode(exportName, slug, props, children);
	}

	private async copyCode(): Promise<void> {
		try {
			await navigator.clipboard.writeText(this.getCode());
			this.copied = true;
			window.setTimeout(() => {
				this.copied = false;
			}, 1600);
		} catch {
			this.copied = false;
		}
	}

	override render() {
		return (
			<div class="workbench__code">
				<div class="workbench__tabs" role="tablist" aria-label="Source views">
					<button
						type="button"
						role="tab"
						aria-selected={this.codeView === 'example'}
						on:click={() => {
							this.codeView = 'example';
						}}
					>
						Example
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={this.codeView === 'import'}
						on:click={() => {
							this.codeView = 'import';
						}}
					>
						Full usage
					</button>
				</div>
				<div class="workbench__code-body" role="tabpanel">
					<pre>
						<code>{this.getCode()}</code>
					</pre>
					<button
						class="workbench__copy"
						type="button"
						on:click={() => void this.copyCode()}
						aria-label="Copy visible source"
					>
						{this.copied ? 'Copied' : 'Copy'}
					</button>
				</div>
			</div>
		);
	}
}

declare module '@ecopages/jsx' {
	interface JsxCustomIntrinsicElements {
		'radiant-playground-code': JsxCustomElementAttributes<PlaygroundCodeElement>;
	}
}
