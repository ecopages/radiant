import { uniqueId } from '@/lib/unique-id';

/**
 * Name an inner part with the labels associated with a form-associated host.
 *
 * @remarks A `<label for="host-id">` outside `rui-field` labels the host through
 * `ElementInternals.labels`, but the accessible role lives on an inner part (a slider
 * thumb, a spinbutton, a group), so the host forwards the labels to that part's
 * `aria-labelledby`. A label with no `id` gets one. Labels the part already names stay.
 * Hosts add no role or ARIA state of their own, which would duplicate the inner part's.
 */
export function forwardHostLabels(host: { labels: NodeList | undefined }, targets: Iterable<HTMLElement>): void {
	const labels = Array.from(host.labels ?? []).filter((node) => node instanceof HTMLLabelElement);
	if (labels.length === 0) {
		return;
	}
	const ids = labels.map((label) => {
		if (!label.id) {
			label.id = uniqueId('rui-host-label');
		}
		return label.id;
	});
	for (const target of targets) {
		const named = new Set((target.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean));
		for (const id of ids) {
			named.add(id);
		}
		target.setAttribute('aria-labelledby', [...named].join(' '));
	}
}
