import { RadiantComponent, customElement, prop, state } from '@ecopages/radiant';

export type PkgManager = 'npm' | 'pnpm' | 'bun';

export type RadiantInstallCmdProps = {
	packages?: string;
};

type RadiantInstallCmdBindings = {
	copied: boolean;
	copyStatus: string;
};

@customElement('radiant-install-cmd')
export class RadiantInstallCmd extends RadiantComponent<RadiantInstallCmdBindings> {
	@prop({ type: String }) packages = '';
	@state selected: PkgManager = 'bun';
	@state copied = false;
	@state copyStatus = '';

	private timeoutId: ReturnType<typeof setTimeout> | null = null;

	override disconnectedCallback(): void {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
			this.timeoutId = null;
		}

		super.disconnectedCallback();
	}

	private readonly getCommand = () => {
		switch (this.selected) {
			case 'npm':
				return `npm install ${this.packages}`;
			case 'pnpm':
				return `pnpm add ${this.packages}`;
			case 'bun':
				return `bun add ${this.packages}`;
			default:
				return `bun add ${this.packages}`;
		}
	};

	private readonly setSelected = (manager: PkgManager) => {
		if (this.selected === manager) {
			return;
		}

		this.selected = manager;
	};

	private readonly handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(this.getCommand());
			this.copied = true;
			this.copyStatus = 'Copied to clipboard';
			if (this.timeoutId) clearTimeout(this.timeoutId);
			this.timeoutId = setTimeout(() => {
				this.copied = false;
				this.copyStatus = '';
			}, 2000);
		} catch (err) {
			console.error('Failed to copy text', err);
		}
	};

	override render() {
		const command = this.getCommand();

		return (
			<div class="install-cmd">
				<div class="install-cmd__tabs" role="tablist" aria-label="Package managers">
					{(['npm', 'pnpm', 'bun'] as PkgManager[]).map((manager) => (
						<button
							key={manager}
							type="button"
							class="install-cmd__tab"
							aria={{ pressed: this.selected === manager }}
							on:click={() => {
								this.setSelected(manager);
							}}
						>
							{manager}
						</button>
					))}
				</div>
				<div class="install-cmd__body">
					<span class="install-cmd__command">{command}</span>
					<button
						type="button"
						class="install-cmd__copy"
						data={{ copied: this.$.copied }}
						aria-label="Copy install command"
						on:click={this.handleCopy}
					>
						<span class="install-cmd__icon" aria-hidden="true"></span>
					</button>
					<span class="install-cmd__status" aria-live="polite">
						{this.$.copyStatus}
					</span>
				</div>
			</div>
		);
	}
}
