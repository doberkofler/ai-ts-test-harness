export const html05ResponsiveImageSet = (): string => {
	return `
		<figure class="product-image">
			<picture>
				<source
					type="image/webp"
					srcset="/images/product-400.webp 400w, /images/product-800.webp 800w, /images/product-1200.webp 1200w"
					sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 600px"
				/>
				<img
					src="/images/product-800.jpg"
					srcset="/images/product-400.jpg 400w, /images/product-800.jpg 800w, /images/product-1200.jpg 1200w"
					sizes="(max-width: 600px) 100vw, (max-width: 1024px) 50vw, 600px"
					alt="Matte black stainless steel travel mug with leak-proof lid"
					loading="lazy"
					decoding="async"
					width="1200"
					height="900"
				/>
			</picture>
			<figcaption>Travel mug available in 400ml and 600ml variants.</figcaption>
		</figure>
	`;
};
