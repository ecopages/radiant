import { DocsLayout } from '@/layouts/docs-layout';
import type { EcoComponent } from '@ecopages/core';

const DebouncePage: EcoComponent = () => {
	return (
		<>
			<h1>@debounce</h1>
			<p>
				<code>@debounce</code> delays a method until a configured quiet period has passed since the last
				call.
			</p>
			<p>Use it when a handler would otherwise run too often, such as during typing, resize, or scroll.</p>

			<h2>Example</h2>
			<pre>
				<code>{`import { RadiantElement, customElement, debounce, onEvent } from '@ecopages/radiant';

@customElement('search-input')
export class SearchInput extends RadiantElement {
	@debounce(300)
	performSearch(query: string) {
		console.log('Searching for:', query);
	}

	@onEvent({ selector: 'input', type: 'input' })
	handleInput(event: InputEvent) {
		const query = (event.target as HTMLInputElement).value;
		this.performSearch(query);
	}
}`}</code>
			</pre>

			<h2>Parameter</h2>
			<ul>
				<li>
					<strong>delay</strong>: Delay in milliseconds before the method runs.
				</li>
			</ul>

			<h2>Good Uses</h2>
			<ul>
				<li>search boxes</li>
				<li>window resize handling</li>
				<li>autosave flows</li>
				<li>analytics or logging triggered by bursty interactions</li>
			</ul>

			<h2>Delay Guidelines</h2>
			<ul>
				<li>Search input: 300-500ms</li>
				<li>Window resize: 200-300ms</li>
				<li>Autosave: 1000-3000ms</li>
			</ul>

			<h2>Behavior Notes</h2>
			<ul>
				<li>Only the last call inside the debounce window runs.</li>
				<li>The method does not return a stable immediate value you should depend on.</li>
				<li>
					This works well with <a href="/docs/decorators/on-event">@onEvent</a> when UI events arrive in
					bursts.
				</li>
			</ul>

			<h2>Relationship To @bound</h2>
			<p>
				Use <a href="/docs/decorators/bound">@bound</a> when you need stable <code>this</code> binding for a
				callback.
			</p>
			<p>Use <code>@debounce</code> when the call timing itself should be delayed.</p>
			<p>Sometimes a method benefits from both decorators.</p>
		</>
	);
};

DebouncePage.config = {
	layout: DocsLayout,
};

DebouncePage.metadata = () => ({
	title: 'Docs | @debounce',
	description: 'Delay method execution until calls have gone quiet for a configured interval.',
});

export default DebouncePage;