export const html09SemanticPageSkeleton = (): string => {
	return `
		<!DOCTYPE html>
		<html lang="en">
			<head>
				<meta charset="UTF-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				<title>Semantic Page Skeleton</title>
			</head>
			<body>
				<a href="#main-content" class="skip-link">Skip to main content</a>
				<header>
					<a href="/" class="site-logo">Orbit Journal</a>
					<nav aria-label="Primary navigation">
						<ul>
							<li><a href="/stories">Stories</a></li>
							<li><a href="/topics">Topics</a></li>
							<li><a href="/about">About</a></li>
						</ul>
					</nav>
				</header>

				<main id="main-content">
					<article>
						<h1>How semantic landmarks improve navigation</h1>
						<h2>Why landmarks matter</h2>
						<p>Landmarks help assistive technologies jump between major areas quickly.</p>
						<h3>Practical rollout plan</h3>
						<p>Start by replacing generic wrappers with meaningful sectioning elements.</p>
					</article>
					<aside>
						<h2>Related resources</h2>
						<ul>
							<li><a href="/guide/aria-basics">ARIA basics</a></li>
							<li><a href="/guide/html-audit">Semantic audit checklist</a></li>
						</ul>
					</aside>
				</main>

				<footer>
					<nav aria-label="Secondary navigation">
						<ul>
							<li><a href="/privacy">Privacy</a></li>
							<li><a href="/terms">Terms</a></li>
							<li><a href="/contact">Contact</a></li>
						</ul>
					</nav>
					<p>&copy; 2026 Orbit Journal</p>
				</footer>
			</body>
		</html>
	`;
};
