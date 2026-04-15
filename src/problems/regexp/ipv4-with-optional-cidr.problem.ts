import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'ipv4-with-optional-cidr',
	description: ['Return a RegExp that matches IPv4 addresses with optional CIDR suffix.', 'Each octet must be 0-255 and must not contain leading zeros.'],
	signature: 'function ipv4WithOptionalCidr(): RegExp',
	solution: function ipv4WithOptionalCidr(): RegExp {
		const octet = String.raw`(?:0|[1-9]\d?|1\d\d|2[0-4]\d|25[0-5])`;
		const cidr = String.raw`(?:/(?:\d|[12]\d|3[0-2]))?`;
		return new RegExp(`^${octet}(?:\\.${octet}){3}${cidr}$`);
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		assert.strictEqual(regexp.test('192.168.1.1'), true);
		assert.strictEqual(regexp.test('0.0.0.0'), true);
		assert.strictEqual(regexp.test('255.255.255.255'), true);
		assert.strictEqual(regexp.test('10.0.0.0/8'), true);
		assert.strictEqual(regexp.test('172.16.0.0/12'), true);
		assert.strictEqual(regexp.test('256.0.0.1'), false);
		assert.strictEqual(regexp.test('192.168.1'), false);
		assert.strictEqual(regexp.test('192.168.1.1/33'), false);
		assert.strictEqual(regexp.test('192.168.1.1/'), false);
		assert.strictEqual(regexp.test('01.0.0.1'), false);
	},
});
