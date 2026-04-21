import {describe, expect, it} from 'vitest';
import {html08VideoPlayerWithTrack} from './solution.ts';

describe('video-player-with-track', () => {
	it('returns a video element with required sources and tracks', () => {
		const html = html08VideoPlayerWithTrack();

		expect(html).toMatch(/<video[^>]*controls[^>]*>/i);
		expect(html).toMatch(/<video[^>]*preload="metadata"[^>]*>/i);
		expect(html).toMatch(/<video[^>]*aria-label="[^"]+"[^>]*>/i);
		expect(html).toMatch(/<video[^>]*poster="[^"]+"[^>]*>/i);
		expect(html).toMatch(/<source[^>]*type="video\/mp4"[^>]*>/i);
		expect(html).toMatch(/<source[^>]*type="video\/webm"[^>]*>/i);
		expect(html).toMatch(/<track[^>]*kind="subtitles"[^>]*srclang="en"[^>]*label="[^"]+"[^>]*default[^>]*>/i);
		expect(html).toMatch(/<track[^>]*kind="captions"[^>]*srclang="en"[^>]*label="[^"]+"[^>]*>/i);
	});
});
