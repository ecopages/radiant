import type { Placement } from '@floating-ui/dom';
import { createRoot } from '@ecopages/jsx';
import { FunctionDemoView, type DemoState } from './components/radiant-jsx-function-demo/radiant-jsx-function-demo.tsx';
import { PlaygroundSection } from './components/playground-section/playground-section.kita.tsx';
import { RadiantAccordion } from './components/accordion/accordion.kita.tsx';
import { RadiantDropdown } from './components/dropdown/dropdown.kita.tsx';
import { RadiantCounter } from './components/radiant-counter/radiant-counter.kita.tsx';
import { RadiantEvent } from './components/radiant-event/radiant-event.kita.tsx';
import { RadiantJsxKitchenSink } from './components/radiant-jsx-kitchen-sink/radiant-jsx-kitchen-sink.kita.tsx';
import { RadiantRefs } from './components/radiant-refs/radiant-refs.kita.tsx';
import { RadiantTodoApp } from './components/radiant-todo-app/radiant-todo-app.kita.tsx';
import { ValueTester } from './components/value-tester/value-tester.script.tsx';
import './styles/tailwind.css';

const appRoot = document.querySelector<HTMLDivElement>('#app');
const functionDemoState: DemoState = {
	message: 'Idle',
	clicks: 0,
	query: '',
	active: false,
};

const changePlacement = (newPlacement: Placement) => {
	document.querySelector('radiant-dropdown')?.setAttribute('placement', newPlacement);
};

document.addEventListener('DOMContentLoaded', () => {
	document.querySelector('#placement')?.addEventListener('change', (e: Event) => {
		const target = e.target as HTMLSelectElement;
		changePlacement(target.value as Placement);
	});
});

const App = async () => {
	return (
		<main class="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:px-8">
			<PlaygroundSection
				badge="Experimental"
				title="JSX integration lab"
				description="This section mounts a small network of JSX-native Radiant elements. Some pieces communicate through shared context, others receive structured props directly, so it doubles as a real kitchen sink for the new runtime."
			>
				<div class="grid gap-8">
					<RadiantJsxKitchenSink heading="Kitchen sink for the new JSX runtime" count={3} />
					<div id="radiant-jsx-function-demo" />
				</div>
			</PlaygroundSection>

			<PlaygroundSection
				badge="Controls"
				title="Existing component demos"
				description="The previous examples stay available below so it is easy to compare the older string-based flow with the new JSX-aware component above."
			>
				<div class="grid gap-8">
					<RadiantAccordion
						shouldAnimate={true}
						multiple={false}
						items={[
							{ id: 'item-1', title: 'Accordion 1', children: <p>Content 1</p> },
							{ id: 'item-2', title: 'Accordion 2', children: <p>Content 2</p> },
							{ id: 'item-3', title: 'Accordion 3', children: <p>Content 3</p> },
						]}
					/>
					<div class="flex flex-wrap items-center gap-4">
						<RadiantDropdown placement="left-end" arrow>
							<ul class="flex flex-col gap-2">
								<li>
									<a href="/">Option 1</a>
								</li>
								<li>
									<a href="/">Option 2</a>
								</li>
								<li>
									<a href="/">Option 3</a>
								</li>
							</ul>
						</RadiantDropdown>
						<select
							id="placement"
							class="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
						>
							<option value="left-start">Left Start</option>
							<option value="left">Left</option>
							<option value="left-end">Left End</option>
							<option value="top-start">Top Start</option>
							<option value="top">Top</option>
							<option value="top-end">Top End</option>
							<option value="right-start">Right Start</option>
							<option value="right">Right</option>
							<option value="right-end">Right End</option>
							<option value="bottom-start">Bottom Start</option>
							<option value="bottom">Bottom</option>
							<option value="bottom-end">Bottom End</option>
						</select>
					</div>
					<div class="flex flex-wrap gap-4">
						<RadiantCounter value={5} />
						<RadiantCounter value={8} />
						<RadiantCounter />
					</div>
					<RadiantRefs />
					<RadiantTodoApp />
					<RadiantEvent />
					<ValueTester
						number={1}
						string="string"
						boolean={false}
						array={['value']}
						object={{ key: 'value' }}
					/>
				</div>
			</PlaygroundSection>
		</main>
	);
};

const renderApp = async () => {
	if (appRoot) {
		appRoot.innerHTML = await (<App />);
		const functionDemoRoot = document.querySelector<HTMLElement>('#radiant-jsx-function-demo');
		if (functionDemoRoot) {
			const functionDemoRootApi = createRoot(functionDemoRoot);
			const renderFunctionDemo = () => {
				functionDemoRootApi.render(
					FunctionDemoView({
						state: functionDemoState,
						onStateChange: (updater) => {
							const nextState = updater(functionDemoState);
							functionDemoState.message = nextState.message;
							functionDemoState.clicks = nextState.clicks;
							functionDemoState.query = nextState.query;
							functionDemoState.active = nextState.active;
							renderFunctionDemo();
						},
					}),
				);
			};

			renderFunctionDemo();
		}
	}
};

renderApp();
