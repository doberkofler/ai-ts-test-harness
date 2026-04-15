import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'url-parse-named-groups',
	description: [
		'Return a RegExp with named capture groups for URL parsing.',
		'Capture protocol, host, optional port, optional path, optional query, and optional fragment.',
	],
	signature: 'function urlParseNamedGroups(): RegExp',
	solution: function urlParseNamedGroups(): RegExp {
		return /^(?<protocol>https?|ftp):\/\/(?<host>[A-Za-z0-9.-]+)(?::(?<port>\d+))?(?<path>\/[\w./-]*)?(?:\?(?<query>[^#\s]*))?(?:#(?<fragment>\S*))?$/;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		const u1 = 'https://example.com:8080/path/to/page?foo=bar&baz=1#section'.match(regexp);
		assert.ok(u1 !== null);
		if (u1 === null) {
			return;
		}
		assert.ok(typeof u1.groups !== 'undefined');
		if (typeof u1.groups === 'undefined') {
			return;
		}
		assert.strictEqual(u1.groups['protocol'], 'https');
		assert.strictEqual(u1.groups['host'], 'example.com');
		assert.strictEqual(u1.groups['port'], '8080');
		assert.strictEqual(u1.groups['path'], '/path/to/page');
		assert.strictEqual(u1.groups['query'], 'foo=bar&baz=1');
		assert.strictEqual(u1.groups['fragment'], 'section');

		const u2 = 'http://localhost/api'.match(regexp);
		assert.ok(u2 !== null);
		if (u2 === null) {
			return;
		}
		assert.ok(typeof u2.groups !== 'undefined');
		if (typeof u2.groups === 'undefined') {
			return;
		}
		assert.strictEqual(u2.groups['host'], 'localhost');
		assert.ok(typeof u2.groups['port'] === 'undefined' || u2.groups['port'] === '');
		assert.strictEqual(u2.groups['path'], '/api');
	},
});
