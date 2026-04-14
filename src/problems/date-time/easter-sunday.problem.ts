import {defineImplementProblem} from '#problem-api';

export default defineImplementProblem({
	name: 'easter-sunday',
	description: 'Return the month (1-12) and day of Easter Sunday for a given year using the Anonymous Gregorian algorithm.',
	signature: 'function easterSunday(year: number): {month: number; day: number}',
	solution: function easterSunday(year: number): {month: number; day: number} {
		const a = year % 19;
		const b = Math.floor(year / 100);
		const c = year % 100;
		const d = Math.floor(b / 4);
		const e = b % 4;
		const f = Math.floor((b + 8) / 25);
		const g = Math.floor((b - f + 1) / 3);
		const h = (19 * a + b - d - g + 15) % 30;
		const i = Math.floor(c / 4);
		const k = c % 4;
		const l = (32 + 2 * e + 2 * i - h - k) % 7;
		const m = Math.floor((a + 11 * h + 22 * l) / 451);
		const month = Math.floor((h + l - 7 * m + 114) / 31);
		const day = ((h + l - 7 * m + 114) % 31) + 1;
		return {month, day};
	},
	tests: ({assert, implementation}) => {
		assert.deepStrictEqual(implementation(2024), {month: 3, day: 31});
		assert.deepStrictEqual(implementation(2025), {month: 4, day: 20});
		assert.deepStrictEqual(implementation(2023), {month: 4, day: 9});
		assert.deepStrictEqual(implementation(2000), {month: 4, day: 23});
		assert.deepStrictEqual(implementation(1999), {month: 4, day: 4});
		assert.deepStrictEqual(implementation(1954), {month: 4, day: 18});
	},
});
