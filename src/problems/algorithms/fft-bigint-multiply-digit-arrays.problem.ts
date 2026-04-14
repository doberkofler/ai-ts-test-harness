import {defineImplementProblem} from '#problem-api';

type Complex = {re: number; im: number};

export default defineImplementProblem({
	name: 'fft-bigint-multiply-digit-arrays',
	description: [
		'Multiply two non-negative integers represented as base-10 digit arrays using FFT-style convolution.',
		'Input digits are big-endian (e.g. [1,2,3] means 123). Return digits in big-endian form.',
	],
	signature: 'function fftBigintMultiplyDigitArrays(a: number[], b: number[]): number[]',
	solution: function fftBigintMultiplyDigitArrays(a: number[], b: number[]): number[] {
		if (a.length === 0 || b.length === 0) {
			return [0];
		}

		const trimLeading = (digits: number[]): number[] => {
			let index = 0;
			while (index < digits.length - 1 && digits[index] === 0) {
				index++;
			}
			return digits.slice(index);
		};

		const toLittleEndian = (digits: number[]): number[] => [...digits].toReversed();

		const nextPow2 = (n: number): number => {
			let p = 1;
			while (p < n) {
				p <<= 1;
			}
			return p;
		};

		const fft = (input: Complex[], invert: boolean): Complex[] => {
			const n = input.length;
			const output = input.map((value) => ({...value}));
			const at = (index: number): Complex => {
				const value = output[index];
				if (!value) {
					throw new TypeError(`missing complex value at index ${index}`);
				}
				return value;
			};

			for (let i = 1, j = 0; i < n; i++) {
				let bit = n >> 1;
				while ((j & bit) !== 0) {
					j ^= bit;
					bit >>= 1;
				}
				j ^= bit;
				if (i < j) {
					const left = at(i);
					const right = at(j);
					output[i] = right;
					output[j] = left;
				}
			}

			for (let len = 2; len <= n; len <<= 1) {
				const angle = ((2 * Math.PI) / len) * (invert ? -1 : 1);
				const wLen: Complex = {re: Math.cos(angle), im: Math.sin(angle)};

				for (let i = 0; i < n; i += len) {
					let w: Complex = {re: 1, im: 0};
					for (let j = 0; j < len / 2; j++) {
						const u = at(i + j);
						const vSource = at(i + j + len / 2);
						const v: Complex = {
							re: vSource.re * w.re - vSource.im * w.im,
							im: vSource.re * w.im + vSource.im * w.re,
						};

						output[i + j] = {re: u.re + v.re, im: u.im + v.im};
						output[i + j + len / 2] = {re: u.re - v.re, im: u.im - v.im};

						w = {
							re: w.re * wLen.re - w.im * wLen.im,
							im: w.re * wLen.im + w.im * wLen.re,
						};
					}
				}
			}

			if (invert) {
				for (const value of output) {
					value.re /= n;
					value.im /= n;
				}
			}

			return output;
		};

		const left = toLittleEndian(trimLeading(a));
		const right = toLittleEndian(trimLeading(b));
		if (left.length === 1 && left[0] === 0) {
			return [0];
		}
		if (right.length === 1 && right[0] === 0) {
			return [0];
		}

		const n = nextPow2(left.length + right.length);
		const fa: Complex[] = Array.from({length: n}, (_value, index) => ({re: left[index] ?? 0, im: 0}));
		const fb: Complex[] = Array.from({length: n}, (_value, index) => ({re: right[index] ?? 0, im: 0}));

		const fftA = fft(fa, false);
		const fftB = fft(fb, false);
		const multiplied: Complex[] = fftA.map((value, index) => {
			const rightValue = fftB[index];
			if (!rightValue) {
				return {re: 0, im: 0};
			}

			return {
				re: value.re * rightValue.re - value.im * rightValue.im,
				im: value.re * rightValue.im + value.im * rightValue.re,
			};
		});

		const convolved = fft(multiplied, true);
		const result: number[] = Array.from({length: n}, () => 0);

		let carry = 0;
		for (let i = 0; i < n; i++) {
			const convolvedValue = convolved[i];
			const real = convolvedValue ? convolvedValue.re : 0;
			const digit = Math.round(real + carry);
			result[i] = digit % 10;
			carry = Math.floor(digit / 10);
		}

		while (carry > 0) {
			result.push(carry % 10);
			carry = Math.floor(carry / 10);
		}

		while (result.length > 1 && result.at(-1) === 0) {
			result.pop();
		}

		return result.toReversed();
	},
	tests: ({assert, implementation}) => {
		const toBigInt = (digits: number[]): bigint => BigInt(digits.join(''));
		const asDigits = (value: unknown): number[] => {
			if (!Array.isArray(value)) {
				throw new TypeError('fftBigintMultiplyDigitArrays must return number[] digits');
			}

			const digits: number[] = [];
			for (const digit of value as unknown[]) {
				if (typeof digit !== 'number' || !Number.isInteger(digit)) {
					throw new TypeError('fftBigintMultiplyDigitArrays must return number[] digits');
				}
				digits.push(digit);
			}

			return digits;
		};

		assert.deepStrictEqual(implementation([1, 2, 3], [4, 5, 6]), [5, 6, 0, 8, 8]);
		assert.deepStrictEqual(implementation([0], [9, 9, 9]), [0]);

		const left = [9, 8, 7, 6, 5, 4, 3, 2, 1];
		const right = [1, 2, 3, 4, 5, 6, 7, 8, 9];
		const productDigits = asDigits(implementation(left, right));
		assert.strictEqual(toBigInt(productDigits), toBigInt(left) * toBigInt(right));
	},
});
