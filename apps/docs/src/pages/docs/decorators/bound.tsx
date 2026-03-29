import { DocsLayout } from '@/layouts/docs-layout';
import type { EcoComponent } from '@ecopages/core';

const BoundPage: EcoComponent = () => {
	return (
		<>
			<h1>@bound</h1>
			<p>
				<code>@bound</code> binds a method to the instance automatically.
			</p>
			<p>
				Use it when a method will be passed around as a callback and must keep the correct <code>this</code>{' '}
				value.
			</p>

			<h2>Example</h2>
			<pre>
				<code>{`import { RadiantElement, bound, customElement } from '@ecopages/radiant';

@customElement('timer-component')
export class TimerComponent extends RadiantElement {
	private count = 0;

	@bound
	increment() {
		this.count += 1;
		console.log(this.count);
	}

	override connectedCallback() {
		super.connectedCallback();
		setTimeout(this.increment, 1000);
	}
}`}</code>
			</pre>

			<h2>When To Use It</h2>
			<ul>
				<li>
					timers such as <code>setTimeout(...)</code> and <code>setInterval(...)</code>
				</li>
				<li>
					DOM listeners added manually with <code>addEventListener(...)</code>
				</li>
				<li>promise chains or callback-based APIs</li>
				<li>public methods that may be overridden in subclasses</li>
			</ul>

			<h2>@bound vs Arrow Functions</h2>
			<p>
				Both solve <code>this</code> binding, but the tradeoff is different.
			</p>
			<ul>
				<li>
					<code>@bound</code> keeps the method on the prototype and binds it per instance on first access.
				</li>
				<li>Arrow-function fields create a new function for every instance immediately.</li>
			</ul>
			<pre>
				<code>{`@customElement('my-component')
export class MyComponent extends RadiantElement {
	@bound
	boundMethod() {}

	arrowMethod = () => {};
}`}</code>
			</pre>

			<p>
				Use <code>@bound</code> when you want callback safety without turning the method into an instance field.
			</p>

			<h2>Relationship To @onEvent(...)</h2>
			<p>
				You usually do not need <code>@bound</code> for methods decorated with{' '}
				<a href="/docs/decorators/on-event">@onEvent</a>, because that decorator already manages method wiring
				for its own subscription path.
			</p>
			<p>
				<code>@bound</code> is most useful for methods you pass manually.
			</p>

			<h2>Learn More</h2>
			<ul>
				<li>
					<a href="/docs/decorators/on-event">@onEvent</a> for declarative event subscription
				</li>
				<li>
					<a href="/docs/decorators/debounce">@debounce</a> when the callback should also be delayed
				</li>
			</ul>
		</>
	);
};

BoundPage.config = {
	layout: DocsLayout,
};

BoundPage.metadata = () => ({
	title: 'Docs | @bound',
	description: 'Bind a class method to the instance automatically.',
});

export default BoundPage;
