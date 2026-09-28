import type { Meta, StoryObj } from '@ecopages/storybook-radiant-vite';
import { expect } from 'storybook/test';
import { RuiAvatar } from '../avatar/avatar';
import { RuiButton } from '../button/button';
import { RuiButtonGroup } from '../button-group/button-group';
import { RuiChip } from '../chip/chip';
import { RuiChipList, RuiChipListItem } from '../chip-list/chip-list';
import { RuiHeadline } from '../headline/headline';
import {
	RuiFeed,
	RuiFeedArticle,
	RuiFeedArticleActions,
	RuiFeedArticleContent,
	RuiFeedArticleHeader,
	RuiFeedByline,
	RuiFeedBylineBody,
	RuiFeedMeta,
} from './feed';

const meta = {
	title: 'Components/Feed',
	component: RuiFeed,
	parameters: { radiant: { cssImports: ['./feed.css'] } },
} satisfies Meta<typeof RuiFeed>;

export default meta;
type Story = StoryObj<typeof meta>;

function stars(rating: number): string {
	return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

const restaurants = [
	{
		id: 1,
		name: "Tito's Tacos",
		rating: 5,
		price: '$$',
		types: ['Mexican', 'Tacos'],
		street: '123 Blueberry Ln',
		citystate: 'San Dimas, CA',
		phone: '(111) 111-1111',
		blurb: 'Crisp shells, slow-cooked carnitas, and a salsa bar that keeps the line honest on Friday nights.',
	},
	{
		id: 2,
		name: 'Sakura Sushi',
		rating: 4,
		price: '$$$',
		types: ['Japanese', 'Sushi'],
		street: '88 Orchard Ave',
		citystate: 'Pomona, CA',
		phone: '(111) 111-1111',
		blurb: 'Quiet omakase counter with precise knife work. Sit at the bar if you want the chef’s cut of the night.',
	},
	{
		id: 3,
		name: 'Prime Steakhouse',
		rating: 4,
		price: '$$$$',
		types: ['Steakhouse', 'American'],
		street: '410 Claremont Blvd',
		citystate: 'Claremont, CA',
		phone: '(111) 111-1111',
		blurb: 'Low light, dry-aged ribeye, and a wine list that rewards asking the sommelier for the oddball bottle.',
	},
] as const;

export const Default: Story = {
	render: () => (
		<div class="mx-auto max-w-xl">
			<RuiFeed label="Timeline">
				<RuiFeedArticle posinset={1} setsize={2} labelledBy="post-1" describedBy="post-1-body">
					<RuiFeedArticleHeader>
						<RuiFeedByline>
							<RuiAvatar alt="Andee" size="md" />
							<RuiFeedBylineBody>
								<RuiHeadline as="h3" size="sm" id="post-1">
									Hello radiant-ui
								</RuiHeadline>
								<RuiFeedMeta>
									<span>Andee</span>
									<span class="rui-feed__meta-sep" aria-hidden="true">
										·
									</span>
									<span>2h ago</span>
								</RuiFeedMeta>
							</RuiFeedBylineBody>
						</RuiFeedByline>
					</RuiFeedArticleHeader>
					<RuiFeedArticleContent id="post-1-body">
						<p class="m-0">
							First post in the feed — compound articles with bylines, body copy, and a quiet action row.
						</p>
					</RuiFeedArticleContent>
					<RuiFeedArticleActions>
						<RuiButtonGroup aria-label="Post actions">
							<RuiButton size="sm" variant="ghost">
								Reply
							</RuiButton>
							<RuiButton size="sm" variant="ghost">
								Share
							</RuiButton>
						</RuiButtonGroup>
					</RuiFeedArticleActions>
				</RuiFeedArticle>
				<RuiFeedArticle posinset={2} setsize={2} labelledBy="post-2" describedBy="post-2-body">
					<RuiFeedArticleHeader>
						<RuiFeedByline>
							<RuiAvatar alt="Radiant" fallback="RU" size="md" />
							<RuiFeedBylineBody>
								<RuiHeadline as="h3" size="sm" id="post-2">
									APG patterns
								</RuiHeadline>
								<RuiFeedMeta>
									<span>Radiant</span>
									<span class="rui-feed__meta-sep" aria-hidden="true">
										·
									</span>
									<span>Yesterday</span>
								</RuiFeedMeta>
							</RuiFeedBylineBody>
						</RuiFeedByline>
						<RuiChipList aria-label="Topics">
							<RuiChipListItem>
								<RuiChip variant="primary">A11y</RuiChip>
							</RuiChipListItem>
							<RuiChipListItem>
								<RuiChip>Feed</RuiChip>
							</RuiChipListItem>
						</RuiChipList>
					</RuiFeedArticleHeader>
					<RuiFeedArticleContent id="post-2-body">
						<p class="m-0">
							Building accessible widgets as presentational shells — landmarks and labelling stay in the
							markup you author.
						</p>
					</RuiFeedArticleContent>
					<RuiFeedArticleActions>
						<RuiButtonGroup aria-label="Post actions">
							<RuiButton size="sm" variant="ghost">
								Reply
							</RuiButton>
							<RuiButton size="sm" variant="outline">
								Bookmark
							</RuiButton>
						</RuiButtonGroup>
					</RuiFeedArticleActions>
				</RuiFeedArticle>
			</RuiFeed>
		</div>
	),
	play: async ({ canvasElement, step }) => {
		await step('exposes role=feed with articles', async () => {
			await expect(canvasElement.querySelector('[role="feed"]')).toBeInTheDocument();
			await expect(canvasElement.querySelectorAll('article')).toHaveLength(2);
			await expect(canvasElement.querySelector('article[aria-posinset="1"]')).toBeInTheDocument();
		});
	},
};

/**
 * Static recreation of the APG restaurant feed structure (no infinite scroll).
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/feed/examples/feed/
 */
export const ApgRestaurantReviews: Story = {
	render: () => (
		<div class="mx-auto flex max-w-2xl flex-col gap-8">
			<RuiFeed aria-labelledby="feed-heading">
				{restaurants.map((restaurant, index) => {
					const nameId = `restaurant-name-${restaurant.id}`;
					const ratingId = `restaurant-rating-${restaurant.id}`;
					const typeId = `restaurant-type-${restaurant.id}`;
					const locationId = `restaurant-location-${restaurant.id}`;
					const blurbId = `restaurant-blurb-${restaurant.id}`;

					return (
						<RuiFeedArticle
							posinset={index + 1}
							setsize={restaurants.length}
							labelledBy={nameId}
							describedBy={`${ratingId} ${typeId} ${blurbId} ${locationId}`}
						>
							<RuiFeedArticleHeader>
								<RuiFeedByline>
									<RuiAvatar alt={restaurant.name} size="lg" />
									<RuiFeedBylineBody>
										<RuiHeadline as="h3" size="sm" id={nameId}>
											{restaurant.name}
										</RuiHeadline>
										<RuiFeedMeta id={ratingId}>
											<span class="rui-feed__rating">
												<span class="rui-feed__rating-stars" aria-hidden="true">
													{stars(restaurant.rating)}
												</span>
												<span class="sr-only">{`${restaurant.rating} out of 5 stars`}</span>
												<span aria-hidden="true">{restaurant.rating}.0</span>
											</span>
											<span class="rui-feed__meta-sep" aria-hidden="true">
												·
											</span>
											<span>{restaurant.price}</span>
											<span class="rui-feed__meta-sep" aria-hidden="true">
												·
											</span>
											<span>{restaurant.citystate.split(',')[0]}</span>
										</RuiFeedMeta>
										<RuiChipList id={typeId} aria-label="Cuisine">
											{restaurant.types.map((type) => (
												<RuiChipListItem>
													<RuiChip>{type}</RuiChip>
												</RuiChipListItem>
											))}
										</RuiChipList>
									</RuiFeedBylineBody>
								</RuiFeedByline>
							</RuiFeedArticleHeader>
							<RuiFeedArticleContent>
								<p class="m-0 text-on-background" id={blurbId}>
									{restaurant.blurb}
								</p>
								<div class="rui-feed__location" id={locationId}>
									<p class="m-0">{restaurant.street}</p>
									<p class="m-0">{restaurant.citystate}</p>
									<p class="m-0">{restaurant.phone}</p>
								</div>
							</RuiFeedArticleContent>
							<RuiFeedArticleActions>
								<RuiButtonGroup aria-label={`Actions for ${restaurant.name}`}>
									<RuiButton size="sm">Bookmark</RuiButton>
									<RuiButton size="sm" variant="outline">
										Directions
									</RuiButton>
									<RuiButton size="sm" variant="ghost">
										Share
									</RuiButton>
								</RuiButtonGroup>
							</RuiFeedArticleActions>
						</RuiFeedArticle>
					);
				})}
			</RuiFeed>
		</div>
	),
};
