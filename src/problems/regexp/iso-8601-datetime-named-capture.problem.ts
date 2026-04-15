import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'iso-8601-datetime-named-capture',
	description: ['Return a RegExp with named capture groups for ISO 8601 datetime fields.', 'Capture year, month, day, hour, minute, second, and offset.'],
	signature: 'function iso8601DatetimeNamedCapture(): RegExp',
	solution: function iso8601DatetimeNamedCapture(): RegExp {
		return /^(?<year>\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\d|3[01])T(?<hour>[01]\d|2[0-3]):(?<minute>[0-5]\d):(?<second>[0-5]\d)(?<offset>Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
	},
	tests: ({assert, implementation}) => {
		const regexp = implementation();
		assert.ok(regexp instanceof RegExp);
		if (!(regexp instanceof RegExp)) {
			return;
		}

		const m1 = '2024-03-15T14:30:00+02:00'.match(regexp);
		assert.ok(m1 !== null);
		if (m1 === null) {
			return;
		}
		assert.ok(typeof m1.groups !== 'undefined');
		if (typeof m1.groups === 'undefined') {
			return;
		}
		assert.strictEqual(m1.groups['year'], '2024');
		assert.strictEqual(m1.groups['month'], '03');
		assert.strictEqual(m1.groups['day'], '15');
		assert.strictEqual(m1.groups['hour'], '14');
		assert.strictEqual(m1.groups['minute'], '30');
		assert.strictEqual(m1.groups['second'], '00');
		assert.strictEqual(m1.groups['offset'], '+02:00');

		const m2 = '2024-03-15T14:30:00Z'.match(regexp);
		assert.ok(m2 !== null);
		if (m2 === null) {
			return;
		}
		assert.ok(typeof m2.groups !== 'undefined');
		if (typeof m2.groups === 'undefined') {
			return;
		}
		assert.strictEqual(m2.groups['offset'], 'Z');
	},
});
