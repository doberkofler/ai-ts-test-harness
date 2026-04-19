export const html08VideoPlayerWithTrack = (): string => {
	return `
		<figure class="lesson-video">
			<video controls preload="metadata" poster="/media/intro-poster.jpg" aria-label="Introduction to semantic HTML video lesson">
				<source src="/media/intro.webm" type="video/webm" />
				<source src="/media/intro.mp4" type="video/mp4" />
				<track kind="subtitles" srclang="en" label="English" src="/media/intro.en.vtt" default />
				<track kind="captions" srclang="en" label="English CC" src="/media/intro.en.cc.vtt" />
			</video>
			<figcaption>Watch the course introduction with subtitles or closed captions.</figcaption>
		</figure>
	`;
};
