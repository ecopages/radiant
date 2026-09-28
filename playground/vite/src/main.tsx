import { createRoot } from '@ecopages/jsx';
import { PlaygroundSection } from './components/playground-section/playground-section';
import { RadiantAccordion } from './components/accordion/accordion';
import { RadiantDropdown } from './components/dropdown/dropdown';
import type { RadiantDropdownPlacement } from './components/dropdown/dropdown.script';
import { RadiantCounter } from './components/radiant-counter/radiant-counter';
import { RadiantEvent } from './components/radiant-event/radiant-event';
import { RadiantRefs } from './components/radiant-refs/radiant-refs.view';
import { RadiantSignalLab } from './components/radiant-signal-lab/radiant-signal-lab';
import { RadiantTodoApp } from './components/radiant-todo-app/radiant-todo-app.view';
import { ValueTester } from './components/value-tester/value-tester.script.tsx';
import './styles/tailwind.css';

const appRoot = document.querySelector<HTMLDivElement>('#app');
const root = appRoot ? createRoot(appRoot) : null;

const changePlacement = (newPlacement: RadiantDropdownPlacement) => {
	document.querySelector('radiant-dropdown')?.setAttribute('placement', newPlacement);
};

const attachPlacementListener = () => {
	document.querySelector('#placement')?.addEventListener('change', (e: Event) => {
		const target = e.target as HTMLSelectElement;
		changePlacement(target.value as RadiantDropdownPlacement);
	});
};

const App = () => {
	return (
		<main class="mx-auto flex flex-col max-w-[800px] gap-[2rem] px-[1.5rem] py-[2rem] pb-[4rem]">
			<h1 class="text-[2.25rem] font-semibold tracking-tight text-[#020617] mb-[1rem] mt-[2rem] leading-[1.2]">
				Radiant Components Playground
			</h1>
			<p class="text-[#64748b] text-[1.125rem]">Testing standard custom elements in Vite</p>
			<PlaygroundSection
				badge="Light Dom Components"
				title="Existing component demos"
				description="This playground stays focused on plain custom elements and light-DOM patterns, with a small signal lab showing how shared signals and stores can plug into that model."
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
						<RadiantDropdown placement="bottom-start" arrow>
							<ul class="flex flex-col gap-2 m-0 p-0" style="list-style: none;">
								<li>
									<a href="/" class="text-[#2563eb] hover:underline">
										Option 1
									</a>
								</li>
								<li>
									<a href="/" class="text-[#2563eb] hover:underline">
										Option 2
									</a>
								</li>
								<li>
									<a href="/" class="text-[#2563eb] hover:underline">
										Option 3
									</a>
								</li>
							</ul>
						</RadiantDropdown>
						<select
							id="placement"
							class="rounded-[6px] border border-[#cbd5e1] bg-[#ffffff] px-4 py-2 text-sm text-[#0f172a]"
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
					<div class="mt-[1.5rem] p-[1.5rem] border border-dashed border-[#cbd5e1] rounded-[6px] relative bg-[#f8fafc]">
						<span class="absolute top-[-0.6em] left-[1rem] bg-[#f8fafc] px-[0.5rem] text-[0.75rem] text-[#64748b]">
							Value Tester
						</span>
						<ValueTester
							number={1}
							string="string"
							boolean={false}
							array={['value']}
							object={{ key: 'value' }}
						/>
					</div>
				</div>
			</PlaygroundSection>
			<PlaygroundSection
				badge="Signals"
				title="Shared signal and store lab"
				description="The first pair uses a shared writable signal through @signal on plain RadiantElement hosts. The second pair reads a shared store directly inside RadiantElement render(), so both components rerender from the same store without prop plumbing."
			>
				<RadiantSignalLab />
			</PlaygroundSection>
		</main>
	);
};

const renderApp = () => {
	if (!root) {
		return;
	}

	root.render(<App />);
	attachPlacementListener();
};

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', renderApp, { once: true });
} else {
	renderApp();
}
