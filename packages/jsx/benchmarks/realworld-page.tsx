/** @jsxImportSource ../src */

import type { JsxRenderable } from '../src/jsx-runtime.ts';

type Purchase = {
	name: string;
	price: number;
	quantity: number;
};

type RealWorldPageProps = {
	name: string;
	purchases: Purchase[];
};

function Layout({ children, head }: { children: JsxRenderable; head: JsxRenderable }) {
	return (
		<html lang="en">
			{head}
			<body>{children}</body>
		</html>
	);
}

function Head({ title }: { title: string }) {
	return (
		<head>
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<title>{title}</title>
			<meta name="description" content="A description" />
			<meta name="keywords" content="some, keywords" />
			<meta name="author" content="Some Author" />
			<meta name="twitter:card" content="summary" />
			<meta name="twitter:site" content="@site" />
			<meta name="twitter:title" content="Title" />
			<meta name="twitter:description" content="A description" />
			<meta name="twitter:creator" content="@creator" />
			<meta name="twitter:image" content="image.jpg" />
			<meta content="Title" />
			<meta content="website" />
			<link rel="stylesheet" href="styles.css" />
			<script src="script.js"></script>
			<script src="https://cdn.jsdelivr.net/npm/axios-cache-interceptor@1/dev/index.bundle.js"></script>
			<script src="https://cdn.jsdelivr.net/npm/axios-cache-interceptor@1/dist/index.bundle.js"></script>
		</head>
	);
}

function PurchaseCard({ name, price, quantity }: Purchase) {
	return (
		<div class="purchase purchase-card">
			<div class="purchase-name">{name}</div>
			<div class="purchase-price">{price}</div>
			<div class="purchase-quantity">{quantity}</div>
		</div>
	);
}

function Header({ name }: { name: string }) {
	return (
		<header class="header">
			<h1 class="header-title">Hello {name}</h1>
			<nav class="header-nav">
				<ul class="header-ul">
					<li class="header-item">
						<a href="/">Home</a>
					</li>
					<li>
						<a href="/about">About</a>
					</li>
				</ul>
			</nav>
		</header>
	);
}

function Footer({ name }: { name: string }) {
	return (
		<footer class="footer">
			<p class="footer-year">© {name}</p>
			<p class="footer">
				<a href="/terms">Terms</a>
				<a href="/privacy">Privacy</a>
			</p>
		</footer>
	);
}

function Main({ children, name }: { children: JsxRenderable; name: string }) {
	return (
		<div>
			<Header name={name} />
			<main class="main-content">{children}</main>
			<Footer name={name} />
		</div>
	);
}

function UserProfile({ name }: { name: string }) {
	return (
		<section class="user-profile">
			<h2 class="user-profile title">User Profile</h2>
			<p class="user-profile name">Name: {name}</p>
			<p class="user-profile info">Email: example@example.com</p>
			<p class="user-profile info">Address: 123 Main St, City, Country</p>
			<p class="user-profile info">Phone: 123-456-7890</p>
		</section>
	);
}

function Sidebar({ purchases }: { purchases: Purchase[] }) {
	return (
		<aside class="sidebar">
			<h2 class="purchase title">Recent Purchases</h2>
			<ul class="purchase list">
				{purchases.slice(0, 3).map((purchase) => (
					<li class="purchase-preview">
						{purchase.name} - ${purchase.price.toFixed(2)}
					</li>
				))}
			</ul>
		</aside>
	);
}

function PageContent() {
	return (
		<div class="page-content">
			<h2 class="title mb-4 h2">Welcome to our store</h2>
			<p class="p text mb-0">
				Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla venenatis magna id dolor ultricies, eget
				pretium ligula sodales. Cras sit amet turpis nec lacus blandit placerat. Sed vestibulum est sit amet
				enim ultrices rutrum. Vivamus in nulla vel nunc interdum vehicula.
			</p>
			<p class="p text mb-0">
				Pellentesque efficitur tellus id velit vehicula laoreet. Proin et neque ac dolor hendrerit elementum.
				Fusce auctor metus non ligula tincidunt, id gravida odio sollicitudin.
			</p>
		</div>
	);
}

export function RealWorldPage({ name, purchases }: RealWorldPageProps) {
	return (
		<Layout head={<Head title="Real World Example" />}>
			<Main name={name}>
				<h2>Purchases</h2>
				<div class="purchases">
					{purchases.map((purchase) => (
						<PurchaseCard name={purchase.name} price={purchase.price} quantity={purchase.quantity} />
					))}
				</div>
				<UserProfile name={name} />
				<Sidebar purchases={purchases} />
				<PageContent />
			</Main>
		</Layout>
	);
}

export function createBenchmarkProps(purchaseCount = 1_000): RealWorldPageProps {
	const purchases = Array.from({ length: purchaseCount }, (_, index) => ({
		name: `Purchase number ${index + 1}`,
		price: index,
		quantity: index,
	}));

	return {
		name: 'Sample',
		purchases,
	};
}
