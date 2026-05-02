import { INITIAL_DECORATOR_VISUALIZER_STATE } from './radiant-controller-decorator-visualizer.script';

export function RadiantControllerDecoratorVisualizer() {
	return (
		<section
			class="controller-decorator-visualizer unstyled"
			data={{ controller: 'controller-dom-flow-visualizer', signal: INITIAL_DECORATOR_VISUALIZER_STATE.signal }}
		></section>
	);
}
