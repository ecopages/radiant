import { renderToString } from '@ecopages/jsx/server';
import { describe, expect, it } from 'vitest';
import { RuiAlert } from './components/ui/alert/alert';
import { RuiAvatar } from './components/ui/avatar/avatar';
import { RuiCarousel, RuiCarouselNext, RuiCarouselPrev, RuiCarouselRotation } from './components/ui/carousel/carousel';
import { RuiFeed, RuiFeedArticle } from './components/ui/feed/feed';
import { RuiGrid } from './components/ui/grid/grid';
import { RuiSelect, RuiSelectListbox, RuiSelectTrigger } from './components/ui/select/select';
import { RuiSidebarMenuButton } from './components/ui/sidebar/sidebar';
import { RuiTab, RuiTabList, RuiTabPanel, RuiTabPanels, RuiTabs } from './components/ui/tabs/tabs';

describe('host defaulting', () => {
	it('keeps consumer feed aria over label aliases', () => {
		const html = renderToString(
			<RuiFeed label="Fallback name" aria-label="Direct name" aria-labelledby="feed-heading">
				<RuiFeedArticle
					labelledBy="alias-title"
					describedBy="alias-summary"
					aria-labelledby="direct-title"
					aria-describedby="direct-summary"
					posinset={2}
					aria-posinset={3}
				>
					Article
				</RuiFeedArticle>
			</RuiFeed>,
		);

		expect(html).toContain('aria-label="Direct name"');
		expect(html).not.toContain('Fallback name');
		expect(html).toContain('aria-labelledby="feed-heading"');
		expect(html).toContain('aria-labelledby="direct-title"');
		expect(html).not.toContain('alias-title');
		expect(html).toContain('aria-describedby="direct-summary"');
		expect(html).not.toContain('alias-summary');
		expect(html).toContain('aria-posinset="3"');
		expect(html).not.toContain('aria-posinset="2"');
	});

	it('uses the feed label only when aria-label is omitted', () => {
		const html = renderToString(<RuiFeed label="Feed name">Articles</RuiFeed>);

		expect(html).toContain('aria-label="Feed name"');
	});

	it('keeps consumer avatar role and label when an image is present', () => {
		const html = renderToString(
			<RuiAvatar src="/ada.png" alt="Ada" role="presentation" aria-label="Photo of Ada" />,
		);

		expect(html).toContain('role="presentation"');
		expect(html).toContain('aria-label="Photo of Ada"');
		expect(html).not.toContain('role="img"');
	});

	it('does not write an undefined role onto an image avatar', () => {
		const html = renderToString(<RuiAvatar src="/ada.png" alt="Ada" />);

		expect(html).not.toContain('role=');
		expect(html).not.toContain('aria-label=');
	});

	it('defaults image-less avatars to role="img"', () => {
		const html = renderToString(<RuiAvatar alt="Ada Lovelace" />);

		expect(html).toContain('role="img"');
		expect(html).toContain('aria-label="Ada Lovelace"');
	});

	it('keeps consumer sidebar title and aria-current when inactive', () => {
		const html = renderToString(
			<RuiSidebarMenuButton tooltip="Inbox" title="Open inbox" aria-current="true">
				Inbox
			</RuiSidebarMenuButton>,
		);

		expect(html).toContain('title="Open inbox"');
		expect(html).not.toContain('title="Inbox"');
		expect(html).toContain('aria-current="true"');
	});

	it('locks aria-current="page" on the active sidebar item', () => {
		const html = renderToString(
			<RuiSidebarMenuButton isActive aria-current="true">
				Inbox
			</RuiSidebarMenuButton>,
		);

		expect(html).toContain('aria-current="page"');
		expect(html).not.toContain('aria-current="true"');
	});

	it('uses tooltip for title when the consumer omits title', () => {
		const html = renderToString(<RuiSidebarMenuButton tooltip="Inbox">Inbox</RuiSidebarMenuButton>);

		expect(html).toContain('title="Inbox"');
	});

	it('keeps consumer carousel labels over defaults', () => {
		const prev = renderToString(<RuiCarouselPrev aria-label="Go back" />);
		const next = renderToString(<RuiCarouselNext aria={{ label: 'Go forward' }} />);
		const rotation = renderToString(<RuiCarouselRotation aria-label={null} />);

		expect(prev).toContain('aria-label="Go back"');
		expect(prev).not.toContain('Previous slide');
		expect(next).toContain('aria-label="Go forward"');
		expect(next).not.toContain('Next slide');
		expect(rotation).not.toContain('Start rotation');
	});
});

describe('class composition and locked invariants', () => {
	it('composes consumer classes with BEM on the alert surface', () => {
		const html = renderToString(
			<RuiAlert class="extra-alert" id="status-alert">
				Status
			</RuiAlert>,
		);

		expect(html).toMatch(/class="[^"]*rui-alert[^"]*extra-alert[^"]*"/);
		expect(html).toMatch(/<div[^>]*role="alert"/);
	});

	it('keeps the select trigger a tabbable combobox surface without binding popup visibility in the view', () => {
		const trigger = renderToString(<RuiSelectTrigger>Value</RuiSelectTrigger>);
		const listbox = renderToString(<RuiSelectListbox hidden={false}>Options</RuiSelectListbox>);

		expect(trigger).toMatch(/<div[^>]*data-select-trigger/);
		expect(trigger).toContain('tabIndex="0"');
		expect(trigger).not.toContain('type="button"');
		expect(listbox).not.toContain(' hidden');
	});

	it('does not serialize view-only options, slides, or rows', () => {
		const select = renderToString(
			<RuiSelect options={[{ value: 'draft', label: 'Draft' }]} placeholder="Choose" />,
		);
		const carousel = renderToString(<RuiCarousel slides={[{ id: 'intro', children: 'Hello' }]} />);
		const grid = renderToString(<RuiGrid rows={[['alpha', 'beta']]} />);

		expect(select).not.toContain('options=');
		expect(carousel).not.toContain('slides=');
		expect(carousel).toContain('data-slide="intro"');
		expect(grid).not.toContain('rows=');
		expect(grid).toContain('rui-grid__cell');
	});
});

describe('tab ARIA linkage', () => {
	it('pairs tab controls with labelled panels', () => {
		const html = renderToString(
			<RuiTabs>
				<RuiTabList aria-label="Package managers">
					<RuiTab id="npm">npm</RuiTab>
				</RuiTabList>
				<RuiTabPanels>
					<RuiTabPanel id="npm">npm command</RuiTabPanel>
				</RuiTabPanels>
			</RuiTabs>,
		);

		expect(html).toContain('id="tab-npm"');
		expect(html).toContain('aria-controls="panel-npm"');
		expect(html).toContain('id="panel-npm"');
		expect(html).toContain('aria-labelledby="tab-npm"');
	});
});
