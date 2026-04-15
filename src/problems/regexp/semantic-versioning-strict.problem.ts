import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'semantic-versioning-strict',
	description: [
		'Return a RegExp that matches strict Semantic Versioning 2.0.0 strings.',
		'Allow optional prerelease and build metadata sections.',
		'Reject invalid numeric components and malformed suffixes.',
	],
	signature: 'function semanticVersioningStrict(): RegExp',
	solution: function semanticVersioningStrict(): RegExp {
		return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|[a-z-][0-9a-z-]*)(?:\.(?:0|[1-9]\d*|[a-z-][0-9a-z-]*))*)?(?:\+[0-9a-z-]+(?:\.[0-9a-z-]+)*)?$/i;
	},
	tests: ({assert, implementation}) => {
		const semver = implementation();
		assert.ok(semver instanceof RegExp);
		if (!(semver instanceof RegExp)) {
			return;
		}
		assert.strictEqual(semver.test('1.0.0'), true);
		assert.strictEqual(semver.test('0.1.0-alpha.1'), true);
		assert.strictEqual(semver.test('1.0.0+build.123'), true);
		assert.strictEqual(semver.test('1.0.0-rc.1+sha.abc123'), true);
		assert.strictEqual(semver.test('10.20.30'), true);
		assert.strictEqual(semver.test('01.0.0'), false);
		assert.strictEqual(semver.test('1.0'), false);
		assert.strictEqual(semver.test('1.0.0-'), false);
		assert.strictEqual(semver.test('1.0.0+'), false);
		assert.strictEqual(semver.test(''), false);
	},
});
