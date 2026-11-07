import { beforeEach, describe, expect, test } from 'vitest';
import { createRoot } from '../src/index.ts';

describe('nested templates mounted from one tree', () => {
	beforeEach(() => {
		document.body.innerHTML = '';
	});

	test('a nested child that changes shape is replaced alone; its siblings and parent keep their nodes', () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		const row = (editing: boolean) => (
			<tr>
				<td class="id">1</td>
				<td class="cell">{editing ? <input value="a" /> : <span>a</span>}</td>
			</tr>
		);

		root.render(row(false));
		const tr = container.querySelector('tr');
		const idCell = container.querySelector('.id');
		expect(container.querySelector('.cell')?.innerHTML).toBe('<span>a</span>');

		root.render(row(true));

		expect(container.querySelector('tr')).toBe(tr);
		expect(container.querySelector('.id')).toBe(idCell);
		expect(container.querySelector('.cell input')).not.toBeNull();
		expect(container.querySelector('.cell span')).toBeNull();
	});

	test('different templates with the same nested shapes, mounted in the same place, never share a tree', () => {
		const container = document.createElement('div');
		const root = createRoot(container);

		root.render([
			<p key="p">
				<b>one</b>
			</p>,
			<section key="section">
				<b>two</b>
			</section>,
			<p key="p2">
				<i>three</i>
			</p>,
		]);

		expect(container.innerHTML.replace(/<!---->/g, '')).toBe(
			'<p><b>one</b></p><section><b>two</b></section><p><i>three</i></p>',
		);
	});

	test('every mount clones its own nodes and binds its own values', () => {
		const container = document.createElement('div');
		const root = createRoot(container);
		const rows = (labels: string[]) => (
			<table>
				<tbody>
					{labels.map((label) => (
						<tr key={label}>
							<td>
								<a class="lbl">{label}</a>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		);

		root.render(rows(['a', 'b', 'c']));
		const links = Array.from(container.querySelectorAll('.lbl'));
		expect(links.map((link) => link.textContent)).toEqual(['a', 'b', 'c']);
		expect(new Set(links).size).toBe(3);

		root.render(rows(['c', 'a']));
		expect(Array.from(container.querySelectorAll('.lbl'), (link) => link.textContent)).toEqual(['c', 'a']);
		expect(container.querySelectorAll('.lbl')[0]).toBe(links[2]);
	});

	test('elements nested under svg are created in the SVG namespace', () => {
		const container = document.createElement('div');
		const root = createRoot(container);

		root.render(
			<div>
				<svg viewBox="0 0 10 10">{<g>{<circle r="1" />}</g>}</svg>
			</div>,
		);

		const circle = container.querySelector('circle');
		expect(circle?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(container.querySelector('g')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
	});

	test('a template mounted inside svg after an HTML mount of the same shape gets the SVG namespace', () => {
		const html = document.createElement('div');
		const svgHost = document.createElement('div');
		const shape = () => <a href="#x">{<title>t</title>}</a>;

		createRoot(html).render(<div>{shape()}</div>);
		createRoot(svgHost).render(<svg>{shape()}</svg>);

		expect(html.querySelector('a')?.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
		expect(svgHost.querySelector('a')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(svgHost.querySelector('title')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
	});
});
